import { NextResponse, type NextRequest } from "next/server";
import { assinaturaConfere, descadastrar } from "@/lib/descadastro";
import { urlDoSite } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Tira um e-mail da lista. Recebe ?e=EMAIL&t=ASSINATURA por POST: do botão da
 * página /sair ou do "cancelar inscrição" do próprio leitor de e-mail
 * (List-Unsubscribe-Post). Só POST, para robôs que abrem links não
 * descadastrarem ninguém.
 */
export async function POST(requisicao: NextRequest) {
  const email = (requisicao.nextUrl.searchParams.get("e") ?? "").trim().toLowerCase();
  const assinatura = requisicao.nextUrl.searchParams.get("t") ?? "";
  if (!email.includes("@") || !assinaturaConfere(email, assinatura)) {
    return NextResponse.json({ erro: "link_invalido" }, { status: 400 });
  }
  descadastrar(email);
  // Do formulário da página: volta para ela já confirmada.
  if ((requisicao.headers.get("accept") ?? "").includes("text/html")) {
    return NextResponse.redirect(`${urlDoSite(requisicao.nextUrl.origin)}/sair?feito=1`, 303);
  }
  return NextResponse.json({ ok: true });
}
