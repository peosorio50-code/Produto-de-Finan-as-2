/**
 * Banco de dados do Mês Inteiro: um arquivo SQLite no servidor (na VPS, em
 * /opt/mesinteiro/dados/mesinteiro.db). Guarda os leads do quiz, os pedidos (as
 * respostas que cada pagamento cobre), as compras avisadas pela Kiwify e o
 * plano gerado, para que ele não dependa só do navegador do cliente.
 *
 * Usa o SQLite que vem dentro do Node (node:sqlite), sem dependência nativa.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

let banco: DatabaseSync | null = null;

/** Caminho do arquivo. MESINTEIRO_DB=":memory:" serve para os testes. */
export function caminhoDoBanco(): string {
  return process.env.MESINTEIRO_DB || join(process.cwd(), "dados", "mesinteiro.db");
}

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS leads (
  email          TEXT PRIMARY KEY,
  nome           TEXT NOT NULL DEFAULT '',
  telefone       TEXT NOT NULL DEFAULT '',
  origem         TEXT NOT NULL DEFAULT '{}',
  resultado      TEXT,
  ultimo_evento  TEXT NOT NULL,
  criado_em      TEXT NOT NULL,
  atualizado_em  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eventos (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  em       TEXT NOT NULL,
  evento   TEXT NOT NULL,
  email    TEXT,
  ref      TEXT,
  detalhe  TEXT
);
CREATE INDEX IF NOT EXISTS eventos_por_data ON eventos (em);

CREATE TABLE IF NOT EXISTS pedidos (
  ref            TEXT PRIMARY KEY,
  criado_em      TEXT NOT NULL,
  email          TEXT,
  contato        TEXT,
  respostas      TEXT NOT NULL,
  origem         TEXT NOT NULL DEFAULT '{}',
  url_pagamento  TEXT NOT NULL,
  plano          TEXT,
  plano_origem   TEXT,
  geracoes       INTEGER NOT NULL DEFAULT 0,
  gerado_em      TEXT
);
CREATE INDEX IF NOT EXISTS pedidos_por_email ON pedidos (email, criado_em);

CREATE TABLE IF NOT EXISTS compras (
  order_id        TEXT PRIMARY KEY,
  ref             TEXT,
  email           TEXT,
  nome            TEXT,
  status          TEXT NOT NULL,
  metodo          TEXT,
  valor_centavos  INTEGER,
  produto         TEXT,
  criado_em       TEXT NOT NULL,
  atualizado_em   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS compras_por_ref ON compras (ref);
CREATE INDEX IF NOT EXISTS compras_por_email ON compras (email);
`;

export function db(): DatabaseSync {
  if (banco) return banco;
  const caminho = caminhoDoBanco();
  if (caminho !== ":memory:") mkdirSync(dirname(caminho), { recursive: true });
  banco = new DatabaseSync(caminho);
  // WAL deixa leitura e escrita acontecerem ao mesmo tempo; busy_timeout
  // espera em vez de falhar se o script de administração estiver escrevendo.
  banco.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  banco.exec(ESQUEMA);
  return banco;
}

/** Fecha o banco (usado pelos testes para começar do zero). */
export function fecharBanco(): void {
  banco?.close();
  banco = null;
}

export const agora = () => new Date().toISOString();

export function json<T>(texto: unknown): T | null {
  if (typeof texto !== "string") return null;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return null;
  }
}
