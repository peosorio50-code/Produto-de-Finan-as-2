/**
 * Resultado do quiz guardado no servidor, com um link secreto (token).
 *
 * Gravado quando a pessoa termina o quiz. Serve para abrir o resultado em
 * qualquer aparelho (o link vai nos e-mails) e para os e-mails de
 * recuperação de venda. As respostas passam de novo pela validação ao sair do
 * banco.
 */
import { randomBytes } from "node:crypto";
import { agora, db, json } from "./db";
import type { Contato, Origem, Respostas } from "./tipos";
import { sanitizarContato, sanitizarRespostas } from "./validacao";

export const tokenValido = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{20,40}$/.test(t);

export function salvarResultado(r: { contato: Contato; respostas: Respostas; origem: Origem }): string {
  const token = randomBytes(18).toString("base64url");
  db()
    .prepare("INSERT INTO resultados (token, email, contato, respostas, origem, criado_em) VALUES (?, ?, ?, ?, ?, ?)")
    .run(
      token,
      r.contato.email.toLowerCase(),
      JSON.stringify(r.contato),
      JSON.stringify(r.respostas),
      JSON.stringify(r.origem),
      agora(),
    );
  return token;
}

export function buscarResultado(token: string): { contato: Contato; respostas: Respostas } | null {
  if (!tokenValido(token)) return null;
  const linha = db().prepare("SELECT contato, respostas FROM resultados WHERE token = ?").get(token) as
    | { contato: string; respostas: string }
    | undefined;
  if (!linha) return null;
  const respostas = sanitizarRespostas(json(linha.respostas));
  const contato = sanitizarContato(json(linha.contato));
  return respostas && contato ? { respostas, contato } : null;
}
