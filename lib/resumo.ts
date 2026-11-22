/**
 * Resumo do resultado do quiz que vai para o servidor junto com o lead e o
 * pedido. É dele que o servidor tira os números dos e-mails (recuperação e
 * acompanhamento) e a planilha de leads: o servidor não refaz as contas.
 */
import { narrativaPadrao } from "./narrativa-padrao";
import { perfilDaSituacao, primeiroPasso } from "./perfil";
import {
  ROTULOS_COMO_FECHA,
  ROTULOS_OBJETIVO,
  ROTULOS_QUANDO_ACABA,
  ROTULOS_RESERVA,
  ROTULOS_SENTIMENTO,
  ROTULOS_VAZAMENTO,
} from "./rotulos";
import type { Diagnostico, Respostas } from "./tipos";

export interface ResumoServidor {
  perfil: string;
  perfilId: string;
  resumoPerfil: string;
  primeiroPasso: { titulo: string; texto: string };
  nivel: number;
  nivelRotulo: string;
  renda: number;
  contasFixas: number;
  diaADia: number;
  parcelas: number;
  /** 0 quando o gasto que some não é um sinal do caso. */
  gastoInvisivel: number;
  sobraMes: number;
  comprometimento: number;
  diaQueAcaba: number | null;
  diaComPlano: number | null;
  ajustesTotal: number;
  livrePorSemana: number;
  guardarPorMes: number;
  maiorVazamento: { rotulo: string; porMes: number; porAno: number } | null;
  /** Sinais para a oferta da página de obrigado (o plano de dívidas só aparece para quem tem sinal de dívida). */
  sinaisDeDivida: boolean;
  quandoAcaba: string;
  comoFecha: string[];
  vazamentos: string[];
  reserva: string;
  objetivo: string;
  sentimento: string;
  /** Só no pedido: as 4 semanas do desafio na versão padrão (o acompanhamento usa se a IA falhar). */
  desafio?: { semana: string; foco: string; acoes: string[] }[];
}

/** Sinais de dívida: quem fecha o mês no crédito, paga o mínimo, atrasa a fatura ou tem parcela pesada. */
export function temSinalDeDivida(r: Respostas, d: Diagnostico): boolean {
  const s = d.sinais;
  return s.fechaNoCredito || s.pagaMinimoDaFatura || s.faturaAtrasada || d.parteParcelas >= 0.2 || r.comoFecha.includes("emprestimo");
}

export function resumoParaServidor(r: Respostas, d: Diagnostico, comDesafio = false): ResumoServidor {
  const perfil = perfilDaSituacao(r, d);
  const maior = d.vazamentos[0];
  return {
    perfil: perfil.titulo,
    perfilId: perfil.id,
    resumoPerfil: perfil.resumo,
    primeiroPasso: primeiroPasso(r, d),
    nivel: d.nivel,
    nivelRotulo: d.nivelRotulo,
    renda: d.renda,
    contasFixas: d.gastosFixos,
    diaADia: d.gastosDiaADia,
    parcelas: d.parcelasMes,
    gastoInvisivel: d.sinais.temGastoInvisivel ? d.gastoInvisivel : 0,
    sobraMes: d.sobraMes,
    comprometimento: Math.round(d.comprometimento * 1000) / 1000,
    diaQueAcaba: d.diaQueAcaba,
    diaComPlano: d.faltaComAjustes > 0 ? d.diaComPlano : null,
    ajustesTotal: d.ajustesTotal,
    livrePorSemana: d.livrePorSemana,
    guardarPorMes: d.guardarPorMes,
    maiorVazamento: maior ? { rotulo: maior.rotulo, porMes: maior.porMes, porAno: maior.porAno } : null,
    sinaisDeDivida: temSinalDeDivida(r, d),
    quandoAcaba: ROTULOS_QUANDO_ACABA[r.quandoAcaba],
    comoFecha: r.comoFecha.map((c) => ROTULOS_COMO_FECHA[c]),
    vazamentos: r.vazamentos.map((v) => ROTULOS_VAZAMENTO[v]),
    reserva: ROTULOS_RESERVA[r.reserva],
    objetivo: ROTULOS_OBJETIVO[r.objetivo],
    sentimento: ROTULOS_SENTIMENTO[r.sentimento],
    ...(comDesafio ? { desafio: narrativaPadrao(r, d).desafio30Dias } : {}),
  };
}
