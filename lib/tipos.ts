/* ---------- Respostas do quiz ---------- */

/** Em que parte do mês o dinheiro costuma acabar, na percepção da pessoa. */
export type QuandoAcaba = "primeira_semana" | "metade" | "ultima_semana" | "chega_justo" | "sobra";

export type TipoRenda = "fixa" | "variavel" | "mista";

/** Como o dinheiro entra ao longo do mês. Muda o calendário do plano. */
export type Recebimento = "inicio" | "meio_fim" | "quinzenal" | "aos_poucos";

/** Como a pessoa lida com a fatura do cartão. */
export type Fatura = "inteira" | "minimo_ou_parcela" | "atrasada" | "nao_uso";

/** O que a pessoa faz quando o dinheiro acaba antes do mês. */
export type ComoFecha = "cartao" | "cheque_especial" | "emprestimo" | "familia" | "atraso_contas" | "aperto";

/** Onde a pessoa sente que o dinheiro escapa. */
export type Vazamento =
  | "delivery"
  | "compras_online"
  | "saidas"
  | "assinaturas"
  | "mercado"
  | "app_transporte"
  | "ajuda_familia"
  | "apostas"
  | "nao_sei";

export type Controle = "nenhum" | "as_vezes" | "sempre";
export type Reserva = "nenhuma" | "menos_1_mes" | "mais_1_mes";

/** Como a pessoa se sente quando o mês está acabando: ajusta o tom do resultado e do plano. */
export type Sentimento = "ansioso" | "culpado" | "cansado" | "tranquilo";

export type Objetivo = "fim_do_mes" | "sair_do_cartao" | "reserva" | "saber_para_onde" | "juntar_objetivo";

/** Gastos que têm valor e data quase certos todo mês. */
export type CategoriaFixa = "moradia" | "contas" | "transporte" | "saude_educacao" | "assinaturas";
/** Gastos que mudam conforme o mês e as escolhas do dia. */
export type CategoriaDiaADia = "mercado" | "comer_fora" | "compras_lazer" | "outros";
export type CategoriaGasto = CategoriaFixa | CategoriaDiaADia;

export type Gastos = Record<CategoriaGasto, number>;

export interface Parcelas {
  /** Compras parceladas no cartão (as parcelas que caem todo mês na fatura). */
  cartao: number;
  /** Empréstimos, financiamentos e carnês. */
  emprestimos: number;
}

export interface Respostas {
  nome: string;
  quandoAcaba: QuandoAcaba;
  pessoasNaCasa: number;
  tipoRenda: TipoRenda;
  /** Quanto entra por mês, já com descontos. Renda variável: a média. */
  rendaMensal: number;
  recebimento: Recebimento;
  gastos: Gastos;
  parcelas: Parcelas;
  fatura: Fatura;
  comoFecha: ComoFecha[];
  vazamentos: Vazamento[];
  controle: Controle;
  reserva: Reserva;
  sentimento: Sentimento;
  objetivo: Objetivo;
}

/** Contato pedido no início do quiz. Fica fora de Respostas: não vai para a IA. */
export interface Contato {
  nome: string;
  email: string;
  /** Só dígitos, com DDD e sem o 55. Ex.: 11912345678 */
  telefone: string;
}

/** De onde a pessoa veio (parâmetros de campanha da primeira visita). */
export type Origem = Partial<
  Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term" | "gclid" | "fbclid", string>
>;

/* ---------- Raio-x do mês (calculado, sem IA) ---------- */

export type Nivel = 1 | 2 | 3 | 4;

/** Uma linha do orçamento. "invisivel" é o gasto que não apareceu nas contas da pessoa. */
export type IdLinha = CategoriaGasto | "invisivel";

export interface LinhaOrcamento {
  categoria: IdLinha;
  grupo: "fixo" | "dia_a_dia";
  rotulo: string;
  atual: number;
  /** Fração da renda (0.3 = 30%). */
  parteDaRenda: number;
  /** Acima do que esse grupo costuma ocupar num orçamento equilibrado. */
  acima: boolean;
  /** A pessoa apontou esse grupo como onde o dinheiro escapa. */
  apontado: boolean;
  /** Quanto o plano tira desse grupo por mês. */
  ajuste: number;
  meta: number;
}

export type IdPote = "contas" | "parcelas" | "dia_a_dia" | "futuro";

/** As quatro partes em que o salário é dividido no dia em que entra. */
export interface Pote {
  id: IdPote;
  rotulo: string;
  valor: number;
}

export interface MetaReserva {
  rotulo: string;
  valor: number;
  /** Meses para chegar lá guardando o valor do plano. null = não chega com o plano de hoje. */
  meses: number | null;
}

/** Um gasto do dia a dia que pesa: quanto custa por mês e por ano. */
export interface VazamentoAnalisado {
  categoria: CategoriaGasto;
  rotulo: string;
  porMes: number;
  porAno: number;
  apontado: boolean;
}

export interface Diagnostico {
  nivel: Nivel;
  nivelRotulo: string;
  pontos: number;
  renda: number;
  gastosFixos: number;
  gastosDiaADia: number;
  parcelasMes: number;
  /**
   * Estimativa do que sai sem aparecer nas contas: a diferença entre o dia em
   * que a pessoa diz que o dinheiro acaba e o dia que as contas dela preveem.
   */
  gastoInvisivel: number;
  /** Fixos + dia a dia + parcelas + gasto invisível. */
  totalMes: number;
  /** Renda − total do mês (com o gasto invisível). Negativa = o mês não fecha. */
  sobraMes: number;
  /** Renda − o que a pessoa informou, sem o gasto invisível. */
  sobraInformada: number;
  /** (Contas fixas + parcelas) ÷ renda: a parte do salário que já chega com destino. */
  comprometimento: number;
  /** Parcelas ÷ renda. */
  parteParcelas: number;
  /** Dia em que o dinheiro acaba hoje. null = dura o mês inteiro. */
  diaQueAcaba: number | null;
  /** Dia em que acabaria só pelas contas informadas. null = duraria o mês inteiro. */
  diaPelasContas: number | null;
  /** Dia que a pessoa contou no quiz (aproximado). null = não acaba. */
  diaContado: number | null;
  /** O que a pessoa contou e o que as contas mostram estão longe um do outro. */
  contasNaoBatem: boolean;
  orcamento: LinhaOrcamento[];
  ajustesTotal: number;
  potes: Pote[];
  /** Pote do futuro: quanto o plano separa por mês. */
  guardarPorMes: number;
  /** Pote do dia a dia: o que pode ser gasto no mês com mercado, lanches, lazer e o resto. */
  diaADiaPlano: number;
  livrePorSemana: number;
  /** Parte do pote do dia a dia que sobra além das metas: o respiro. */
  folga: number;
  /** Mesmo com todos os ajustes, quanto ainda falta por mês. 0 = o plano fecha. */
  faltaComAjustes: number;
  /** Dia em que o dinheiro acabaria seguindo o plano. null = dura o mês inteiro. */
  diaComPlano: number | null;
  metasReserva: MetaReserva[];
  /** Quanto o mês acumula em 12 meses: negativo vira crédito ou conta atrasada. */
  em12Meses: { ritmoAtual: number; plano: number };
  vazamentos: VazamentoAnalisado[];
  sinais: {
    contaNaoFecha: boolean;
    fechaNoCredito: boolean;
    salarioComprometido: boolean;
    temGastoInvisivel: boolean;
    rendaVariavel: boolean;
    semReserva: boolean;
    semControle: boolean;
    apostas: boolean;
    ajudaFamilia: boolean;
    faturaAtrasada: boolean;
    pagaMinimoDaFatura: boolean;
    parcelasAltas: boolean;
  };
}

/* ---------- Texto personalizado (IA ou versão padrão) ---------- */

export interface Narrativa {
  leitura: string[];
  pontosCriticos: { titulo: string; explicacao: string }[];
  regrasDoMes: { regra: string; porque: string }[];
  ajustes: { categoria: string; sugestao: string }[];
  primeiros7Dias: string[];
  desafio30Dias: { semana: string; foco: string; acoes: string[] }[];
  mensagens: { titulo: string; texto: string }[];
  proximos90Dias: string[];
  recado: string;
}

/** Um momento do mês no calendário do plano (lib/calendario.ts). */
export interface MomentoDoMes {
  quando: string;
  oQueFazer: string;
}

export interface PlanoCompleto {
  ref: string;
  geradoEm: string;
  nome: string;
  diagnostico: Diagnostico;
  calendario: MomentoDoMes[];
  narrativa: Narrativa;
  /** "ia" = escrito pela IA; "padrao" = versão gerada por regras (IA indisponível). */
  origemNarrativa: "ia" | "padrao";
}
