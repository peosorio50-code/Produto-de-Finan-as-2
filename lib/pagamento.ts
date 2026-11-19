/**
 * Cobrança pela Kiwify. O checkout é um link fixo do produto; a confirmação
 * do pagamento chega pelo webhook (app/api/kiwify/[segredo]/route.ts) e fica
 * gravada no banco. Para trocar de meio de pagamento, reescreva este arquivo
 * mantendo as três funções exportadas.
 */
import { linkCheckout, urlCheckoutKiwify } from "./kiwify";
import { pedidoPago } from "./registros";
import type { Contato, Origem } from "./tipos";

export type ModoPagamento = "kiwify" | "teste" | "indisponivel";

export function modoPagamento(): ModoPagamento {
  if (urlCheckoutKiwify()) return "kiwify";
  if (process.env.PAGAMENTO_MODO === "teste") return "teste";
  return "indisponivel";
}

/** Devolve o endereço para onde o comprador deve ir para pagar. */
export function criarCheckout(ref: string, site: string, comprador?: Contato, origem?: Origem): string {
  const modo = modoPagamento();
  if (modo === "teste") return `${site}/pagamento-teste?ref=${ref}`;
  const base = urlCheckoutKiwify();
  if (modo === "indisponivel" || !base) throw new Error("Pagamento não configurado");
  return linkCheckout(base, ref, comprador, origem);
}

/** O pedido `ref` foi pago? Confere a compra gravada a partir do webhook da Kiwify. */
export function pagamentoAprovado(ref: string): boolean {
  const modo = modoPagamento();
  if (modo === "teste") return true;
  if (modo === "indisponivel") return false;
  return pedidoPago(ref);
}
