/**
 * E-mails enviados pela Resend (opcional).
 *
 * Sem RESEND_API_KEY e EMAIL_REMETENTE, nada é enviado: o plano continua
 * aparecendo na página de obrigado logo depois do pagamento. Com eles:
 * - quem pagou recebe o link do plano (salva quem pagou o Pix depois,
 *   fechou a página ou trocou de aparelho);
 * - quem fez o quiz e não comprou recebe os e-mails de recuperação
 *   (lib/recuperacao.ts), se TAREFAS_SEGREDO também estiver configurado.
 */
import { MARCA } from "./config";

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
}

export const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const COR_BOTAO = "#0e7a4e";
export const COR_TEXTO = "#10221a";

/** Botão de e-mail (link estilizado, que funciona em qualquer leitor). */
export function botaoEmail(href: string, texto: string): string {
  return `<p style="margin:24px 0"><a href="${escapar(href)}" style="background:${COR_BOTAO};color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${escapar(texto)}</a></p>`;
}

/** Moldura comum: fonte, largura e cor. O conteúdo já vem em HTML. */
export function moldura(conteudo: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:${COR_TEXTO};max-width:520px">
${conteudo}
</div>`;
}

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
  const botoes = links.map((l, i) => botaoEmail(l, varios ? `Abrir o plano ${i + 1}` : "Abrir meu plano")).join("");
  const html = moldura(`<p>${escapar(saudacao)}</p>
<p>Seu pagamento foi confirmado. ${varios ? "Estes são os seus planos:" : "Seu plano do mês está aqui:"}</p>
${botoes}
<p style="color:#555">Guarde este e-mail: o link abre o plano em qualquer aparelho. Na página do plano, você também pode salvar em PDF.</p>
${MARCA.contatoEmail ? `<p style="color:#555">Qualquer dúvida, é só responder a este e-mail.</p>` : ""}
<p>Equipe ${escapar(MARCA.nome)}</p>`);
  return { assunto, texto, html };
}

/** Envia um e-mail pela Resend. Nunca lança erro; devolve se foi aceito. */
export async function enviarEmail(e: {
  para: string;
  assunto: string;
  texto: string;
  html: string;
  cabecalhos?: Record<string, string>;
}): Promise<boolean> {
  if (!emailConfigurado()) return false;
  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE,
        to: [e.para],
        subject: e.assunto,
        text: e.texto,
        html: e.html,
        ...(MARCA.contatoEmail && { reply_to: MARCA.contatoEmail }),
        ...(e.cabecalhos && { headers: e.cabecalhos }),
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

/** Envia o e-mail com o(s) link(s) do plano. Nunca lança erro. */
export async function enviarEmailDoPlano(para: string, primeiroNome: string, links: string[]): Promise<boolean> {
  if (links.length === 0) return false;
  return enviarEmail({ para, ...montarEmailDoPlano(primeiroNome, links) });
}
