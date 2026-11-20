/**
 * Segredo interno (TAREFAS_SEGREDO) e descadastro dos e-mails.
 *
 * O mesmo segredo protege a rota que o cron chama (/api/tarefas/recuperar) e
 * assina os links de "sair da lista": só quem recebeu o e-mail consegue
 * descadastrar aquele endereço.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { agora, db } from "./db";

export function segredoTarefas(): string | null {
  const segredo = (process.env.TAREFAS_SEGREDO || "").trim();
  return segredo.length >= 16 ? segredo : null;
}

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Confere o "Authorization: Bearer <segredo>" de quem chama uma tarefa. */
export function autorizacaoConfere(cabecalho: string | null): boolean {
  const segredo = segredoTarefas();
  if (!segredo || !cabecalho) return false;
  return iguais(cabecalho.replace(/^Bearer\s+/i, "").trim(), segredo);
}

function assinar(email: string): string | null {
  const segredo = segredoTarefas();
  if (!segredo) return null;
  return createHmac("sha256", segredo).update(`sair:${email.trim().toLowerCase()}`).digest("hex").slice(0, 32);
}

export function assinaturaConfere(email: string, assinatura: string): boolean {
  const esperada = assinar(email);
  return Boolean(esperada) && iguais(esperada!, assinatura.trim().toLowerCase());
}

/** Endereço da página de descadastro (com botão de confirmar). */
export function linkDescadastro(site: string, email: string): string | null {
  const t = assinar(email);
  return t ? `${site}/sair?e=${encodeURIComponent(email.toLowerCase())}&t=${t}` : null;
}

/** Endereço do descadastro em um clique, usado no cabeçalho List-Unsubscribe. */
export function linkDescadastroDireto(site: string, email: string): string | null {
  const t = assinar(email);
  return t ? `${site}/api/sair?e=${encodeURIComponent(email.toLowerCase())}&t=${t}` : null;
}

export function descadastrar(email: string): void {
  db().prepare("INSERT OR IGNORE INTO descadastros (email, em) VALUES (?, ?)").run(email.trim().toLowerCase(), agora());
}

export function estaDescadastrado(email: string): boolean {
  return Boolean(db().prepare("SELECT 1 FROM descadastros WHERE email = ?").get(email.trim().toLowerCase()));
}
