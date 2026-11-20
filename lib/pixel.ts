/**
 * Eventos do funil para o pixel da Meta. Sem pixel configurado (ou com
 * bloqueador de anúncios), as chamadas não fazem nada.
 *
 * - Lead: preencheu o contato e começou o quiz.
 * - CompleteRegistration: terminou o quiz.
 * - InitiateCheckout: clicou em comprar.
 * - Purchase: o plano saiu depois do pagamento (uma vez por pedido).
 */
declare global {
  interface Window {
    fbq?: (...argumentos: unknown[]) => void;
  }
}

export type EventoPixel = "Lead" | "CompleteRegistration" | "InitiateCheckout" | "Purchase";

export function rastrear(evento: EventoPixel, dados?: Record<string, unknown>, idDoEvento?: string): void {
  try {
    window.fbq?.("track", evento, dados ?? {}, idDoEvento ? { eventID: idDoEvento } : undefined);
  } catch {
    // O pixel nunca atrapalha o quiz nem a compra.
  }
}
