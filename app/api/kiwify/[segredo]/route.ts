import { after, NextResponse, type NextRequest } from "next/server";
import { enviarEmailDoPlano } from "@/lib/email";
import { assinaturaConfere, lerAviso, produtoConfere, segredoConfere, tokensKiwify, type AvisoKiwify } from "@/lib/kiwify";
import { montarLead, registrarLead, type EventoLead } from "@/lib/leads";
import { referenciaValida } from "@/lib/pedido";
import { buscarPedido, pedidoDaCompra, refDaCompra, registrarCompra, type StatusCompra } from "@/lib/registros";
import { linkDoPlano, urlDoSite } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Webhook da Kiwify: https://SEU-SITE/api/kiwify/<KIWIFY_WEBHOOK_SEGREDO>
 *
 * Recebe compra aprovada, Pix/boleto gerado, compra recusada, reembolso,
 * chargeback e carrinho abandonado. Grava a compra, liga ao pedido do quiz e
 * registra o evento no funil de leads. Responde 200 rápido para a Kiwify não
 * reenviar; o que é lento (e-mail, webhook de leads) roda depois.
 */
export async function POST(requisicao: NextRequest, { params }: { params: Promise<{ segredo: string }> }) {
  const { segredo } = await params;
  if (!segredoConfere(segredo)) {
    return NextResponse.json({ erro: "nao_encontrado" }, { status: 404 });
  }

  const corpoBruto = await requisicao.text();
  const tokens = tokensKiwify();
  if (tokens.length > 0 && !assinaturaConfere(corpoBruto, requisicao.nextUrl.searchParams.get("signature"), tokens)) {
    console.error("[kiwify] aviso recusado: a assinatura não confere com nenhum KIWIFY_TOKEN");
    return NextResponse.json({ erro: "assinatura_invalida" }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(corpoBruto);
  } catch {
    return NextResponse.json({ erro: "json_invalido" }, { status: 400 });
  }

  const aviso = lerAviso(corpo);
  if (!aviso) {
    console.warn("[kiwify] aviso sem e-mail do comprador, ignorado");
    return NextResponse.json({ ok: true, ignorado: "sem_email" });
  }
  // Outros produtos da mesma conta Kiwify: não grava nada de quem não é cliente do Mês Inteiro
  // (inclusive os compradores do Fôlego, que tem o próprio webhook).
  if (!produtoConfere(aviso.produto)) {
    return NextResponse.json({ ok: true, ignorado: "outro_produto" });
  }

  try {
    const resultado = tratarAviso(aviso, urlDoSite(requisicao.nextUrl.origin));
    console.info(`[kiwify] ${aviso.evento} → ${resultado.status ?? aviso.tipo}${resultado.ref ? ` (pedido ${resultado.ref})` : ""}`);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (erro) {
    // 500 faz a Kiwify tentar de novo mais tarde.
    console.error("[kiwify] falha ao gravar o aviso:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erro: "falha_interna" }, { status: 500 });
  }
}

const STATUS: Partial<Record<AvisoKiwify["tipo"], StatusCompra>> = {
  aprovada: "pago",
  pendente: "pendente",
  recusada: "recusado",
  reembolso: "reembolsado",
};

const EVENTO_LEAD: Partial<Record<AvisoKiwify["tipo"], EventoLead>> = {
  aprovada: "compra_aprovada",
  pendente: "pix_gerado",
  recusada: "compra_recusada",
  reembolso: "reembolso",
  abandono: "carrinho_abandonado",
};

function tratarAviso(aviso: AvisoKiwify, site: string): { status?: StatusCompra; ref?: string | null } {
  const contato = { nome: aviso.nome, email: aviso.email, telefone: aviso.telefone };
  const evento = EVENTO_LEAD[aviso.tipo];
  const novoStatus = STATUS[aviso.tipo];

  if (!novoStatus || !aviso.orderId) {
    // Carrinho abandonado (não tem pedido na Kiwify) ou evento que não usamos.
    if (evento) {
      const lead = montarLead({
        evento,
        contato,
        origem: aviso.origem,
        ...(aviso.linkCheckout && { pedido: { ref: aviso.ref ?? "", linkPagamento: aviso.linkCheckout } }),
      });
      after(() => registrarLead(lead));
    }
    return {};
  }

  const refSugerida = referenciaValida(aviso.ref) ? aviso.ref : null;
  const ref = refDaCompra(aviso.orderId) ?? pedidoDaCompra(aviso.email, refSugerida);
  const { anterior, status } = registrarCompra({
    orderId: aviso.orderId,
    ref,
    email: aviso.email,
    nome: aviso.nome,
    status: novoStatus,
    metodo: aviso.metodo,
    valorCentavos: aviso.valorCentavos,
    produto: aviso.produto,
  });

  const pedido = ref ? buscarPedido(ref) : null;
  const linkPlano = ref ? linkDoPlano(site, ref) : undefined;
  if (evento) {
    const lead = montarLead({
      evento,
      // O contato do quiz é mais completo (tem o WhatsApp); o da Kiwify completa o resto.
      contato: { ...contato, ...(pedido?.contato ?? {}), email: pedido?.contato?.email ?? aviso.email },
      origem: Object.keys(pedido?.origem ?? {}).length > 0 ? pedido!.origem : aviso.origem,
      ...(ref && { pedido: { ref, linkPlano, ...(pedido && { linkPagamento: pedido.urlPagamento }) } }),
    });
    after(() => registrarLead(lead));
  }

  // A Kiwify pode repetir o aviso: o e-mail sai só na primeira aprovação.
  const acabouDePagar = status === "pago" && anterior !== "pago";
  if (acabouDePagar && linkPlano) {
    const nome = pedido?.respostas.nome || aviso.nome;
    after(() => enviarEmailDoPlano(aviso.email, nome, [linkPlano]));
  } else if (acabouDePagar && !ref) {
    console.warn(`[kiwify] compra ${aviso.orderId} aprovada sem pedido do quiz: fica esperando a pessoa fazer o quiz com o mesmo e-mail`);
  }
  return { status, ref };
}
