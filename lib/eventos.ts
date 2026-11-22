/**
 * Contador próprio do funil (POST /api/evento do servidor, com p=mesinteiro).
 * Não depende do pixel nem de cookie de terceiros, e não manda dado pessoal:
 * só um id de sessão aleatório, o nome do evento e a origem (utm_source).
 * Cada sessão conta cada evento uma vez. Leitura: mesinteiro.py funil 7.
 */
import { config } from "./api";
import { lerOrigem } from "./armazenamento";

export type EventoFunil = "Entrou" | "QuizInicio" | "Previa" | "Resultado" | "Simulou" | "Checkout" | "Plano" | "Upsell" | "UpsellSim";

const CHAVE = "mesinteiro:sessao";

function sessao(): string {
  try {
    let s = sessionStorage.getItem(CHAVE);
    if (!s) {
      s = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem(CHAVE, s);
    }
    return s;
  } catch {
    return "";
  }
}

export function contar(evento: EventoFunil): void {
  try {
    const s = sessao();
    if (!s) return;
    const src = (lerOrigem().utm_source || "").slice(0, 40);
    void fetch(config().api + "/api/evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ s, e: evento, p: "mesinteiro", src }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // O contador nunca atrapalha a página.
  }
}
