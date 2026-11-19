import type { Respostas } from "./tipos";

/**
 * Caso fictício usado na página inicial para mostrar o produto funcionando.
 * Os números exibidos lá saem do mesmo motor que calcula o resultado real.
 */
export const EXEMPLO: Respostas = {
  nome: "Exemplo",
  quandoAcaba: "ultima_semana",
  pessoasNaCasa: 3,
  tipoRenda: "fixa",
  rendaMensal: 3200,
  recebimento: "inicio",
  gastos: {
    moradia: 950,
    contas: 290,
    transporte: 220,
    saude_educacao: 150,
    assinaturas: 110,
    mercado: 750,
    comer_fora: 420,
    compras_lazer: 280,
    outros: 150,
  },
  parcelas: { cartao: 380, emprestimos: 0 },
  fatura: "minimo_ou_parcela",
  comoFecha: ["cartao"],
  vazamentos: ["assinaturas", "delivery"],
  controle: "as_vezes",
  reserva: "nenhuma",
  sentimento: "cansado",
  objetivo: "sair_do_cartao",
};
