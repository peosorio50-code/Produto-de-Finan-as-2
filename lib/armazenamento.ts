/**
 * O que fica guardado no navegador do cliente: o quiz em andamento, as
 * respostas, o pedido e uma cópia do plano. O servidor guarda os leads, os
 * pedidos e o plano no banco (lib/db.ts).
 */
import type { Contato, Origem, PlanoCompleto, Respostas } from "./tipos";

const CHAVE_RASCUNHO = "mesinteiro:quiz";
const CHAVE_CONTATO = "mesinteiro:contato";
const CHAVE_ORIGEM = "mesinteiro:origem";
const CHAVE_RESPOSTAS = "mesinteiro:respostas";
const CHAVE_PEDIDO = "mesinteiro:pedido";
const CHAVE_PLANO = "mesinteiro:plano:";

export interface Pedido {
  ref: string;
  /** Respostas exatamente como o servidor as registrou no checkout. */
  respostas: Respostas;
  urlPagamento: string;
  criadoEm: string;
}

function ler<T>(chave: string): T | null {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Navegação privada ou armazenamento cheio: o fluxo segue sem guardar.
  }
}

export const lerContato = () => ler<Contato>(CHAVE_CONTATO);
export const gravarContato = (c: Contato) => gravar(CHAVE_CONTATO, c);

/** Parâmetros de campanha da primeira visita que trouxe algum. */
export const lerOrigem = () => ler<Origem>(CHAVE_ORIGEM) ?? {};
export const gravarOrigem = (o: Origem) => gravar(CHAVE_ORIGEM, o);

/** Quiz em andamento (formato interno do formulário). */
export const lerRascunho = <T>() => ler<T>(CHAVE_RASCUNHO);
export const gravarRascunho = (rascunho: unknown) => gravar(CHAVE_RASCUNHO, rascunho);

/** Respostas finalizadas, prontas para o diagnóstico. */
export const lerRespostas = () => ler<Respostas>(CHAVE_RESPOSTAS);
export const gravarRespostas = (r: Respostas) => gravar(CHAVE_RESPOSTAS, r);

export const lerPedido = () => ler<Pedido>(CHAVE_PEDIDO);
export const gravarPedido = (p: Pedido) => gravar(CHAVE_PEDIDO, p);

export const lerPlano = (ref: string) => ler<PlanoCompleto>(CHAVE_PLANO + ref);
export const gravarPlano = (p: PlanoCompleto) => gravar(CHAVE_PLANO + p.ref, p);
