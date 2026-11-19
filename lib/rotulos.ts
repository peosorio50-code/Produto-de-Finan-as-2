import type {
  CategoriaGasto,
  ComoFecha,
  Controle,
  Fatura,
  Objetivo,
  QuandoAcaba,
  Recebimento,
  Reserva,
  Sentimento,
  TipoRenda,
  Vazamento,
} from "./tipos";

export const ROTULOS_QUANDO_ACABA: Record<QuandoAcaba, string> = {
  primeira_semana: "Logo na primeira semana",
  metade: "Lá pela metade do mês",
  ultima_semana: "Na última semana",
  chega_justo: "Chega ao fim do mês, mas no limite",
  sobra: "Sobra um pouco todo mês",
};

/** O mesmo, para usar no meio de uma frase: "o dinheiro acaba …". */
export const FRASE_QUANDO_ACABA: Record<QuandoAcaba, string> = {
  primeira_semana: "acaba logo na primeira semana",
  metade: "acaba lá pela metade do mês",
  ultima_semana: "acaba na última semana",
  chega_justo: "chega ao fim do mês no limite",
  sobra: "chega ao fim do mês com sobra",
};

export const ROTULOS_RENDA: Record<TipoRenda, string> = {
  fixa: "Fixa (salário, aposentadoria ou pensão)",
  variavel: "Varia de mês para mês (autônomo, comissão, aplicativo)",
  mista: "Uma parte fixa e uma parte que varia",
};

export const ROTULOS_RECEBIMENTO: Record<Recebimento, string> = {
  inicio: "Uma vez por mês, no começo do mês",
  meio_fim: "Uma vez por mês, no meio ou no fim do mês",
  quinzenal: "Duas vezes (salário e adiantamento ou vale)",
  aos_poucos: "Aos poucos, ao longo do mês",
};

export const ROTULOS_GASTO: Record<CategoriaGasto, string> = {
  moradia: "Moradia",
  contas: "Contas da casa",
  transporte: "Transporte",
  saude_educacao: "Saúde e educação",
  assinaturas: "Assinaturas",
  mercado: "Mercado e feira",
  comer_fora: "Delivery e lanches",
  compras_lazer: "Compras e lazer",
  outros: "Outros gastos",
};

export const AJUDA_GASTO: Record<CategoriaGasto, string> = {
  moradia: "Aluguel, prestação da casa, condomínio",
  contas: "Luz, água, gás, internet, celular",
  transporte: "Ônibus, metrô, combustível, estacionamento",
  saude_educacao: "Plano de saúde, remédios, escola, cursos",
  assinaturas: "Streaming, música, academia, aplicativos",
  mercado: "Mercado, feira, padaria, açougue",
  comer_fora: "Delivery, lanches, restaurante, cafezinho",
  compras_lazer: "Roupas, compras pela internet, saídas, presentes",
  outros: "Corridas de aplicativo, beleza, pets, ajuda à família",
};

export const ROTULOS_FATURA: Record<Fatura, string> = {
  inteira: "Pago a fatura inteira",
  minimo_ou_parcela: "Às vezes pago o mínimo ou parcelo a fatura",
  atrasada: "A fatura está atrasada",
  nao_uso: "Não uso cartão de crédito",
};

export const ROTULOS_COMO_FECHA: Record<ComoFecha, string> = {
  cartao: "Passo no cartão de crédito",
  cheque_especial: "Uso o limite da conta (cheque especial)",
  emprestimo: "Pego empréstimo ou adiantamento",
  familia: "Peço emprestado para família ou amigos",
  atraso_contas: "Deixo alguma conta atrasar",
  aperto: "Aperto: deixo de comprar o que der",
};

export const ROTULOS_VAZAMENTO: Record<Vazamento, string> = {
  delivery: "Delivery e lanches",
  compras_online: "Compras pela internet",
  saidas: "Saídas e lazer",
  assinaturas: "Assinaturas que quase não uso",
  mercado: "Mercado sem lista, várias idas na semana",
  app_transporte: "Corridas de aplicativo",
  ajuda_familia: "Ajudo família ou amigos",
  apostas: "Apostas e jogos",
  nao_sei: "Não sei, ele simplesmente some",
};

export const ROTULOS_CONTROLE: Record<Controle, string> = {
  nenhum: "Não anoto nada",
  as_vezes: "Anoto de vez em quando",
  sempre: "Acompanho tudo",
};

export const ROTULOS_RESERVA: Record<Reserva, string> = {
  nenhuma: "Nenhuma",
  menos_1_mes: "Menos de um mês de gastos",
  mais_1_mes: "Um mês de gastos ou mais",
};

export const ROTULOS_SENTIMENTO: Record<Sentimento, string> = {
  ansioso: "Ansioso, contando cada real",
  culpado: "Com culpa, sei que gastei onde não devia",
  cansado: "Cansado de viver no aperto",
  tranquilo: "Tranquilo, mas quero me organizar melhor",
};

export const ROTULOS_OBJETIVO: Record<Objetivo, string> = {
  fim_do_mes: "Chegar ao fim do mês sem aperto",
  sair_do_cartao: "Parar de usar o cartão para fechar o mês",
  reserva: "Montar minha primeira reserva",
  saber_para_onde: "Saber para onde vai o meu dinheiro",
  juntar_objetivo: "Juntar para um sonho (viagem, casa, estudo)",
};
