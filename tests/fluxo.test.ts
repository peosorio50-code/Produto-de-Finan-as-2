/**
 * Fluxo completo, chamando as rotas do servidor como a Kiwify e o navegador
 * chamariam: quiz → checkout → webhook da Kiwify → plano. A IA é simulada.
 */
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, fecharBanco } from "@/lib/db";
import { EXEMPLO } from "@/lib/exemplo";

const pendentes: (() => unknown)[] = [];
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (tarefa: () => unknown) => void pendentes.push(tarefa),
}));

const ia = vi.hoisted(() => ({ chamadas: 0, responde: false }));
vi.mock("@/lib/ia", () => ({
  escreverNarrativa: async (_r: unknown, _d: unknown, padrao: { recado: string }) => {
    ia.chamadas += 1;
    return ia.responde ? { ...padrao, recado: "escrito pela IA" } : null;
  },
}));

const { POST: checkout } = await import("@/app/api/checkout/route");
const { POST: webhook } = await import("@/app/api/kiwify/[segredo]/route");
const { POST: plano } = await import("@/app/api/plano/route");
const { POST: lead } = await import("@/app/api/lead/route");
const { POST: vincular } = await import("@/app/api/vincular/route");

const SEGREDO = "segredo-de-teste-123";
const TOKEN = "token-da-kiwify";
const CONTATO = { nome: "Ana Souza", email: "ana@exemplo.com.br", telefone: "11912345678" };

const post = (url: string, corpo: unknown) =>
  new NextRequest(url, { method: "POST", body: JSON.stringify(corpo), headers: { "content-type": "application/json" } });

async function avisar(corpo: Record<string, unknown>, assinarCom = TOKEN) {
  const bruto = JSON.stringify(corpo);
  const assinatura = createHmac("sha1", assinarCom).update(bruto).digest("hex");
  const req = new NextRequest(`https://mesinteiro.folegofinanceiro.shop/api/kiwify/${SEGREDO}?signature=${assinatura}`, {
    method: "POST",
    body: bruto,
  });
  return webhook(req, { params: Promise.resolve({ segredo: SEGREDO }) });
}

const avisoAprovado = (mudancas: Record<string, unknown> = {}, rastreio: Record<string, unknown> = {}) => ({
  order_id: "pedido-kiwify-1",
  order_status: "paid",
  webhook_event_type: "order_approved",
  payment_method: "pix",
  Product: { product_name: "Mês Inteiro - Plano do salário" },
  Customer: { full_name: "Ana Souza", email: "ana@exemplo.com.br", mobile: "+5511912345678" },
  Commissions: { charge_amount: 2990 },
  TrackingParameters: rastreio,
  ...mudancas,
});

async function comprar() {
  const r = await checkout(post("https://mesinteiro.folegofinanceiro.shop/api/checkout", { respostas: EXEMPLO, contato: CONTATO, origem: { utm_source: "meta" } }));
  expect(r.status).toBe(200);
  return (await r.json()) as { ref: string; url: string };
}

const pedirPlano = (ref: string, regenerar = false) => plano(post("https://mesinteiro.folegofinanceiro.shop/api/plano", { ref, regenerar }));

beforeEach(() => {
  vi.stubEnv("MESINTEIRO_DB", ":memory:");
  vi.stubEnv("KIWIFY_CHECKOUT", "AbC123x");
  vi.stubEnv("KIWIFY_WEBHOOK_SEGREDO", SEGREDO);
  vi.stubEnv("KIWIFY_TOKEN", `outro,${TOKEN}`);
  vi.stubEnv("SITE_URL", "https://mesinteiro.folegofinanceiro.shop");
  vi.stubEnv("LEADS_WEBHOOK_URL", "");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  ia.chamadas = 0;
  ia.responde = false;
  pendentes.length = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fecharBanco();
});

async function rodarPendentes() {
  while (pendentes.length > 0) await pendentes.shift()!();
}

describe("fluxo de compra com a Kiwify", () => {
  it("libera o plano depois do aviso de compra aprovada, ligando pelo sck", async () => {
    const { ref, url } = await comprar();
    expect(new URL(url).searchParams.get("sck")).toBe(ref);

    expect((await pedirPlano(ref)).status).toBe(402);

    const r = await avisar(avisoAprovado({}, { sck: ref }));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ status: "pago", ref });

    const resposta = await pedirPlano(ref);
    expect(resposta.status).toBe(200);
    const corpo = await resposta.json();
    expect(corpo.plano.ref).toBe(ref);
    expect(corpo.plano.nome).toBe(EXEMPLO.nome);
    expect(corpo.plano.origemNarrativa).toBe("padrao");
    expect(corpo.plano.calendario.length).toBeGreaterThan(1);
    expect(corpo.plano.diagnostico.livrePorSemana).toBeGreaterThan(0);
    expect(ia.chamadas).toBe(1);
  });

  it("liga a compra pelo e-mail quando o sck não volta", async () => {
    const { ref } = await comprar();
    const r = await avisar(avisoAprovado({ Customer: { full_name: "Ana", email: "ANA@exemplo.com.br" } }));
    expect(await r.json()).toMatchObject({ status: "pago", ref });
    expect((await pedirPlano(ref)).status).toBe(200);
  });

  it("não gasta IA de novo: o plano volta do banco e só regenera a versão padrão até 3 vezes", async () => {
    const { ref } = await comprar();
    await avisar(avisoAprovado({}, { sck: ref }));

    await pedirPlano(ref);
    await pedirPlano(ref);
    expect(ia.chamadas).toBe(1);

    // A IA falhou na 1ª vez: a pessoa pode pedir a versão da IA mais 2 vezes.
    expect((await (await pedirPlano(ref, true)).json()).podeRegenerar).toBe(true);
    const terceira = await (await pedirPlano(ref, true)).json();
    expect(terceira.podeRegenerar).toBe(false);
    await pedirPlano(ref, true);
    expect(ia.chamadas).toBe(3);
  });

  it("guarda a versão da IA e nunca chama a IA para um plano que já é dela", async () => {
    ia.responde = true;
    const { ref } = await comprar();
    await avisar(avisoAprovado({}, { sck: ref }));
    const primeira = await (await pedirPlano(ref)).json();
    expect(primeira.plano.narrativa.recado).toBe("escrito pela IA");
    expect(primeira.podeRegenerar).toBe(false);
    await pedirPlano(ref, true);
    expect(ia.chamadas).toBe(1);
  });

  it("duas abas pedindo ao mesmo tempo geram o plano uma vez só", async () => {
    const { ref } = await comprar();
    await avisar(avisoAprovado({}, { sck: ref }));
    const [a, b] = await Promise.all([pedirPlano(ref), pedirPlano(ref)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(ia.chamadas).toBe(1);
  });

  it("reembolso bloqueia o plano", async () => {
    const { ref } = await comprar();
    await avisar(avisoAprovado({}, { sck: ref }));
    await avisar(avisoAprovado({ order_status: "refunded", webhook_event_type: "order_refunded" }));
    expect((await pedirPlano(ref)).status).toBe(402);
  });

  it("quem pagou antes de fazer o quiz vai direto para o plano ao clicar em comprar", async () => {
    const r = await avisar(avisoAprovado());
    expect(await r.json()).toMatchObject({ status: "pago", ref: null });
    const { ref, url } = await comprar();
    expect(url).toBe(`https://mesinteiro.folegofinanceiro.shop/plano?ref=${ref}`);
    expect((await pedirPlano(ref)).status).toBe(200);
  });

  it("liga a compra feita com outro e-mail quando a pessoa informa o e-mail do pagamento", async () => {
    const { ref } = await comprar();
    await avisar(avisoAprovado({ Customer: { full_name: "Ana", email: "outro@exemplo.com" } }));
    expect((await pedirPlano(ref)).status).toBe(402);
    const r = await vincular(post("https://mesinteiro.folegofinanceiro.shop/api/vincular", { ref, email: "outro@exemplo.com" }));
    expect(r.status).toBe(200);
    expect((await pedirPlano(ref)).status).toBe(200);
  });
});

describe("segurança do webhook", () => {
  it("recusa endereço sem o segredo e assinatura errada", async () => {
    const req = post(`https://mesinteiro.folegofinanceiro.shop/api/kiwify/errado`, avisoAprovado());
    expect((await webhook(req, { params: Promise.resolve({ segredo: "errado" }) })).status).toBe(404);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await avisar(avisoAprovado(), "token-falso")).status).toBe(401);
  });

  it("ignora outros produtos da conta, inclusive o Fôlego, sem gravar nada", async () => {
    const r = await avisar(avisoAprovado({ Product: { product_name: "Devocionário do Meu Santo Protetor" } }));
    expect(await r.json()).toMatchObject({ ignorado: "outro_produto" });
    const folego = await avisar(avisoAprovado({ Product: { product_name: "Fôlego: plano de quitação de dívidas" } }));
    expect(await folego.json()).toMatchObject({ ignorado: "outro_produto" });
    await rodarPendentes();
    expect(db().prepare("SELECT COUNT(*) n FROM compras").get()).toMatchObject({ n: 0 });
    expect(db().prepare("SELECT COUNT(*) n FROM leads").get()).toMatchObject({ n: 0 });
  });

  it("aceita sem assinatura quando não há KIWIFY_TOKEN (o segredo do endereço protege)", async () => {
    vi.stubEnv("KIWIFY_TOKEN", "");
    const req = post(`https://mesinteiro.folegofinanceiro.shop/api/kiwify/${SEGREDO}`, avisoAprovado());
    expect((await webhook(req, { params: Promise.resolve({ segredo: SEGREDO }) })).status).toBe(200);
  });
});

describe("leads no banco", () => {
  it("guarda uma ficha por e-mail, com a primeira campanha, e o histórico de eventos", async () => {
    await lead(post("https://mesinteiro.folegofinanceiro.shop/api/lead", { evento: "quiz_iniciado", contato: CONTATO, origem: { utm_source: "meta" } }));
    await lead(post("https://mesinteiro.folegofinanceiro.shop/api/lead", { evento: "quiz_concluido", contato: CONTATO, respostas: EXEMPLO, origem: { utm_source: "google" } }));
    const { ref } = await comprar();
    await avisar(avisoAprovado({ order_status: "waiting_payment", webhook_event_type: "pix_created" }, { sck: ref }));
    await avisar(avisoAprovado({}, { sck: ref }));
    await pedirPlano(ref);
    await rodarPendentes();

    const ficha = db().prepare("SELECT * FROM leads").all() as Record<string, string>[];
    expect(ficha).toHaveLength(1);
    expect(ficha[0].email).toBe("ana@exemplo.com.br");
    expect(ficha[0].telefone).toBe("11912345678");
    expect(JSON.parse(ficha[0].origem)).toEqual({ utm_source: "meta" });
    expect(JSON.parse(ficha[0].resultado).perfil).toBeTruthy();
    expect(ficha[0].ultimo_evento).toBe("plano_gerado");

    const eventos = (db().prepare("SELECT evento FROM eventos ORDER BY id").all() as { evento: string }[]).map((e) => e.evento);
    expect(eventos).toEqual(["quiz_iniciado", "quiz_concluido", "checkout_iniciado", "pix_gerado", "compra_aprovada", "plano_gerado"]);
  });

  it("guarda o carrinho abandonado com o link do checkout", async () => {
    await avisar({
      id: "carrinho-1",
      email: "joao@exemplo.com",
      name: "João",
      phone: "11987654321",
      product_name: "Mês Inteiro",
      status: "abandoned",
      checkout_link: "https://pay.kiwify.com.br/AbC123x",
    });
    await rodarPendentes();
    expect(db().prepare("SELECT email, ultimo_evento FROM leads").get()).toMatchObject({
      email: "joao@exemplo.com",
      ultimo_evento: "carrinho_abandonado",
    });
    expect(db().prepare("SELECT COUNT(*) n FROM compras").get()).toMatchObject({ n: 0 });
  });

  it("manda o e-mail com o link do plano só na primeira aprovação", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    vi.stubEnv("EMAIL_REMETENTE", "Mês Inteiro <plano@folegofinanceiro.shop>");
    const enviados: { to: string[]; text: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (url === "https://api.resend.com/emails") enviados.push(JSON.parse(String(init.body)));
      return new Response("{}", { status: 200 });
    });
    const { ref } = await comprar();
    await avisar(avisoAprovado({}, { sck: ref }));
    await avisar(avisoAprovado({}, { sck: ref }));
    await rodarPendentes();
    vi.unstubAllGlobals();
    expect(enviados).toHaveLength(1);
    expect(enviados[0].to).toEqual(["ana@exemplo.com.br"]);
    expect(enviados[0].text).toContain(`https://mesinteiro.folegofinanceiro.shop/plano?ref=${ref}`);
  });
});
