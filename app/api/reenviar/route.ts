import { after, NextResponse, type NextRequest } from "next/server";
import { emailConfigurado, enviarEmailDoPlano } from "@/lib/email";
import { pedidosPagosDoEmail } from "@/lib/registros";
import { linkDoPlano, urlDoSite } from "@/lib/site";

export const runtime = "nodejs";

/** Último envio por e-mail, para ninguém usar esta rota para lotar a caixa de alguém. */
const ultimoEnvio = new Map<string, number>();
const INTERVALO = 10 * 60 * 1000;

/**
 * "Não estou vendo meu plano": manda de novo, para o e-mail da compra, o link
 * dos planos pagos. A resposta é sempre a mesma, exista compra ou não, para
 * não revelar quem é cliente.
 */
export async function POST(requisicao: NextRequest) {
  const corpo = await requisicao.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase().slice(0, 120) : "";
  if (!email.includes("@")) return NextResponse.json({ erro: "email_invalido" }, { status: 400 });
  if (!emailConfigurado()) return NextResponse.json({ erro: "indisponivel" }, { status: 503 });

  const antes = ultimoEnvio.get(email) ?? 0;
  if (Date.now() - antes > INTERVALO) {
    const pedidos = pedidosPagosDoEmail(email);
    if (pedidos.length > 0) {
      ultimoEnvio.set(email, Date.now());
      const site = urlDoSite(requisicao.nextUrl.origin);
      after(() => enviarEmailDoPlano(email, pedidos[0].nome, pedidos.map((p) => linkDoPlano(site, p.ref))));
    }
  }
  return NextResponse.json({ ok: true });
}
