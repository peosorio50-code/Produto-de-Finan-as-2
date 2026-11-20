/**
 * Recuperação de venda por e-mail e resultado guardado no servidor, chamando
 * as rotas como o navegador e o cron chamariam. A Resend é simulada.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, fecharBanco } from "@/lib/db";
import { linkDescadastroDireto } from "@/lib/descadastro";
import { EXEMPLO } from "@/lib/exemplo";
import { candidatos, rodarRecuperacao } from "@/lib/recuperacao";
import { registrarCompra } from "@/lib/registros";

vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (tarefa: () => unknown) => void tarefa(),
}));

const { POST: lead } = await import("@/app/api/lead/route");
const { GET: resultado } = await import("@/app/api/resultado/route");
const { POST: sair } = await import("@/app/api/sair/route");
const { POST: recuperar } = await import("@/app/api/tarefas/recuperar/route");

const SITE = "https://mesinteiro.folegofinanceiro.shop";
const SEGREDO = "segredo-das-tarefas-123";
const CONTATO = { nome: "Ana Souza", email: "ana@exemplo.com.br", telefone: "11912345678" };
const HORA = 60 * 60 * 1000;

const post = (url: string, corpo?: unknown, cabecalhos: Record<string, string> = {}) =>
  new NextRequest(url, {
    method: "POST",
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    headers: { "content-type": "application/json", ...cabecalhos },
  });

let enviados: { to: string[]; subject: string; text: string; headers?: Record<string, string> }[] = [];

beforeEach(() => {
  vi.stubEnv("MESINTEIRO_DB", ":memory:");
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("RESEND_API_KEY", "re_teste");
  vi.stubEnv("EMAIL_REMETENTE", "Mês Inteiro <plano@folegofinanceiro.shop>");
  vi.stubEnv("TAREFAS_SEGREDO", SEGREDO);
  vi.stubEnv("LEADS_WEBHOOK_URL", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  enviados = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    if (url === "https://api.resend.com/emails") enviados.push(JSON.parse(String(init.body)));
    return new Response("{}", { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fecharBanco();
});

async function terminarQuiz(contato = CONTATO) {
  const r = await lead(post(`${SITE}/api/lead`, { evento: "quiz_concluido", contato, respostas: EXEMPLO, origem: {} }));
  expect(r.status).toBe(200);
  return (db().prepare("SELECT token FROM resultados WHERE email = ? ORDER BY criado_em DESC").get(contato.email) as {
    token: string;
  }).token;
}

const rodar = (horasDepois: number) => rodarRecuperacao(SITE, { agoraMs: Date.now() + horasDepois * HORA });

describe("resultado guardado", () => {
  it("guarda as respostas no fim do quiz e abre pelo link secreto", async () => {
    const token = await terminarQuiz();
    expect(token).toMatch(/^[A-Za-z0-9_-]{24}$/);
    const r = await resultado(new NextRequest(`${SITE}/api/resultado?r=${token}`));
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.respostas.rendaMensal).toBe(EXEMPLO.rendaMensal);
    expect(corpo.contato.email).toBe(CONTATO.email);
    expect((await resultado(new NextRequest(`${SITE}/api/resultado?r=nao-existe-de-jeito-nenhum`))).status).toBe(404);
    expect((await resultado(new NextRequest(`${SITE}/api/resultado?r=../../etc`))).status).toBe(404);
  });
});

describe("sequência de e-mails", () => {
  it("manda as três etapas, uma por vez, nos prazos certos", async () => {
    const token = await terminarQuiz();

    expect((await rodar(0.5)).enviados).toBe(0);

    expect(await rodar(2)).toMatchObject({ enviados: 1, porEtapa: { resultado: 1 } });
    expect(enviados[0].to).toEqual([CONTATO.email]);
    expect(enviados[0].subject).toBe("Ana, aqui está o resultado do seu quiz");
    expect(enviados[0].text).toContain(`${SITE}/resultado?r=${token}&utm_source=email`);
    expect(enviados[0].text).toContain("Fim de mês no cartão");
    expect(enviados[0].text).toContain(`${SITE}/sair?e=`);
    expect(enviados[0].headers?.["List-Unsubscribe"]).toBe(`<${linkDescadastroDireto(SITE, CONTATO.email)}>`);
    expect(enviados[0].headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

    // Rodar de novo não repete nada.
    expect((await rodar(3)).enviados).toBe(0);

    expect(await rodar(25)).toMatchObject({ enviados: 1, porEtapa: { plano: 1 } });
    expect(enviados[1].text).toContain("quatro potes");
    expect(await rodar(73)).toMatchObject({ enviados: 1, porEtapa: { ultimo: 1 } });
    expect(enviados[2].subject).toBe("Seu resultado continua guardado");
    expect((await rodar(200)).enviados).toBe(0);
    expect(enviados).toHaveLength(3);
  });

  it("para quando a pessoa compra", async () => {
    await terminarQuiz();
    await rodar(2);
    registrarCompra({
      orderId: "k-1",
      ref: null,
      email: CONTATO.email,
      nome: "Ana",
      status: "pago",
      metodo: "pix",
      valorCentavos: 2990,
      produto: "Mês Inteiro",
    });
    expect((await rodar(25)).enviados).toBe(0);
    expect(enviados).toHaveLength(1);
  });

  it("não manda e-mail velho se o cron ficou parado", async () => {
    await terminarQuiz();
    db().prepare("UPDATE resultados SET criado_em = ?").run(new Date(Date.now() - 10 * 24 * HORA).toISOString());
    expect(candidatos("resultado")).toHaveLength(0);
    expect((await rodar(0)).enviados).toBe(0);
  });

  it("sem Resend ou sem segredo, não manda nada", async () => {
    await terminarQuiz();
    vi.stubEnv("TAREFAS_SEGREDO", "");
    expect(await rodar(2)).toMatchObject({ configurada: false, enviados: 0 });
    expect(enviados).toHaveLength(0);
  });
});

describe("descadastro", () => {
  it("só tira da lista com o link assinado, e quem saiu não recebe mais", async () => {
    await terminarQuiz();
    const direto = new URL(linkDescadastroDireto(SITE, CONTATO.email)!);
    const falso = post(`${SITE}/api/sair?e=${encodeURIComponent(CONTATO.email)}&t=${"0".repeat(32)}`);
    expect((await sair(falso)).status).toBe(400);

    const r = await sair(post(direto.toString(), undefined, { accept: "text/html" }));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe(`${SITE}/sair?feito=1`);
    expect(db().prepare("SELECT COUNT(*) n FROM descadastros").get()).toMatchObject({ n: 1 });
    expect((await rodar(2)).enviados).toBe(0);
  });
});

describe("rota do cron", () => {
  const chamar = (autorizacao?: string) =>
    recuperar(post(`${SITE}/api/tarefas/recuperar`, undefined, autorizacao ? { authorization: autorizacao } : {}));

  it("exige o segredo e responde quanto mandou", async () => {
    expect((await chamar()).status).toBe(401);
    expect((await chamar("Bearer errado-errado-errado")).status).toBe(401);
    const r = await chamar(`Bearer ${SEGREDO}`);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, enviados: 0 });
  });

  it("avisa quando o e-mail não está configurado", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await chamar(`Bearer ${SEGREDO}`)).status).toBe(503);
  });
});
