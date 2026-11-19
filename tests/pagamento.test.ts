import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { fecharBanco } from "@/lib/db";
import {
  assinaturaConfere,
  lerAviso,
  linkCheckout,
  produtoConfere,
  segredoConfere,
  telefoneDaKiwify,
  urlCheckoutKiwify,
} from "@/lib/kiwify";
import { criarCheckout, modoPagamento, pagamentoAprovado } from "@/lib/pagamento";
import { registrarCompra, salvarPedido } from "@/lib/registros";
import { EXEMPLO } from "@/lib/exemplo";

const REF = "mi-0123456789ab-0123456789abcdef";

describe("modo de pagamento e checkout", () => {
  beforeEach(() => {
    vi.stubEnv("MESINTEIRO_DB", ":memory:");
    vi.stubEnv("KIWIFY_CHECKOUT", "AbC123x");
    vi.stubEnv("PAGAMENTO_MODO", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    fecharBanco();
  });

  it("escolhe o modo pelo ambiente, e o checkout da Kiwify sempre vence o modo de teste", () => {
    vi.stubEnv("PAGAMENTO_MODO", "teste");
    expect(modoPagamento()).toBe("kiwify");
    vi.stubEnv("KIWIFY_CHECKOUT", "");
    expect(modoPagamento()).toBe("teste");
    vi.stubEnv("PAGAMENTO_MODO", "");
    expect(modoPagamento()).toBe("indisponivel");
  });

  it("aceita o código do checkout ou o link inteiro", () => {
    expect(urlCheckoutKiwify()).toBe("https://pay.kiwify.com.br/AbC123x");
    vi.stubEnv("KIWIFY_CHECKOUT", "https://pay.kiwify.com.br/AbC123x/");
    expect(urlCheckoutKiwify()).toBe("https://pay.kiwify.com.br/AbC123x");
    vi.stubEnv("KIWIFY_CHECKOUT", "não é um código");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(urlCheckoutKiwify()).toBeNull();
  });

  it("manda a referência do pedido, o contato e os UTMs no link do checkout", () => {
    const url = new URL(
      criarCheckout(
        REF,
        "https://mesinteiro.folegofinanceiro.shop",
        { nome: "Ana Souza", email: "ana@exemplo.com.br", telefone: "11912345678" },
        { utm_source: "meta", utm_campaign: "quiz", fbclid: "abc" },
      ),
    );
    expect(url.origin + url.pathname).toBe("https://pay.kiwify.com.br/AbC123x");
    expect(url.searchParams.get("sck")).toBe(REF);
    expect(url.searchParams.get("email")).toBe("ana@exemplo.com.br");
    expect(url.searchParams.get("name")).toBe("Ana Souza");
    expect(url.searchParams.get("utm_source")).toBe("meta");
    expect(url.searchParams.get("fbclid")).toBeNull();
    expect(linkCheckout("https://pay.kiwify.com.br/x", REF)).toBe(`https://pay.kiwify.com.br/x?sck=${REF}`);
  });

  it("no modo de teste, manda para a tela de pagamento simulado e libera", () => {
    vi.stubEnv("KIWIFY_CHECKOUT", "");
    vi.stubEnv("PAGAMENTO_MODO", "teste");
    expect(criarCheckout(REF, "http://localhost:3000")).toBe(`http://localhost:3000/pagamento-teste?ref=${REF}`);
    expect(pagamentoAprovado(REF)).toBe(true);
  });

  it("só libera o pedido com compra aprovada e não reembolsada", () => {
    salvarPedido({ ref: REF, contato: null, respostas: EXEMPLO, origem: {}, urlPagamento: "https://x" });
    expect(pagamentoAprovado(REF)).toBe(false);

    const compra = {
      orderId: "o-1",
      ref: REF,
      email: "ana@exemplo.com.br",
      nome: "Ana",
      metodo: "pix",
      valorCentavos: 2990,
      produto: "Mês Inteiro",
    };
    registrarCompra({ ...compra, status: "pendente" });
    expect(pagamentoAprovado(REF)).toBe(false);
    registrarCompra({ ...compra, status: "pago" });
    expect(pagamentoAprovado(REF)).toBe(true);
    // Um aviso de "Pix gerado" atrasado não desfaz a aprovação...
    expect(registrarCompra({ ...compra, status: "pendente" })).toEqual({ anterior: "pago", status: "pago" });
    expect(pagamentoAprovado(REF)).toBe(true);
    // ...mas o reembolso desfaz.
    registrarCompra({ ...compra, status: "reembolsado" });
    expect(pagamentoAprovado(REF)).toBe(false);
  });
});

describe("leitura do webhook da Kiwify", () => {
  afterEach(() => vi.unstubAllEnvs());

  const aviso = {
    order_id: "abc-123",
    order_status: "paid",
    webhook_event_type: "order_approved",
    payment_method: "pix",
    Product: { product_id: "p1", product_name: "Mês Inteiro: plano do salário" },
    Customer: { full_name: "Ana Souza", first_name: "Ana", email: "ANA@Exemplo.com.br", mobile: "+5511912345678" },
    Commissions: { charge_amount: 2990, currency: "BRL" },
    TrackingParameters: { sck: REF, src: null, utm_source: "meta", utm_campaign: null },
  };

  it("lê o pedido solto ou embrulhado em { order }", () => {
    for (const corpo of [aviso, { order: aviso }]) {
      expect(lerAviso(corpo)).toMatchObject({
        tipo: "aprovada",
        orderId: "abc-123",
        email: "ana@exemplo.com.br",
        nome: "Ana Souza",
        telefone: "11912345678",
        ref: REF,
        metodo: "pix",
        valorCentavos: 2990,
        origem: { utm_source: "meta" },
      });
    }
  });

  it("classifica os eventos", () => {
    const tipo = (webhook_event_type: string, order_status: string) =>
      lerAviso({ ...aviso, webhook_event_type, order_status })?.tipo;
    expect(tipo("pix_created", "waiting_payment")).toBe("pendente");
    expect(tipo("billet_created", "waiting_payment")).toBe("pendente");
    expect(tipo("order_rejected", "refused")).toBe("recusada");
    expect(tipo("order_refunded", "refunded")).toBe("reembolso");
    expect(tipo("chargeback", "chargedback")).toBe("reembolso");
    expect(tipo("subscription_renewed", "")).toBe("outro");
    expect(
      lerAviso({ id: "c1", email: "x@y.com", name: "X", phone: "11912345678", product_name: "Mês Inteiro", status: "abandoned", checkout_link: "https://pay.kiwify.com.br/a" })
        ?.tipo,
    ).toBe("abandono");
  });

  it("ignora aviso sem e-mail e normaliza o telefone", () => {
    expect(lerAviso({ order_id: "1", Customer: {} })).toBeNull();
    expect(telefoneDaKiwify("+55 (11) 91234-5678")).toBe("11912345678");
    expect(telefoneDaKiwify("1132345678")).toBe("1132345678");
    expect(telefoneDaKiwify("123")).toBe("");
  });

  it("reconhece o produto pelo nome, sem acento e sem diferenciar maiúscula", () => {
    expect(produtoConfere("MÊS INTEIRO - Plano")).toBe(true);
    // Os outros produtos da mesma conta Kiwify ficam de fora.
    expect(produtoConfere("Fôlego: plano de quitação de dívidas")).toBe(false);
    expect(produtoConfere("Devocionário do Meu Santo Protetor")).toBe(false);
    vi.stubEnv("KIWIFY_PRODUTO", "plano do salario|mes inteiro");
    expect(produtoConfere("Plano do Salário")).toBe(true);
  });

  it("confere a assinatura (HMAC-SHA1 do corpo) com qualquer um dos tokens", () => {
    const corpo = JSON.stringify(aviso);
    const assinatura = createHmac("sha1", "tok2").update(corpo).digest("hex");
    expect(assinaturaConfere(corpo, assinatura, ["tok1", "tok2"])).toBe(true);
    expect(assinaturaConfere(corpo + " ", assinatura, ["tok1", "tok2"])).toBe(false);
    expect(assinaturaConfere(corpo, null, ["tok1"])).toBe(false);
  });

  it("exige o segredo do endereço, com pelo menos 16 caracteres", () => {
    vi.stubEnv("KIWIFY_WEBHOOK_SEGREDO", "");
    expect(segredoConfere("")).toBe(false);
    vi.stubEnv("KIWIFY_WEBHOOK_SEGREDO", "curto");
    expect(segredoConfere("curto")).toBe(false);
    vi.stubEnv("KIWIFY_WEBHOOK_SEGREDO", "s3gr3do-bem-comprido");
    expect(segredoConfere("s3gr3do-bem-comprido")).toBe(true);
    expect(segredoConfere("s3gr3do-bem-comprid0")).toBe(false);
  });
});
