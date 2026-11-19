/**
 * Kiwify: link do checkout e leitura dos avisos (webhook) de compra.
 *
 * Como o pagamento é ligado às respostas do quiz:
 * 1. O site cria um pedido com uma referência (ref) e manda a pessoa para o
 *    checkout da Kiwify com `?sck=<ref>`.
 * 2. A Kiwify devolve esse `sck` no webhook, em TrackingParameters.
 * 3. Se o `sck` não vier, a compra é ligada ao último pedido do mesmo e-mail
 *    (lib/registros.ts).
 *
 * Configuração (no .env do servidor):
 * - KIWIFY_CHECKOUT: código do checkout (o trecho depois de pay.kiwify.com.br/) ou o link inteiro.
 * - KIWIFY_WEBHOOK_SEGREDO: trecho secreto do endereço do webhook.
 * - KIWIFY_TOKEN: token(s) do webhook, separados por vírgula, para conferir a assinatura.
 * - KIWIFY_PRODUTO: trecho(s) do nome do produto na Kiwify, separados por "|".
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Contato, Origem } from "./tipos";

export function urlCheckoutKiwify(): string | null {
  const valor = (process.env.KIWIFY_CHECKOUT || "").trim();
  if (!valor) return null;
  if (/^https:\/\//.test(valor)) return valor.replace(/\/$/, "");
  if (/^[A-Za-z0-9_-]{4,40}$/.test(valor)) return `https://pay.kiwify.com.br/${valor}`;
  console.error("[kiwify] KIWIFY_CHECKOUT não parece um código de checkout nem um link https");
  return null;
}

/** Link do checkout com a referência do pedido e os dados que a pessoa já deu no quiz. */
export function linkCheckout(base: string, ref: string, comprador?: Contato, origem?: Origem): string {
  const url = new URL(base);
  url.searchParams.set("sck", ref);
  if (comprador) {
    url.searchParams.set("name", comprador.nome);
    url.searchParams.set("email", comprador.email);
  }
  for (const [chave, valor] of Object.entries(origem ?? {})) {
    if (chave.startsWith("utm_") && valor) url.searchParams.set(chave, valor);
  }
  return url.toString();
}

/* ---------- Autenticação do webhook ---------- */

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** O trecho secreto do endereço confere? Sem segredo configurado, nada é aceito. */
export function segredoConfere(recebido: string): boolean {
  const esperado = (process.env.KIWIFY_WEBHOOK_SEGREDO || "").trim();
  return esperado.length >= 16 && iguais(recebido, esperado);
}

export function tokensKiwify(): string[] {
  return (process.env.KIWIFY_TOKEN || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * A Kiwify assina cada aviso com o token do webhook: manda no endereço
 * `?signature=` o HMAC-SHA1 (em hexadecimal) do corpo da requisição.
 */
export function assinaturaConfere(corpoBruto: string, assinatura: string | null, tokens: string[]): boolean {
  if (!assinatura) return false;
  const recebida = assinatura.trim().toLowerCase();
  return tokens.some((token) => iguais(createHmac("sha1", token).update(corpoBruto).digest("hex"), recebida));
}

/* ---------- Leitura do aviso ---------- */

export type TipoAviso = "aprovada" | "pendente" | "recusada" | "reembolso" | "abandono" | "outro";

export interface AvisoKiwify {
  tipo: TipoAviso;
  /** Nome do evento como veio da Kiwify, para o log. */
  evento: string;
  orderId: string | null;
  produto: string;
  email: string;
  nome: string;
  /** Só dígitos, com DDD e sem o 55 (vazio se não veio). */
  telefone: string;
  /** O `sck` (ou `src`) devolvido pela Kiwify: a referência do pedido, se veio. */
  ref: string | null;
  metodo: string | null;
  valorCentavos: number | null;
  linkCheckout: string | null;
  origem: Origem;
}

type Objeto = Record<string, unknown>;

const objeto = (v: unknown): Objeto => (v && typeof v === "object" && !Array.isArray(v) ? (v as Objeto) : {});
const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

/** "+55 (11) 91234-5678" → "11912345678". */
export function telefoneDaKiwify(bruto: string): string {
  let digitos = bruto.replace(/\D/g, "");
  if (digitos.length >= 12 && digitos.startsWith("55")) digitos = digitos.slice(2);
  return /^\d{10,11}$/.test(digitos) ? digitos : "";
}

function tipoDoAviso(evento: string, status: string): TipoAviso {
  const e = evento.toLowerCase();
  const s = status.toLowerCase();
  if (e.includes("abandon") || s === "abandoned") return "abandono";
  if (e.includes("refund") || e.includes("chargeback") || s === "refunded" || s === "chargedback") return "reembolso";
  if (e === "order_approved" || s === "paid" || s === "approved") return "aprovada";
  if (e.includes("rejected") || e.includes("refused") || s === "refused" || s === "rejected") return "recusada";
  if (e.includes("pix_created") || e.includes("billet_created") || s === "waiting_payment") return "pendente";
  return "outro";
}

/** Lê o corpo do webhook. Aceita o pedido solto ou embrulhado em { order: {...} }. */
export function lerAviso(corpo: unknown): AvisoKiwify | null {
  const raiz = objeto(corpo);
  const pedido = Object.keys(objeto(raiz.order)).length > 0 ? objeto(raiz.order) : raiz;
  const cliente = objeto(pedido.Customer);
  const produto = objeto(pedido.Product);
  const rastreio = objeto(pedido.TrackingParameters);
  const comissoes = objeto(pedido.Commissions);

  const evento = texto(pedido.webhook_event_type) || texto(raiz.webhook_event_type);
  const status = texto(pedido.order_status) || texto(pedido.status);
  const email = (texto(cliente.email) || texto(pedido.email)).toLowerCase();
  if (!email || !email.includes("@")) return null;

  const valor = Number(texto(comissoes.charge_amount) || texto(comissoes.product_base_price));
  const origem: Origem = {};
  for (const chave of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const v = texto(rastreio[chave]);
    if (v) origem[chave] = v.slice(0, 200);
  }

  return {
    tipo: tipoDoAviso(evento, status),
    evento: evento || status || "desconhecido",
    orderId: texto(pedido.order_id) || texto(pedido.id) || null,
    produto: texto(produto.product_name) || texto(pedido.product_name),
    email,
    nome: (texto(cliente.full_name) || texto(cliente.first_name) || texto(pedido.name)).slice(0, 80),
    telefone: telefoneDaKiwify(texto(cliente.mobile) || texto(pedido.phone)),
    ref: texto(rastreio.sck) || texto(rastreio.src) || null,
    metodo: texto(pedido.payment_method) || null,
    valorCentavos: Number.isFinite(valor) && valor > 0 ? Math.round(valor) : null,
    linkCheckout: texto(pedido.checkout_link) || null,
    origem,
  };
}

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * O aviso é deste produto? A mesma conta da Kiwify vende outros produtos (o
 * Fôlego, o Meu Santo Protetor...), e o webhook pode receber avisos deles:
 * esses são ignorados e nada é gravado.
 */
export function produtoConfere(nomeDoProduto: string): boolean {
  const trechos = (process.env.KIWIFY_PRODUTO || "mes inteiro")
    .split("|")
    .map((t) => semAcento(t.trim()))
    .filter(Boolean);
  const nome = semAcento(nomeDoProduto);
  return trechos.some((t) => nome.includes(t));
}
