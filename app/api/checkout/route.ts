import { after, NextResponse, type NextRequest } from "next/server";
import { diagnosticar } from "@/lib/diagnostico";
import { montarLead, registrarLead, resumirParaLead } from "@/lib/leads";
import { criarCheckout, modoPagamento } from "@/lib/pagamento";
import { criarReferencia } from "@/lib/pedido";
import { atualizarUrlPagamento, salvarPedido, vincularCompraSemPedido } from "@/lib/registros";
import { linkDoPlano, urlDoSite } from "@/lib/site";
import { sanitizarContato, sanitizarOrigem, sanitizarRespostas } from "@/lib/validacao";

export const runtime = "nodejs";

export async function POST(requisicao: NextRequest) {
  const corpo = await requisicao.json().catch(() => null);
  const respostas = sanitizarRespostas(corpo?.respostas);
  if (!respostas) {
    return NextResponse.json({ erro: "respostas_invalidas" }, { status: 400 });
  }
  if (modoPagamento() === "indisponivel") {
    return NextResponse.json({ erro: "pagamento_nao_configurado" }, { status: 503 });
  }
  const contato = sanitizarContato(corpo?.contato);
  const origem = sanitizarOrigem(corpo?.origem);
  const site = urlDoSite(requisicao.nextUrl.origin);
  const ref = criarReferencia(respostas);

  try {
    let url = criarCheckout(ref, site, contato ?? undefined, origem);
    // O pedido fica no banco: é dele que o servidor tira as respostas quando o
    // pagamento cai, em qualquer aparelho.
    salvarPedido({ ref, contato, respostas, origem, urlPagamento: url });

    // Quem já pagou na Kiwify antes de fazer o quiz (ou com o quiz em outro
    // aparelho) vai direto para o plano.
    if (contato && modoPagamento() === "kiwify" && vincularCompraSemPedido(contato.email, ref)) {
      url = linkDoPlano(site, ref);
      atualizarUrlPagamento(ref, url);
    }

    if (contato) {
      // Quem abriu o pagamento e não concluiu é o público da recuperação de venda.
      const lead = montarLead({
        evento: "checkout_iniciado",
        contato,
        origem,
        resultado: resumirParaLead(respostas, diagnosticar(respostas)),
        pedido: { ref, linkPagamento: url },
      });
      after(() => registrarLead(lead));
    }
    // As respostas voltam normalizadas: é esta versão que o pedido cobre.
    return NextResponse.json({ ref, url, respostas });
  } catch (erro) {
    console.error("[checkout]", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erro: "falha_no_pagamento" }, { status: 502 });
  }
}
