import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { diagnosticar } from "@/lib/diagnostico";
import { EXEMPLO } from "@/lib/exemplo";
import { narrativaPadrao } from "@/lib/narrativa-padrao";

/**
 * Testa a chamada à IA contra um servidor falso que imita a API da Anthropic
 * (resposta em streaming). Não gasta créditos nem precisa de chave.
 */

interface Pedido {
  cabecalhos: IncomingMessage["headers"];
  corpo: Record<string, any>;
}

let servidor: Server;
let pedidos: Pedido[] = [];
let responder: (corpo: Record<string, any>) => { status: number; texto?: string; motivo?: string };

function eventos(texto: string, motivo: string): string {
  const linhas: [string, object][] = [
    [
      "message_start",
      {
        type: "message_start",
        message: {
          id: "msg_teste",
          type: "message",
          role: "assistant",
          model: "claude-opus-5-5",
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 1 },
        },
      },
    ],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
    ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: texto } }],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    [
      "message_delta",
      { type: "message_delta", delta: { stop_reason: motivo, stop_sequence: null }, usage: { output_tokens: 50 } },
    ],
    ["message_stop", { type: "message_stop" }],
  ];
  return linhas.map(([evento, dados]) => `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`).join("");
}

beforeAll(async () => {
  servidor = createServer((req, res) => {
    let bruto = "";
    req.on("data", (parte) => (bruto += parte));
    req.on("end", () => {
      const corpo = JSON.parse(bruto);
      pedidos.push({ cabecalhos: req.headers, corpo });
      const r = responder(corpo);
      if (r.status !== 200) {
        res.writeHead(r.status, { "content-type": "application/json" });
        res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "falha simulada" } }));
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(eventos(r.texto ?? "", r.motivo ?? "end_turn"));
    });
  });
  await new Promise<void>((pronto) => servidor.listen(0, "127.0.0.1", pronto));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  process.env.ANTHROPIC_API_KEY = "chave-de-teste";
});

afterAll(() => {
  servidor.close();
});

const diag = diagnosticar(EXEMPLO);
const padrao = narrativaPadrao(EXEMPLO, diag);

function respostaDaIA() {
  return {
    leitura: ["Primeiro parágrafo da IA.", "Segundo parágrafo da IA."],
    pontosCriticos: [
      { titulo: "Ponto 1", explicacao: "Explicação 1" },
      { titulo: "Ponto 2", explicacao: "Explicação 2" },
      { titulo: "Ponto 3", explicacao: "Explicação 3" },
    ],
    regrasDoMes: [
      { regra: "Regra 1", porque: "Porque 1" },
      { regra: "Regra sem motivo", porque: "   " },
    ],
    ajustes: [{ categoria: "Delivery e lanches", sugestao: "Hoje: R$ 420 por mês. Meta: R$ 210." }],
    primeiros7Dias: ["Ação 1", "Ação 2", "Ação 3"],
    desafio30Dias: [1, 2, 3, 4].map((n) => ({ semana: `Semana ${n}`, foco: `Foco ${n}`, acoes: ["A", "B"] })),
    // A IA esqueceu as mensagens: entram as da versão padrão.
    mensagens: [],
    proximos90Dias: ["Marco 1", "Marco 2", "Marco 3"],
    recado: "Recado da IA.",
  };
}

describe("escreverNarrativa", () => {
  it("envia o pedido no formato esperado e devolve o texto da IA", async () => {
    const { escreverNarrativa } = await import("@/lib/ia");
    pedidos = [];
    responder = () => ({ status: 200, texto: JSON.stringify(respostaDaIA()) });

    const narrativa = await escreverNarrativa(EXEMPLO, diag, padrao);

    expect(pedidos).toHaveLength(1);
    const { corpo, cabecalhos } = pedidos[0];
    expect(corpo.model).toBe("claude-opus-5-5");
    expect(corpo.stream).toBe(true);
    expect(corpo.fallbacks).toBe("default");
    expect(String(cabecalhos["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(corpo.output_config.effort).toBe("medium");
    expect(corpo.output_config.format.type).toBe("json_schema");
    expect(Object.keys(corpo.output_config.format.schema.properties)).toEqual(
      expect.arrayContaining(["regrasDoMes", "ajustes", "desafio30Dias", "mensagens"]),
    );
    expect(corpo.thinking).toBeUndefined();
    expect(corpo.system).toContain("plano de organização do mês");
    expect(corpo.system).toContain("quiz");
    const enviado = JSON.parse(corpo.messages[0].content);
    expect(enviado.raioX.rendaMensal).toBe(diag.renda);
    expect(enviado.raioX.diaEmQueODinheiroAcaba).toBe(diag.diaQueAcaba);
    expect(enviado.plano.livrePorSemana).toBe(diag.livrePorSemana);
    expect(enviado.orcamento).toHaveLength(diag.orcamento.length);
    // O contexto do quiz chega à IA; o contato (e-mail e telefone) não.
    expect(enviado.resultadoDoQuiz.perfil).toBe("Fim de mês no cartão");
    expect(enviado.cliente.ondeODinheiroEscapa).toContain("Delivery e lanches");
    expect(enviado.cliente.comoSeSente).toBeTruthy();
    expect(corpo.messages[0].content).not.toMatch(/@|whatsapp|telefone/i);

    expect(narrativa).not.toBeNull();
    expect(narrativa!.leitura[0]).toBe("Primeiro parágrafo da IA.");
    // Itens incompletos saem; listas vazias voltam da versão padrão.
    expect(narrativa!.regrasDoMes).toEqual([{ regra: "Regra 1", porque: "Porque 1" }]);
    expect(narrativa!.mensagens).toEqual(padrao.mensagens);
    expect(narrativa!.recado).toBe("Recado da IA.");
  });

  it("devolve null quando a IA recusa, para o plano usar a versão padrão", async () => {
    const { escreverNarrativa } = await import("@/lib/ia");
    responder = () => ({ status: 200, texto: "", motivo: "refusal" });
    expect(await escreverNarrativa(EXEMPLO, diag, padrao)).toBeNull();
  });

  it("devolve null quando a resposta não segue o formato", async () => {
    const { escreverNarrativa } = await import("@/lib/ia");
    responder = () => ({ status: 200, texto: JSON.stringify({ leitura: "texto solto" }) });
    expect(await escreverNarrativa(EXEMPLO, diag, padrao)).toBeNull();
  });

  it("devolve null quando a API está fora do ar", async () => {
    const { escreverNarrativa } = await import("@/lib/ia");
    responder = () => ({ status: 500 });
    expect(await escreverNarrativa(EXEMPLO, diag, padrao)).toBeNull();
  }, 20000);
});
