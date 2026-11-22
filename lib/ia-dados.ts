/**
 * Parte da IA que roda no navegador (o site é estático, no Cloudflare Pages):
 * - dadosParaIA: o JSON que vai para o servidor no checkout. Quando o
 *   pagamento cai, o servidor (mesinteiro.py) manda esse JSON para o Claude;
 * - conciliar: junta o texto que a IA escreveu com a versão padrão. O que a IA
 *   não mandou (ou o servidor derrubou na conferência) sai do texto padrão.
 * O prompt (SISTEMA) e o esquema da resposta ficam no servidor.
 */
import { perfilDaSituacao } from "./perfil";
import {
  ROTULOS_COMO_FECHA,
  ROTULOS_CONTROLE,
  ROTULOS_FATURA,
  ROTULOS_OBJETIVO,
  ROTULOS_QUANDO_ACABA,
  ROTULOS_RECEBIMENTO,
  ROTULOS_RENDA,
  ROTULOS_RESERVA,
  ROTULOS_SENTIMENTO,
  ROTULOS_VAZAMENTO,
} from "./rotulos";
import type { Diagnostico, Narrativa, Respostas } from "./tipos";

/** O que o servidor devolve da IA (os mesmos campos da Narrativa; qualquer um pode vir vazio). */
export type NarrativaIA = Partial<Narrativa>;

export function dadosParaIA(r: Respostas, d: Diagnostico) {
  const perfil = perfilDaSituacao(r, d);
  return {
    resultadoDoQuiz: { perfil: perfil.titulo, resumo: perfil.resumo },
    cliente: {
      nome: r.nome,
      pessoasNaCasa: r.pessoasNaCasa,
      renda: ROTULOS_RENDA[r.tipoRenda],
      comoODinheiroEntra: ROTULOS_RECEBIMENTO[r.recebimento],
      quandoODinheiroAcaba: ROTULOS_QUANDO_ACABA[r.quandoAcaba],
      comoFechaOMes: r.comoFecha.map((c) => ROTULOS_COMO_FECHA[c]),
      ondeODinheiroEscapa: r.vazamentos.map((v) => ROTULOS_VAZAMENTO[v]),
      faturaDoCartao: ROTULOS_FATURA[r.fatura],
      controleDosGastos: ROTULOS_CONTROLE[r.controle],
      reserva: ROTULOS_RESERVA[r.reserva],
      comoSeSente: ROTULOS_SENTIMENTO[r.sentimento],
      objetivo: ROTULOS_OBJETIVO[r.objetivo],
    },
    raioX: {
      nivel: d.nivel,
      nivelRotulo: d.nivelRotulo,
      rendaMensal: d.renda,
      contasFixas: d.gastosFixos,
      parcelas: d.parcelasMes,
      diaADia: d.gastosDiaADia,
      gastoInvisivel: d.gastoInvisivel,
      totalDoMes: d.totalMes,
      sobraDoMes: d.sobraMes,
      parteDoSalarioQueJaChegaComDestino: `${Math.round(d.comprometimento * 100)}%`,
      diaEmQueODinheiroAcaba: d.diaQueAcaba,
      diaPelasContasInformadas: d.diaPelasContas,
      contasNaoBatem: d.contasNaoBatem,
      sinais: d.sinais,
    },
    plano: {
      potes: Object.fromEntries(d.potes.map((p) => [p.id, p.valor])),
      livrePorSemana: d.livrePorSemana,
      guardarPorMes: d.guardarPorMes,
      ajustesPorMes: d.ajustesTotal,
      faltaComAjustes: d.faltaComAjustes,
      diaEmQueODinheiroAcabaComOPlano: d.faltaComAjustes > 0 ? d.diaComPlano : "dura o mês inteiro",
      metasDeReserva: d.metasReserva.map((m) => ({
        meta: m.rotulo,
        valor: m.valor,
        mesesNoRitmoDoPlano: m.meses !== null && m.meses <= 60 ? m.meses : null,
      })),
      em12Meses: d.em12Meses,
    },
    vazamentos: d.vazamentos.map((v) => ({ grupo: v.rotulo, porMes: v.porMes, porAno: v.porAno, apontadoPelaPessoa: v.apontado })),
    orcamento: d.orcamento.map((l) => ({
      grupo: l.rotulo,
      tipo: l.grupo === "fixo" ? "conta fixa" : "dia a dia",
      gastoAtual: l.atual,
      parteDaRenda: `${Math.round(l.parteDaRenda * 100)}%`,
      acimaDoComum: l.acima,
      apontadoPelaPessoa: l.apontado,
      ajuste: l.ajuste,
      meta: l.meta,
    })),
  };
}

const LIMITE_TEXTO = 1600;

const aparar = (texto: unknown): string => (typeof texto === "string" ? texto.trim().slice(0, LIMITE_TEXTO) : "");

/** Corta excessos e completa o que faltar com a versão padrão. Sem texto da IA, devolve a padrão. */
export function conciliar(ia: NarrativaIA | null | undefined, padrao: Narrativa): Narrativa {
  if (!ia || typeof ia !== "object") return padrao;
  const lista = (itens: unknown, reserva: string[], max: number) => {
    const limpos = Array.isArray(itens) ? itens.map(aparar).filter(Boolean).slice(0, max) : [];
    return limpos.length > 0 ? limpos : reserva;
  };
  const pares = <T extends Record<string, string>>(itens: unknown, reserva: T[], max: number): T[] => {
    if (!Array.isArray(itens) || reserva.length === 0) return reserva;
    const chaves = Object.keys(reserva[0]);
    const limpos = itens
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => Object.fromEntries(chaves.map((k) => [k, aparar(item[k])])) as T)
      .filter((item) => Object.values(item).every(Boolean))
      .slice(0, max);
    return limpos.length > 0 ? limpos : reserva;
  };
  const semanas = Array.isArray(ia.desafio30Dias)
    ? ia.desafio30Dias
        .slice(0, 4)
        .map((s, i) => ({
          semana: aparar(s?.semana) || `Semana ${i + 1}`,
          foco: aparar(s?.foco),
          acoes: Array.isArray(s?.acoes) ? s.acoes.map(aparar).filter(Boolean).slice(0, 5) : [],
        }))
        .filter((s) => s.foco && s.acoes.length > 0)
    : [];

  return {
    leitura: lista(ia.leitura, padrao.leitura, 4),
    pontosCriticos: pares(ia.pontosCriticos, padrao.pontosCriticos, 4),
    regrasDoMes: pares(ia.regrasDoMes, padrao.regrasDoMes, 6),
    ajustes: padrao.ajustes.length === 0 ? [] : pares(ia.ajustes, padrao.ajustes, 10),
    primeiros7Dias: lista(ia.primeiros7Dias, padrao.primeiros7Dias, 6),
    desafio30Dias: semanas.length > 0 ? semanas : padrao.desafio30Dias,
    mensagens: pares(ia.mensagens, padrao.mensagens, 3),
    proximos90Dias: lista(ia.proximos90Dias, padrao.proximos90Dias, 6),
    recado: aparar(ia.recado) || padrao.recado,
  };
}
