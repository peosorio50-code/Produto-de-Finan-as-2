import { describe, expect, it } from "vitest";
import { calendarioDoMes } from "@/lib/calendario";
import { diagnosticar, opcoesDeSimulacao, simularDia } from "@/lib/diagnostico";
import { EXEMPLO } from "@/lib/exemplo";
import { brl } from "@/lib/formato";
import { lembretesIcs } from "@/lib/lembretes";
import { leituraGratuita, narrativaPadrao } from "@/lib/narrativa-padrao";
import type { Respostas } from "@/lib/tipos";
import { sanitizarRespostas } from "@/lib/validacao";

function respostas(mudancas: Partial<Respostas> = {}): Respostas {
  return { ...structuredClone(EXEMPLO), ...mudancas };
}

const somaPotes = (d: ReturnType<typeof diagnosticar>) => d.potes.reduce((s, p) => s + p.valor, 0);

describe("diagnosticar", () => {
  it("soma o mês e calcula em que dia o dinheiro acaba", () => {
    const d = diagnosticar(respostas());
    expect(d.gastosFixos).toBe(950 + 290 + 220 + 150 + 110);
    expect(d.gastosDiaADia).toBe(750 + 420 + 280 + 150);
    expect(d.parcelasMes).toBe(380);
    expect(d.sobraMes).toBe(3200 - 1720 - 1600 - 380);
    // Sobram R$ 1.100 depois das contas e parcelas; o dia a dia gasta R$ 53,33 por dia.
    expect(d.diaPelasContas).toBe(20);
    expect(d.diaQueAcaba).toBe(20);
    expect(d.gastoInvisivel).toBe(0);
    expect(d.comprometimento).toBeCloseTo((1720 + 380) / 3200);
  });

  it("estima o gasto invisível quando o dinheiro acaba antes do que as contas preveem", () => {
    const r = respostas({
      quandoAcaba: "metade",
      gastos: { ...EXEMPLO.gastos, comer_fora: 150, compras_lazer: 100 },
    });
    const d = diagnosticar(r);
    const disponivel = 3200 - 1720 - 380;
    expect(d.diaPelasContas).toBe(28);
    // O que sai a mais até a metade do mês: R$ 1.100 − R$ 1.150 × 15/30.
    expect(d.gastoInvisivel).toBe(Math.floor((disponivel - (1150 * 15) / 30) / 10) * 10);
    expect(d.diaQueAcaba).toBe(15);
    expect(d.sobraMes).toBeLessThan(0);
    expect(d.sinais.temGastoInvisivel).toBe(true);
    expect(d.orcamento.some((l) => l.categoria === "invisivel")).toBe(true);
  });

  it("quem chega ao fim do mês no limite, mas teria sobra pelas contas, também tem gasto invisível", () => {
    const d = diagnosticar(respostas({ rendaMensal: 4500, quandoAcaba: "chega_justo" }));
    expect(d.sobraInformada).toBe(800);
    expect(d.gastoInvisivel).toBe(800);
    expect(d.sobraMes).toBe(0);
    expect(d.diaQueAcaba).toBeNull();
  });

  it("aponta quando o que a pessoa contou e as contas dela não batem", () => {
    const d = diagnosticar(respostas({ quandoAcaba: "sobra", comoFecha: [] }));
    expect(d.contasNaoBatem).toBe(true);
    expect(d.gastoInvisivel).toBe(0);
    expect(diagnosticar(respostas()).contasNaoBatem).toBe(false);
  });

  it("quando o plano fecha, os quatro potes somam a renda e o dia a dia vira valor por semana", () => {
    const d = diagnosticar(respostas());
    expect(d.faltaComAjustes).toBe(0);
    expect(somaPotes(d)).toBe(d.renda);
    expect(d.diaComPlano).toBeNull();
    expect(d.livrePorSemana).toBe(Math.floor((d.diaADiaPlano * 7) / 30 / 5) * 5);
    expect(d.ajustesTotal).toBeGreaterThanOrEqual(-d.sobraMes);
  });

  it("começa os ajustes pelo que a pessoa apontou e nunca mexe na moradia", () => {
    const d = diagnosticar(respostas());
    const linha = (c: string) => d.orcamento.find((l) => l.categoria === c)!;
    expect(linha("comer_fora").ajuste).toBe(210);
    expect(linha("assinaturas").ajuste).toBe(50);
    expect(linha("moradia").ajuste).toBe(0);
    expect(linha("saude_educacao").ajuste).toBe(0);
    for (const l of d.orcamento) expect(l.meta).toBe(l.atual - l.ajuste);
  });

  it("quando nem os ajustes fecham o mês, mostra quanto falta e até que dia o plano leva", () => {
    const d = diagnosticar(respostas({ rendaMensal: 2400 }));
    expect(d.faltaComAjustes).toBeGreaterThan(0);
    expect(d.guardarPorMes).toBe(0);
    expect(somaPotes(d)).toBe(d.renda + d.faltaComAjustes);
    expect(d.diaComPlano).not.toBeNull();
    expect(d.diaComPlano!).toBeGreaterThanOrEqual(d.diaQueAcaba ?? 0);
    expect(d.em12Meses.plano).toBe(-d.faltaComAjustes * 12);
    expect(d.metasReserva.every((m) => m.meses === null)).toBe(true);
    expect(d.nivel).toBe(4);
  });

  it("não propõe guardar valor simbólico: abaixo de R$ 30 o futuro fica em zero", () => {
    const d = diagnosticar(respostas());
    // No exemplo os ajustes fecham o buraco de R$ 500 com R$ 10 de sobra.
    expect(d.ajustesTotal + d.sobraMes).toBe(10);
    expect(d.guardarPorMes).toBe(0);
    expect(d.folga).toBe(10);
  });

  it("quando depois dos ajustes falta só um trocado, ele sai do dia a dia e o plano fecha", () => {
    const r = respostas({ quandoAcaba: "metade", gastos: { ...EXEMPLO.gastos, comer_fora: 250, compras_lazer: 150 } });
    const d = diagnosticar(r);
    expect(d.faltaComAjustes).toBe(0);
    expect(d.diaComPlano).toBeNull();
    expect(d.potes.reduce((s, p) => s + p.valor, 0)).toBe(d.renda);
  });

  it("quem tem sobra guarda a meta e metade do que passa dela, e o resto fica de respiro", () => {
    const d = diagnosticar(respostas({ rendaMensal: 6000, quandoAcaba: "sobra", comoFecha: [], vazamentos: [] }));
    expect(d.sobraMes).toBe(2300);
    // Meta de 5% (R$ 300) + metade dos R$ 2.000 restantes.
    expect(d.guardarPorMes).toBe(1300);
    expect(d.folga).toBe(1000);
    expect(d.ajustesTotal).toBe(0);
    expect(somaPotes(d)).toBe(6000);
    expect(d.metasReserva[0].meses).toBe(1);
  });

  it("onde a pessoa diz que o dinheiro escapa sempre ganha meta, mesmo com o mês fechando", () => {
    const d = diagnosticar(respostas({ rendaMensal: 6000, quandoAcaba: "sobra", comoFecha: [], vazamentos: ["delivery"] }));
    const delivery = d.orcamento.find((l) => l.categoria === "comer_fora")!;
    expect(delivery.apontado).toBe(true);
    expect(delivery.ajuste).toBe(100);
  });

  it("dá nível baixo a quem está equilibrado e alto a quem fecha o mês no crédito", () => {
    const tranquilo = diagnosticar(
      respostas({ rendaMensal: 7000, quandoAcaba: "sobra", comoFecha: [], fatura: "inteira", reserva: "mais_1_mes" }),
    );
    expect(tranquilo.nivel).toBe(1);
    expect(diagnosticar(respostas()).nivel).toBe(3);
  });

  it("monta metas de reserva crescentes", () => {
    const d = diagnosticar(respostas({ rendaMensal: 5000 }));
    const valores = d.metasReserva.map((m) => m.valor);
    expect([...valores].sort((a, b) => a - b)).toEqual(valores);
    expect(d.metasReserva[0].meses).toBe(Math.ceil(valores[0] / d.guardarPorMes));
  });

  it("lista os vazamentos do dia a dia que mais pesam, com o custo no ano", () => {
    const d = diagnosticar(respostas());
    expect(d.vazamentos[0]).toMatchObject({ categoria: "comer_fora", porMes: 420, porAno: 5040, apontado: true });
    expect(d.vazamentos.some((v) => v.categoria === "mercado")).toBe(false);
  });
});

describe("simulador do resultado", () => {
  it("sem corte, repete o dia de hoje; com cortes, o dinheiro dura mais", () => {
    const d = diagnosticar(respostas());
    expect(simularDia(d, 0)).toBe(d.diaQueAcaba);
    const opcoes = opcoesDeSimulacao(d);
    expect(opcoes.map((o) => [o.id, o.corte])).toEqual([
      ["comer_fora", 210],
      ["compras_lazer", 140],
      ["assinaturas", 50],
    ]);
    const todas = opcoes.reduce((s, o) => s + o.corte, 0);
    // R$ 1.100 para o dia a dia, que passa a sair a R$ 40 por dia.
    expect(simularDia(d, todas)).toBe(27);
    expect(simularDia(d, 5000)).toBeNull();
  });

  it("com gasto invisível, parte do dia contado e oferece achar o que some", () => {
    const d = diagnosticar(respostas({ quandoAcaba: "metade", gastos: { ...EXEMPLO.gastos, comer_fora: 150, compras_lazer: 100 } }));
    expect(simularDia(d, 0)).toBe(15);
    expect(opcoesDeSimulacao(d)[0]).toMatchObject({ id: "invisivel", corte: d.gastoInvisivel / 2 });
    const metade = opcoesDeSimulacao(d)[0].corte;
    // O gasto invisível sai até o dia contado: cortá-lo rende mais que cortar o mesmo valor espalhado pelo mês.
    expect(simularDia(d, 0, metade)!).toBeGreaterThan(simularDia(d, metade)!);
    expect(simularDia(d, 0, metade)!).toBeGreaterThan(15);
  });
});

describe("narrativaPadrao e calendário", () => {
  it("escreve todas as partes do plano", () => {
    const r = respostas();
    const d = diagnosticar(r);
    const n = narrativaPadrao(r, d);
    expect(n.leitura.length).toBeGreaterThanOrEqual(2);
    expect(n.pontosCriticos).toHaveLength(3);
    expect(n.desafio30Dias).toHaveLength(4);
    expect(n.regrasDoMes.length).toBeGreaterThanOrEqual(3);
    expect(n.ajustes.map((a) => a.categoria)).toContain("Delivery e lanches");
    expect(n.mensagens.length).toBeGreaterThanOrEqual(1);
    expect(n.mensagens[0].titulo).toBe("Para combinar com quem mora com você");
    expect(n.leitura.join(" ")).toContain(`${brl(d.livrePorSemana)} por semana`);
  });

  it("funciona quando o mês não fecha nem com os ajustes", () => {
    const r = respostas({ rendaMensal: 2000, pessoasNaCasa: 1 });
    const n = narrativaPadrao(r, diagnosticar(r));
    expect(n.leitura.join(" ")).toContain("ainda faltam");
    expect(n.mensagens.length).toBeGreaterThanOrEqual(1);
  });

  it("o resultado gratuito dá o primeiro passo do perfil", () => {
    const r = respostas({ quandoAcaba: "metade", gastos: { ...EXEMPLO.gastos, comer_fora: 150, compras_lazer: 100 } });
    const leitura = leituraGratuita(r, diagnosticar(r));
    expect(leitura.primeiroPasso.titulo).toBe("Anote tudo por 14 dias");
    expect(leitura.pontosCriticos.length).toBeGreaterThanOrEqual(2);
  });

  it("o calendário segue o jeito como o dinheiro entra", () => {
    const r = respostas({ recebimento: "aos_poucos", tipoRenda: "variavel" });
    const momentos = calendarioDoMes(r, diagnosticar(r));
    expect(momentos[0].quando).toBe("A cada valor que entra");
    expect(momentos.map((m) => m.oQueFazer).join(" ")).toContain("conta de entrada");

    const apertado = respostas({ rendaMensal: 2400 });
    expect(calendarioDoMes(apertado, diagnosticar(apertado)).some((m) => m.quando === "Enquanto o mês não fecha")).toBe(true);
  });
});

describe("lembretes do plano", () => {
  it("gera um .ics com o valor da semana, a conferência e o fechamento do mês", () => {
    const d = diagnosticar(respostas());
    // Quinta-feira, 19 de novembro de 2026.
    const ics = lembretesIcs(d, new Date(2026, 10, 19, 12));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain("DTSTART:20261123T080000"); // próxima segunda
    expect(ics).toContain("DTSTART:20261122T190000"); // próximo domingo
    expect(ics).toContain("DTSTART:20261128T100000"); // último sábado de novembro
    expect(ics).toContain("RRULE:FREQ=MONTHLY;BYDAY=-1SA");
    expect(ics.replace(/\r\n /g, "")).toContain(`Passar ${brl(d.livrePorSemana)} para o dia a dia`);
    for (const linha of ics.split("\r\n")) expect(new TextEncoder().encode(linha).length).toBeLessThanOrEqual(75);
  });
});

describe("validação das respostas", () => {
  it("normaliza texto livre, listas e valores", () => {
    const bruto = respostas({
      nome: "  Ana <script>  Souza  ",
      vazamentos: ["delivery", "assinaturas", "delivery"],
      comoFecha: ["familia", "cartao"],
      rendaMensal: 3200.6,
    });
    const r = sanitizarRespostas(bruto)!;
    expect(r.nome).toBe("Ana script Souza");
    expect(r.vazamentos).toEqual(["assinaturas", "delivery"]);
    expect(r.comoFecha).toEqual(["cartao", "familia"]);
    expect(r.rendaMensal).toBe(3201);
    // Quem diz que sobra dinheiro não fecha o mês de jeito nenhum.
    expect(sanitizarRespostas(respostas({ quandoAcaba: "sobra", comoFecha: ["cartao"] }))!.comoFecha).toEqual([]);
  });

  it("recusa respostas incompletas ou fora dos limites", () => {
    expect(sanitizarRespostas(null)).toBeNull();
    expect(sanitizarRespostas({})).toBeNull();
    expect(sanitizarRespostas(respostas({ rendaMensal: 0 }))).toBeNull();
    expect(sanitizarRespostas({ ...respostas(), objetivo: "ficar_rico" })).toBeNull();
    expect(sanitizarRespostas({ ...respostas(), vazamentos: ["cassino"] })).toBeNull();
    const { parcelas: _p, ...semParcelas } = respostas();
    expect(sanitizarRespostas(semParcelas)).toBeNull();
  });
});
