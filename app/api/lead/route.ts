import { after, NextResponse, type NextRequest } from "next/server";
import { diagnosticar } from "@/lib/diagnostico";
import { montarLead, registrarLead, resumirParaLead } from "@/lib/leads";
import { salvarResultado } from "@/lib/resultados";
import { sanitizarContato, sanitizarOrigem, sanitizarRespostas } from "@/lib/validacao";

export const runtime = "nodejs";

/**
 * Recebe os eventos do quiz (início e conclusão), grava no banco e repassa ao
 * webhook de leads depois de responder, para não deixar a pessoa esperando.
 */
export async function POST(requisicao: NextRequest) {
  const corpo = await requisicao.json().catch(() => null);
  const contato = sanitizarContato(corpo?.contato);
  if (!contato) {
    return NextResponse.json({ erro: "contato_invalido" }, { status: 400 });
  }
  const origem = sanitizarOrigem(corpo?.origem);

  if (corpo?.evento === "quiz_iniciado") {
    after(() => registrarLead(montarLead({ evento: "quiz_iniciado", contato, origem })));
    return NextResponse.json({ ok: true });
  }

  if (corpo?.evento === "quiz_concluido") {
    const respostas = sanitizarRespostas(corpo?.respostas);
    if (!respostas) {
      return NextResponse.json({ erro: "respostas_invalidas" }, { status: 400 });
    }
    // As respostas ficam guardadas: abrem o resultado em qualquer aparelho e
    // alimentam os e-mails de recuperação. Uma falha aqui não trava o quiz.
    try {
      salvarResultado({ contato, respostas, origem });
    } catch (erro) {
      console.error("[lead] falha ao guardar o resultado:", erro instanceof Error ? erro.message : erro);
    }
    // O resumo é recalculado aqui, com as mesmas regras do resultado da tela.
    const resultado = resumirParaLead(respostas, diagnosticar(respostas));
    after(() => registrarLead(montarLead({ evento: "quiz_concluido", contato, origem, resultado })));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ erro: "evento_invalido" }, { status: 400 });
}
