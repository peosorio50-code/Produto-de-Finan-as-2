/**
 * Pedidos e compras guardados no banco (lib/db.ts).
 *
 * - Pedido: criado quando a pessoa clica em comprar. Guarda as respostas do
 *   quiz que aquele pagamento cobre e, depois, o plano gerado.
 * - Compra: o que a Kiwify avisa pelo webhook (aprovada, Pix gerado,
 *   recusada, reembolsada). Uma compra aprovada ligada a um pedido libera o plano.
 */
import { agora, db, json } from "./db";
import type { Contato, Origem, PlanoCompleto, Respostas } from "./tipos";
import { sanitizarRespostas } from "./validacao";

/** Quantas vezes a IA pode escrever o plano de um mesmo pedido (a 1ª e mais 2 tentativas). */
export const MAX_GERACOES = 3;

export interface PedidoSalvo {
  ref: string;
  criadoEm: string;
  contato: Contato | null;
  respostas: Respostas;
  origem: Origem;
  urlPagamento: string;
  plano: PlanoCompleto | null;
  geracoes: number;
}

export function salvarPedido(p: {
  ref: string;
  contato: Contato | null;
  respostas: Respostas;
  origem: Origem;
  urlPagamento: string;
}): void {
  db()
    .prepare(
      `INSERT INTO pedidos (ref, criado_em, email, contato, respostas, origem, url_pagamento)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      p.ref,
      agora(),
      p.contato?.email.toLowerCase() ?? null,
      p.contato ? JSON.stringify(p.contato) : null,
      JSON.stringify(p.respostas),
      JSON.stringify(p.origem),
      p.urlPagamento,
    );
}

export function atualizarUrlPagamento(ref: string, url: string): void {
  db().prepare("UPDATE pedidos SET url_pagamento = ? WHERE ref = ?").run(url, ref);
}

export function buscarPedido(ref: string): PedidoSalvo | null {
  const linha = db().prepare("SELECT * FROM pedidos WHERE ref = ?").get(ref) as Record<string, unknown> | undefined;
  if (!linha) return null;
  // As respostas passam de novo pela validação: o que vai para a IA é sempre conferido.
  const respostas = sanitizarRespostas(json(linha.respostas));
  if (!respostas) return null;
  return {
    ref: String(linha.ref),
    criadoEm: String(linha.criado_em),
    contato: json<Contato>(linha.contato),
    respostas,
    origem: json<Origem>(linha.origem) ?? {},
    urlPagamento: String(linha.url_pagamento),
    plano: json<PlanoCompleto>(linha.plano),
    geracoes: Number(linha.geracoes) || 0,
  };
}

export function salvarPlano(plano: PlanoCompleto): void {
  db()
    .prepare(
      `UPDATE pedidos SET plano = ?, plano_origem = ?, gerado_em = ?, geracoes = geracoes + 1
       WHERE ref = ?`,
    )
    .run(JSON.stringify(plano), plano.origemNarrativa, plano.geradoEm, plano.ref);
}

/* ---------- Compras (Kiwify) ---------- */

export type StatusCompra = "pendente" | "recusado" | "pago" | "reembolsado";

/**
 * Um status só substitui outro de peso igual ou maior: um aviso de "Pix
 * gerado" que chega atrasado não desfaz uma compra já aprovada, mas um
 * reembolso desfaz.
 */
const PESO: Record<StatusCompra, number> = { pendente: 1, recusado: 1, pago: 2, reembolsado: 3 };

export interface Compra {
  orderId: string;
  ref: string | null;
  email: string;
  nome: string;
  status: StatusCompra;
  metodo: string | null;
  valorCentavos: number | null;
  produto: string;
}

/** Grava ou atualiza a compra. Devolve o status anterior (null se é nova) e o que ficou valendo. */
export function registrarCompra(c: Compra): { anterior: StatusCompra | null; status: StatusCompra } {
  const banco = db();
  const atual = banco.prepare("SELECT status, ref FROM compras WHERE order_id = ?").get(c.orderId) as
    | { status: StatusCompra; ref: string | null }
    | undefined;
  const momento = agora();
  if (!atual) {
    banco
      .prepare(
        `INSERT INTO compras (order_id, ref, email, nome, status, metodo, valor_centavos, produto, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(c.orderId, c.ref, c.email.toLowerCase(), c.nome, c.status, c.metodo, c.valorCentavos, c.produto, momento, momento);
    return { anterior: null, status: c.status };
  }
  const status = PESO[c.status] >= PESO[atual.status] ? c.status : atual.status;
  banco
    .prepare(
      `UPDATE compras SET status = ?, ref = COALESCE(ref, ?), metodo = COALESCE(?, metodo),
         valor_centavos = COALESCE(?, valor_centavos), atualizado_em = ? WHERE order_id = ?`,
    )
    .run(status, c.ref, c.metodo, c.valorCentavos, momento, c.orderId);
  return { anterior: atual.status, status };
}

export function refDaCompra(orderId: string): string | null {
  const linha = db().prepare("SELECT ref FROM compras WHERE order_id = ?").get(orderId) as { ref: string | null } | undefined;
  return linha?.ref ?? null;
}

/** O pedido tem uma compra aprovada (e não reembolsada)? */
export function pedidoPago(ref: string): boolean {
  return Boolean(db().prepare("SELECT 1 FROM compras WHERE ref = ? AND status = 'pago' LIMIT 1").get(ref));
}

const DIA = 24 * 60 * 60 * 1000;

/**
 * Descobre de qual pedido é uma compra. Primeiro pela referência que o site
 * mandou no link do checkout; se ela não voltar no webhook, pelo pedido mais
 * recente do mesmo e-mail, feito nos últimos 7 dias e ainda sem compra.
 */
export function pedidoDaCompra(email: string, refSugerida: string | null): string | null {
  const banco = db();
  if (refSugerida && banco.prepare("SELECT 1 FROM pedidos WHERE ref = ?").get(refSugerida)) return refSugerida;
  const desde = new Date(Date.now() - 7 * DIA).toISOString();
  const linha = banco
    .prepare(
      `SELECT p.ref FROM pedidos p
       WHERE p.email = ? AND p.criado_em >= ?
         AND NOT EXISTS (SELECT 1 FROM compras c WHERE c.ref = p.ref AND c.status IN ('pago', 'reembolsado'))
       ORDER BY p.criado_em DESC LIMIT 1`,
    )
    .get(email.toLowerCase(), desde) as { ref: string } | undefined;
  return linha?.ref ?? null;
}

/**
 * Liga a um pedido uma compra aprovada que chegou sem pedido (por exemplo,
 * quem pagou com outro e-mail ou abriu o checkout por fora do quiz).
 * Devolve se encontrou e ligou alguma.
 */
export function vincularCompraSemPedido(email: string, ref: string): boolean {
  const desde = new Date(Date.now() - 30 * DIA).toISOString();
  const banco = db();
  const linha = banco
    .prepare(
      `SELECT order_id FROM compras WHERE email = ? AND ref IS NULL AND status = 'pago' AND criado_em >= ?
       ORDER BY criado_em DESC LIMIT 1`,
    )
    .get(email.toLowerCase(), desde) as { order_id: string } | undefined;
  if (!linha) return false;
  banco.prepare("UPDATE compras SET ref = ?, atualizado_em = ? WHERE order_id = ?").run(ref, agora(), linha.order_id);
  return true;
}

/** Pedidos pagos de um e-mail, do mais novo para o mais antigo (para reenviar o link). */
export function pedidosPagosDoEmail(email: string): { ref: string; nome: string }[] {
  const linhas = db()
    .prepare(
      `SELECT DISTINCT p.ref, p.respostas, p.criado_em FROM pedidos p JOIN compras c ON c.ref = p.ref
       WHERE c.status = 'pago' AND (p.email = ? OR c.email = ?)
       ORDER BY p.criado_em DESC LIMIT 5`,
    )
    .all(email.toLowerCase(), email.toLowerCase()) as { ref: string; respostas: string }[];
  return linhas.map((l) => ({ ref: l.ref, nome: json<Respostas>(l.respostas)?.nome ?? "" }));
}
