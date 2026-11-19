/**
 * E-mail com o link do plano, enviado pela Resend (opcional).
 *
 * Sem RESEND_API_KEY e EMAIL_REMETENTE, nada é enviado: o plano continua
 * aparecendo na página de obrigado logo depois do pagamento. Com eles, quem
 * pagou recebe o link por e-mail, o que salva quem pagou o Pix depois,
 * fechou a página ou trocou de aparelho.
 */
import { MARCA } from "./config";

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
}

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function montarEmailDoPlano(primeiroNome: string, links: string[]) {
  const nome = primeiroNome.trim().split(" ")[0] || "";
  const saudacao = nome ? `Oi, ${nome}!` : "Oi!";
  const varios = links.length > 1;
  const assunto = `Seu plano do ${MARCA.nome} está pronto`;
  const texto = [
    saudacao,
    "",
    "Seu pagamento foi confirmado. " +
      (varios ? "Estes são os links dos seus planos:" : "Este é o link do seu plano do mês:"),
    ...links,
    "",
    "Guarde este e-mail: o link abre o plano em qualquer aparelho. Na página do plano, você também pode salvar em PDF.",
    "",
    MARCA.contatoEmail ? `Qualquer dúvida, é só responder a este e-mail.` : "",
    `Equipe ${MARCA.nome}`,
  ]
    .filter((l, i, todas) => l !== "" || todas[i - 1] !== "")
    .join("\n");
  const botoes = links
    .map(
      (l, i) =>
        `<p style="margin:24px 0"><a href="${escapar(l)}" style="background:#0e7a4e;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${
          varios ? `Abrir o plano ${i + 1}` : "Abrir meu plano"
        }</a></p>`,
    )
    .join("");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#10221a;max-width:520px">
<p>${escapar(saudacao)}</p>
<p>Seu pagamento foi confirmado. ${varios ? "Estes são os seus planos:" : "Seu plano do mês está aqui:"}</p>
${botoes}
<p style="color:#555">Guarde este e-mail: o link abre o plano em qualquer aparelho. Na página do plano, você também pode salvar em PDF.</p>
${MARCA.contatoEmail ? `<p style="color:#555">Qualquer dúvida, é só responder a este e-mail.</p>` : ""}
<p>Equipe ${escapar(MARCA.nome)}</p>
</div>`;
  return { assunto, texto, html };
}

/** Envia o e-mail com o(s) link(s) do plano. Nunca lança erro. */
export async function enviarEmailDoPlano(para: string, primeiroNome: string, links: string[]): Promise<boolean> {
  if (!emailConfigurado() || links.length === 0) return false;
  const { assunto, texto, html } = montarEmailDoPlano(primeiroNome, links);
  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE,
        to: [para],
        subject: assunto,
        text: texto,
        html,
        ...(MARCA.contatoEmail && { reply_to: MARCA.contatoEmail }),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resposta.ok) {
      console.error(`[email] a Resend respondeu ${resposta.status}`);
      return false;
    }
    return true;
  } catch (erro) {
    console.error("[email] falha ao enviar:", erro instanceof Error ? erro.message : erro);
    return false;
  }
}
