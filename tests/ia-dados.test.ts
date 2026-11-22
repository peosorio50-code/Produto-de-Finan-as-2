import { describe, expect, it } from "vitest";
import { diagnosticar } from "@/lib/diagnostico";
import { EXEMPLO } from "@/lib/exemplo";
import { conciliar, dadosParaIA } from "@/lib/ia-dados";
import { narrativaPadrao } from "@/lib/narrativa-padrao";
import { resumoParaServidor } from "@/lib/resumo";

const d = diagnosticar(EXEMPLO);
const padrao = narrativaPadrao(EXEMPLO, d);

describe("dados que vão para a IA", () => {
  it("leva os números já calculados, sem contato", () => {
    const dados = dadosParaIA(EXEMPLO, d);
    expect(dados.raioX.rendaMensal).toBe(d.renda);
    expect(dados.plano.livrePorSemana).toBe(d.livrePorSemana);
    expect(dados.orcamento.length).toBe(d.orcamento.length);
    const texto = JSON.stringify(dados);
    expect(texto).not.toMatch(/@|telefone|email/i);
  });
});

describe("conciliar o texto da IA com o padrão", () => {
  it("sem texto da IA, usa o padrão inteiro", () => {
    expect(conciliar(null, padrao)).toEqual(padrao);
    expect(conciliar(undefined, padrao)).toEqual(padrao);
  });

  it("completa o que a IA não mandou e corta excessos", () => {
    const longo = "x".repeat(5000);
    const r = conciliar({ leitura: [longo, "  ", "Segundo."], recado: "" }, padrao);
    expect(r.leitura).toHaveLength(2);
    expect(r.leitura[0]).toHaveLength(1600);
    expect(r.recado).toBe(padrao.recado);
    expect(r.regrasDoMes).toEqual(padrao.regrasDoMes);
    expect(r.desafio30Dias).toEqual(padrao.desafio30Dias);
  });

  it("descarta itens incompletos ou de tipo errado", () => {
    const r = conciliar(
      {
        pontosCriticos: [{ titulo: "Só título", explicacao: "" }, { titulo: "Ok", explicacao: "Tudo certo." }],
        // @ts-expect-error: o servidor pode mandar lixo; o site não quebra
        mensagens: "não é lista",
        desafio30Dias: [{ semana: "", foco: "Foco", acoes: ["Uma"] }, { semana: "S2", foco: "", acoes: ["x"] }],
      },
      padrao,
    );
    expect(r.pontosCriticos).toEqual([{ titulo: "Ok", explicacao: "Tudo certo." }]);
    expect(r.mensagens).toEqual(padrao.mensagens);
    expect(r.desafio30Dias).toEqual([{ semana: "Semana 1", foco: "Foco", acoes: ["Uma"] }]);
  });
});

describe("resumo para o servidor", () => {
  it("tem os números dos e-mails", () => {
    const r = resumoParaServidor(EXEMPLO, d, true);
    expect(r.renda).toBe(d.renda);
    expect(r.primeiroPasso.titulo).toBeTruthy();
    expect(r.desafio).toHaveLength(4);
    expect(resumoParaServidor(EXEMPLO, d).desafio).toBeUndefined();
  });
});
