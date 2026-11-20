import { NextResponse, type NextRequest } from "next/server";
import { autorizacaoConfere } from "@/lib/descadastro";
import { rodarRecuperacao } from "@/lib/recuperacao";
import { urlDoSite } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Manda os e-mails de recuperação devidos agora. Chamada de hora em hora pelo
 * cron da VPS (mesinteiro-admin recuperar), com "Authorization: Bearer
 * <TAREFAS_SEGREDO>".
 */
export async function POST(requisicao: NextRequest) {
  if (!autorizacaoConfere(requisicao.headers.get("authorization"))) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }
  const resumo = await rodarRecuperacao(urlDoSite(requisicao.nextUrl.origin), { limite: 100, pausaMs: 300 });
  if (!resumo.configurada) {
    return NextResponse.json({ erro: "email_nao_configurado", ...resumo }, { status: 503 });
  }
  if (resumo.enviados > 0 || resumo.falhas > 0) {
    console.info(`[recuperacao] ${resumo.enviados} enviado(s), ${resumo.falhas} falha(s)`, resumo.porEtapa);
  }
  return NextResponse.json({ ok: true, ...resumo });
}
