import { createHash, randomBytes } from "node:crypto";
import type { Respostas } from "./tipos";

/**
 * A referência enviada ao meio de pagamento carrega um resumo (hash) das
 * respostas, então um pagamento só libera o plano daquelas respostas. O
 * prefixo "mi-" separa os pedidos do Mês Inteiro dos do Fôlego ("fl-").
 */
function resumo(respostas: Respostas): string {
  return createHash("sha256").update(JSON.stringify(respostas)).digest("hex").slice(0, 16);
}

export function criarReferencia(respostas: Respostas): string {
  return `mi-${randomBytes(6).toString("hex")}-${resumo(respostas)}`;
}

const FORMATO = /^mi-[0-9a-f]{12}-[0-9a-f]{16}$/;

export function referenciaValida(ref: unknown): ref is string {
  return typeof ref === "string" && FORMATO.test(ref);
}

export function referenciaCombina(ref: string, respostas: Respostas): boolean {
  return referenciaValida(ref) && ref.endsWith(`-${resumo(respostas)}`);
}
