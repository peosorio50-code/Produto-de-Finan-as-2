import { describe, expect, it } from "vitest";
import { telefoneValido } from "@/lib/contato";
import { diagnosticar } from "@/lib/diagnostico";
import { EXEMPLO } from "@/lib/exemplo";
import { brl, mascaraTelefone } from "@/lib/formato";
import { resumoParaServidor } from "@/lib/resumo";
import { itensDoPlano, perfilDaSituacao, primeiroPasso } from "@/lib/perfil";
import type { Respostas } from "@/lib/tipos";
import { sanitizarContato, sanitizarOrigem, sanitizarRespostas } from "@/lib/validacao";

function respostas(mudancas: Partial<Respostas> = {}): Respostas {
  return { ...structuredClone(EXEMPLO), ...mudancas };
}

const perfil = (r: Respostas) => perfilDaSituacao(r, diagnosticar(r));

const CONTATO = { nome: "Ana Souza", email: "ana@exemplo.com.br", telefone: "11912345678" };

describe("contato", () => {
  it("aceita celular e fixo com DDD e recusa o resto", () => {
    expect(telefoneValido("11912345678")).toBe(true);
    expect(telefoneValido("1133334444")).toBe(true);
    expect(telefoneValido("11812345678")).toBe(false); // celular sem o 9
    expect(telefoneValido("1193334444")).toBe(false); // fixo começando com 9
    expect(telefoneValido("01912345678")).toBe(false); // DDD inválido
    expect(telefoneValido("912345678")).toBe(false); // sem DDD
  });

  it("formata o telefone enquanto a pessoa digita", () => {
    expect(mascaraTelefone("1")).toBe("(1");
    expect(mascaraTelefone("119")).toBe("(11) 9");
    expect(mascaraTelefone("1133334444")).toBe("(11) 3333-4444");
    expect(mascaraTelefone("11912345678")).toBe("(11) 91234-5678");
  });

  it("normaliza o contato no servidor", () => {
    const c = sanitizarContato({ nome: "  Ana   <b>Souza</b> ", email: " ANA@Exemplo.com.BR ", telefone: "+55 (11) 91234-5678" });
    expect(c).toEqual({ nome: "Ana bSouzab", email: "ana@exemplo.com.br", telefone: "11912345678" });
    expect(sanitizarContato({ ...CONTATO, email: "ana@" })).toBeNull();
    expect(sanitizarContato({ ...CONTATO, telefone: "123" })).toBeNull();
    expect(sanitizarContato({ ...CONTATO, nome: " " })).toBeNull();
    expect(sanitizarContato(null)).toBeNull();
  });

  it("guarda só os parâmetros de campanha conhecidos", () => {
    expect(sanitizarOrigem({ utm_source: " meta ", utm_campaign: "quiz<1>", outro: "x", gclid: 5 })).toEqual({
      utm_source: "meta",
      utm_campaign: "quiz1",
    });
    expect(sanitizarOrigem("lixo")).toEqual({});
  });

  it("as respostas exigem as perguntas do quiz do salário", () => {
    const { quandoAcaba: _q, ...semQuando } = respostas();
    expect(sanitizarRespostas(semQuando)).toBeNull();
    expect(sanitizarRespostas({ ...respostas(), fatura: "talvez" })).toBeNull();
    expect(sanitizarRespostas(respostas())?.quandoAcaba).toBe("ultima_semana");
  });
});

describe("tipo de mês", () => {
  it("dá nome ao mês a partir dos números e das respostas", () => {
    expect(perfil(respostas()).id).toBe("fim_de_mes_no_cartao");

    const comDono = respostas({ parcelas: { cartao: 600, emprestimos: 300 }, gastos: { ...EXEMPLO.gastos, moradia: 1300 } });
    expect(perfil(comDono).id).toBe("salario_com_dono");

    const some = respostas({ quandoAcaba: "metade", gastos: { ...EXEMPLO.gastos, comer_fora: 150, compras_lazer: 100 } });
    const p = perfil(some);
    expect(p.id).toBe("dinheiro_que_some");
    expect(p.resumo).toContain("acaba lá pela metade do mês");

    expect(perfil(respostas({ comoFecha: ["familia", "aperto"] })).id).toBe("no_vermelho");

    const base = { quandoAcaba: "sobra" as const, comoFecha: [], rendaMensal: 4400 };
    expect(perfil(respostas(base)).id).toBe("vazamento_miudo");

    const contido = { ...EXEMPLO.gastos, comer_fora: 120, compras_lazer: 100, assinaturas: 40 };
    expect(perfil(respostas({ ...base, gastos: contido, tipoRenda: "variavel" })).id).toBe("montanha_russa");
    expect(perfil(respostas({ ...base, gastos: contido })).id).toBe("sem_colchao");
    expect(perfil(respostas({ ...base, gastos: contido, reserva: "mais_1_mes" })).id).toBe("no_azul_sem_rumo");
  });

  it("o primeiro passo segue o tipo de mês", () => {
    const r = respostas();
    expect(primeiroPasso(r, diagnosticar(r)).titulo).toBe("Tire o cartão do dia a dia");
  });

  it("monta a oferta com o que a pessoa respondeu", () => {
    const r = respostas({ objetivo: "reserva", pessoasNaCasa: 1 });
    const d = diagnosticar(r);
    const itens = itensDoPlano(r, d);
    expect(itens[0]).toContain(brl(3200));
    expect(itens.some((i) => i.includes("reserva chega"))).toBe(true);
    expect(itens.some((i) => i.includes("delivery e lanches"))).toBe(true);
    expect(itens.some((i) => i.includes("cancelar"))).toBe(true);
  });
});

describe("resumo que vai para o servidor", () => {
  it("leva o perfil, o dia em que o dinheiro acaba e os vazamentos, sem contato", () => {
    const r = respostas();
    const resumo = resumoParaServidor(r, diagnosticar(r));
    expect(resumo.perfil).toBe("Fim de mês no cartão");
    expect(resumo.diaQueAcaba).toBe(20);
    expect(resumo.vazamentos).toContain("Delivery e lanches");
    expect(resumo.sinaisDeDivida).toBe(true);
    expect(JSON.stringify(resumo)).not.toContain(CONTATO.email);
  });
});
