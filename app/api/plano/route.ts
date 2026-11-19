import { after, NextResponse, type NextRequest } from "next/server";
import { calendarioDoMes } from "@/lib/calendario";
import { diagnosticar } from "@/lib/diagnostico";
import { escreverNarrativa } from "@/lib/ia";
import { montarLead, registrarLead, resumirParaLead } from "@/lib/leads";
import { narrativaPadrao } from "@/lib/narrativa-padrao";
import { pagamentoAprovado } from "@/lib/pagamento";
import { referenciaValida } from "@/lib/pedido";
import { buscarPedido, MAX_GERACOES, salvarPlano, type PedidoSalvo } from "@/lib/registros";
import { linkDoPlano, urlDoSite } from "@/lib/site";
import type { PlanoCompleto } from "@/lib/tipos";

export const runtime = "nodejs";
// A IA pode levar mais de um minuto para escrever o plano.
export const maxDuration = 300;

/** Gerações em andamento, por pedido: duas abas abertas não pagam a IA duas vezes. */
const emAndamento = new Map<string, Promise<PlanoCompleto>>();

async function gerar(pedido: PedidoSalvo): Promise<PlanoCompleto> {
  const { respostas } = pedido;
  const diagnostico = diagnosticar(respostas);
  const padrao = narrativaPadrao(respostas, diagnostico);
  const daIA = await escreverNarrativa(respostas, diagnostico, padrao);
  const plano: PlanoCompleto = {
    ref: pedido.ref,
    geradoEm: new Date().toISOString(),
    nome: respostas.nome,
    diagnostico,
    calendario: calendarioDoMes(respostas, diagnostico),
    narrativa: daIA ?? padrao,
    origemNarrativa: daIA ? "ia" : "padrao",
  };
  // Uma versão escrita pela IA nunca é trocada pela versão padrão.
  if (plano.origemNarrativa === "ia" || pedido.plano?.origemNarrativa !== "ia") salvarPlano(plano);
  return plano;
}

/**
 * Entrega o plano de um pedido pago. Corpo: { ref, regenerar? }.
 * - O plano já gerado volta do banco, sem gastar IA de novo.
 * - `regenerar` só vale quando o plano saiu na versão padrão (a IA falhou), e
 *   no máximo MAX_GERACOES vezes por pedido.
 */
export async function POST(requisicao: NextRequest) {
  const corpo = await requisicao.json().catch(() => null);
  const ref: unknown = corpo?.ref;
  if (!referenciaValida(ref)) {
    return NextResponse.json({ erro: "pedido_invalido" }, { status: 400 });
  }
  const pedido = buscarPedido(ref);
  if (!pedido) {
    return NextResponse.json({ erro: "pedido_nao_encontrado" }, { status: 404 });
  }
  if (!pagamentoAprovado(ref)) {
    return NextResponse.json({ erro: "pagamento_pendente", urlPagamento: pedido.urlPagamento }, { status: 402 });
  }

  const salvo = pedido.plano;
  const podeTentarIA = pedido.geracoes < MAX_GERACOES;
  const querIA = corpo?.regenerar === true && salvo?.origemNarrativa === "padrao";
  if (salvo && !(querIA && podeTentarIA)) {
    return NextResponse.json({ plano: salvo, podeRegenerar: salvo.origemNarrativa === "padrao" && podeTentarIA });
  }

  let geracao = emAndamento.get(ref);
  if (!geracao) {
    geracao = gerar(pedido).finally(() => emAndamento.delete(ref));
    emAndamento.set(ref, geracao);
  }
  let plano: PlanoCompleto;
  try {
    plano = await geracao;
  } catch (erro) {
    console.error("[plano] falha ao montar o plano:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erro: "falha_ao_gerar" }, { status: 500 });
  }

  if (!salvo && pedido.contato) {
    // Só na primeira geração: é este evento que conta a entrega.
    const lead = montarLead({
      evento: "plano_gerado",
      contato: pedido.contato,
      origem: pedido.origem,
      resultado: resumirParaLead(pedido.respostas, plano.diagnostico),
      pedido: { ref, linkPlano: linkDoPlano(urlDoSite(requisicao.nextUrl.origin), ref) },
    });
    after(() => registrarLead(lead));
  }
  const geracoes = pedido.geracoes + 1;
  return NextResponse.json({
    plano,
    podeRegenerar: plano.origemNarrativa === "padrao" && geracoes < MAX_GERACOES,
  });
}
