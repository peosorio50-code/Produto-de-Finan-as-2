/**
 * O site é estático (Cloudflare Pages, projeto mesinteiro). Tudo o que precisa
 * de servidor (pedido, Kiwify, IA, leads, e-mails) roda no servidor do Meu
 * Santo Protetor, em https://api.mapadaalma.online/api/mesinteiro/... (módulo
 * mesinteiro.py). O contador de eventos das páginas é o /api/evento de lá.
 *
 * A configuração fica em public/config.js (window.MESINTEIRO_CONFIG), carregado
 * antes do resto do site: dá para mudar pixel, contato, checkout de reserva e
 * upsell editando esse arquivo, sem compilar de novo. As variáveis
 * NEXT_PUBLIC_* servem só de padrão na hora do build (e nos testes).
 */

/** Endereço público do site (metadados, robots e sitemap: fixado no build). */
export const SITE = (process.env.NEXT_PUBLIC_SITE || "https://mesinteiro.folegofinanceiro.shop").replace(/\/$/, "");

interface ConfigSite {
  API: string;
  VENDA_ABERTA: boolean;
  CONTATO_EMAIL: string;
  REENVIO: boolean;
  META_PIXEL_ID: string;
  CHECKOUT_RESERVA: string;
  UPSELL_ID: string;
  UPSELL_SCRIPT: string;
  CHECKOUT_UPSELL: string;
  PRECO_UPSELL: string;
  PRECO_NORMAL_UPSELL: string;
}

declare global {
  interface Window {
    MESINTEIRO_CONFIG?: Partial<ConfigSite>;
  }
}

const env = (v: string | undefined) => (v || "").trim();

function bruta(): Partial<ConfigSite> {
  return typeof window !== "undefined" && window.MESINTEIRO_CONFIG ? window.MESINTEIRO_CONFIG : {};
}

const texto = (v: unknown, padrao: string) => (typeof v === "string" && v.trim() ? v.trim() : padrao);
const sim = (v: unknown, padrao: boolean) => (typeof v === "boolean" ? v : padrao);

/**
 * A configuração em vigor. No navegador, lê o config.js; na hora do build,
 * só os padrões. Componentes que aparecem no HTML do build devem ler isto
 * dentro de um useEffect (senão o React acusa diferença na hidratação).
 */
export function config() {
  const c = bruta();
  return {
    api: texto(c.API, env(process.env.NEXT_PUBLIC_API) || "https://api.mapadaalma.online").replace(/\/$/, ""),
    vendaAberta: sim(c.VENDA_ABERTA, process.env.NEXT_PUBLIC_VENDA_ABERTA !== "0"),
    contato: texto(c.CONTATO_EMAIL, env(process.env.NEXT_PUBLIC_CONTATO_EMAIL)),
    reenvioPorEmail: sim(c.REENVIO, process.env.NEXT_PUBLIC_REENVIO === "1"),
    pixel: texto(c.META_PIXEL_ID, env(process.env.NEXT_PUBLIC_META_PIXEL_ID)).replace(/\D/g, ""),
    checkoutReserva: texto(c.CHECKOUT_RESERVA, env(process.env.NEXT_PUBLIC_CHECKOUT_RESERVA)),
    upsell: {
      id: texto(c.UPSELL_ID, env(process.env.NEXT_PUBLIC_UPSELL_ID)).replace(/[^A-Za-z0-9_-]/g, ""),
      script: texto(c.UPSELL_SCRIPT, "https://snippets.kiwify.com/upsell/upsell.min.js"),
      checkout: texto(c.CHECKOUT_UPSELL, env(process.env.NEXT_PUBLIC_UPSELL_CHECKOUT)),
      preco: texto(c.PRECO_UPSELL, env(process.env.NEXT_PUBLIC_UPSELL_PRECO) || "19,90"),
      precoNormal: texto(c.PRECO_NORMAL_UPSELL, env(process.env.NEXT_PUBLIC_UPSELL_PRECO_NORMAL) || "29,90"),
    },
  };
}

/** Base das rotas do Mês Inteiro no servidor. */
export const api = () => config().api + "/api/mesinteiro";

export function postar(caminho: string, corpo: unknown, keepalive = false): Promise<Response> {
  return fetch(api() + caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    keepalive,
  });
}
