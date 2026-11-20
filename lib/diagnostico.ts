/**
 * Motor do raio-x do mês. Tudo aqui é conta, sem IA: os números que aparecem
 * para o cliente saem deste arquivo, e a IA só escreve em cima deles.
 *
 * As ideias principais:
 * - O mês tem 30 dias. Contas fixas e parcelas saem logo que o dinheiro entra;
 *   o dia a dia vai saindo aos poucos. Daí sai o dia em que o dinheiro acaba.
 * - Se a pessoa diz que o dinheiro acaba antes do que as contas dela preveem,
 *   a diferença é o "gasto invisível": dinheiro que sai sem aparecer em lugar
 *   nenhum, quase sempre no começo do mês.
 * - O plano divide o salário em quatro potes (contas, parcelas, dia a dia e
 *   futuro) e transforma o pote do dia a dia num valor por semana.
 */
import { ROTULOS_GASTO } from "./rotulos";
import type {
  CategoriaDiaADia,
  CategoriaFixa,
  CategoriaGasto,
  Diagnostico,
  IdLinha,
  LinhaOrcamento,
  MetaReserva,
  Nivel,
  Pote,
  QuandoAcaba,
  Respostas,
  Vazamento,
  VazamentoAnalisado,
} from "./tipos";

export const CATEGORIAS_FIXAS: CategoriaFixa[] = ["moradia", "contas", "transporte", "saude_educacao", "assinaturas"];
export const CATEGORIAS_DIA_A_DIA: CategoriaDiaADia[] = ["mercado", "comer_fora", "compras_lazer", "outros"];

export const ROTULO_INVISIVEL = "Gastos que não aparecem nas contas";

export const ROTULOS_NIVEL: Record<Nivel, string> = {
  1: "Equilibrado",
  2: "No limite",
  3: "Apertado",
  4: "No vermelho",
};

const DIAS_NO_MES = 30;

/** Dia aproximado de cada resposta do quiz. "Chega justo" = acaba no dia 30. */
export const DIA_CONTADO: Record<QuandoAcaba, number | null> = {
  primeira_semana: 7,
  metade: 15,
  ultima_semana: 24,
  chega_justo: 30,
  sobra: null,
};

/** Parte da renda que cada grupo costuma ocupar num orçamento equilibrado. Só serve para apontar o que está acima. */
const REFERENCIA: Record<CategoriaGasto, number> = {
  moradia: 0.3,
  contas: 0.08,
  transporte: 0.1,
  saude_educacao: 0.08,
  assinaturas: 0.02,
  mercado: 0.18,
  comer_fora: 0.05,
  compras_lazer: 0.06,
  outros: 0.05,
};

/** Quanto do gasto atual o plano pode tirar de cada grupo, no máximo, sem virar sacrifício. */
const AJUSTE_MAXIMO: Record<IdLinha, number> = {
  moradia: 0,
  contas: 0.1,
  transporte: 0.1,
  saude_educacao: 0,
  assinaturas: 0.5,
  mercado: 0.1,
  comer_fora: 0.5,
  compras_lazer: 0.4,
  outros: 0.25,
  invisivel: 0.6,
};

/** Ordem em que os ajustes são feitos: primeiro o que dói menos. */
const ORDEM_AJUSTE: IdLinha[] = [
  "invisivel",
  "assinaturas",
  "comer_fora",
  "compras_lazer",
  "outros",
  "contas",
  "transporte",
  "mercado",
  "moradia",
  "saude_educacao",
];

/** Grupos que sempre ganham meta quando a pessoa aponta que o dinheiro escapa por ali. */
const META_QUANDO_APONTADO = new Set<IdLinha>(["comer_fora", "compras_lazer", "assinaturas", "outros", "mercado"]);

const VAZAMENTO_PARA_CATEGORIA: Partial<Record<Vazamento, CategoriaGasto>> = {
  delivery: "comer_fora",
  compras_online: "compras_lazer",
  saidas: "compras_lazer",
  assinaturas: "assinaturas",
  mercado: "mercado",
  app_transporte: "outros",
  ajuda_familia: "outros",
};

const desce = (valor: number, passo: number) => Math.floor(valor / passo) * passo;
const sobe = (valor: number, passo: number) => Math.ceil(valor / passo) * passo;
const soma = (valores: number[]) => valores.reduce((a, b) => a + b, 0);

/** Até que dia do mês o dinheiro cobre, se o dia a dia sai no mesmo ritmo todos os dias. null = cobre o mês inteiro. */
export function diaEmQueAcaba(disponivel: number, gastoPorDia: number): number | null {
  if (disponivel <= 0) return 1;
  if (gastoPorDia <= 0) return null;
  const dia = Math.floor(disponivel / gastoPorDia);
  return dia >= DIAS_NO_MES ? null : Math.max(1, dia);
}

function pontuar(args: {
  comprometimento: number;
  sobraNaRenda: number;
  parteParcelas: number;
  fechaNoCredito: boolean;
  fechaComAjuda: boolean;
  fatura: Respostas["fatura"];
  semReserva: boolean;
  apostas: boolean;
}): number {
  let pontos = 0;
  const { comprometimento: c, sobraNaRenda: s, parteParcelas: p } = args;
  if (c > 0.9) pontos += 3;
  else if (c > 0.75) pontos += 2;
  else if (c > 0.6) pontos += 1;

  if (s < 0) pontos += 3;
  else if (s < 0.05) pontos += 2;
  else if (s < 0.1) pontos += 1;

  if (p > 0.3) pontos += 2;
  else if (p > 0.15) pontos += 1;

  if (args.fechaNoCredito) pontos += 2;
  else if (args.fechaComAjuda) pontos += 1;

  if (args.fatura === "atrasada") pontos += 2;
  else if (args.fatura === "minimo_ou_parcela") pontos += 1;

  if (args.semReserva) pontos += 1;
  if (args.apostas) pontos += 1;
  return pontos;
}

function nivelDosPontos(pontos: number): Nivel {
  if (pontos >= 9) return 4;
  if (pontos >= 6) return 3;
  if (pontos >= 3) return 2;
  return 1;
}

/** Quanto separar por mês para o futuro, como ponto de partida. */
function metaDeGuardar(r: Respostas): number {
  const parte = r.objetivo === "reserva" || r.objetivo === "juntar_objetivo" ? 0.1 : 0.05;
  return Math.min(desce(r.rendaMensal * 0.2, 10), Math.max(50, desce(r.rendaMensal * parte, 10)));
}

export function diagnosticar(r: Respostas): Diagnostico {
  const renda = r.rendaMensal;
  const base = Math.max(renda, 1);
  const gastosFixos = soma(CATEGORIAS_FIXAS.map((c) => r.gastos[c]));
  const gastosDiaADia = soma(CATEGORIAS_DIA_A_DIA.map((c) => r.gastos[c]));
  const parcelasMes = r.parcelas.cartao + r.parcelas.emprestimos;
  const sobraInformada = renda - gastosFixos - gastosDiaADia - parcelasMes;

  /* Em que dia o dinheiro acaba */
  const disponivel = renda - gastosFixos - parcelasMes;
  const diaPelasContas = diaEmQueAcaba(disponivel, gastosDiaADia / DIAS_NO_MES);
  const diaContado = DIA_CONTADO[r.quandoAcaba];

  // Se o dinheiro acaba antes do que as contas preveem, sai mais do que a
  // pessoa contou nos dias em que ele dura. A estimativa é conservadora: conta
  // só o que sai a mais até o dia em que ele acaba.
  let gastoInvisivel = 0;
  if (diaContado !== null && disponivel > 0 && (diaPelasContas === null || diaPelasContas > diaContado + 2)) {
    const estimado = desce(disponivel - (gastosDiaADia * diaContado) / DIAS_NO_MES, 10);
    if (estimado >= Math.max(100, renda * 0.03)) gastoInvisivel = estimado;
  }
  const diaQueAcaba =
    gastoInvisivel > 0 ? (diaContado !== null && diaContado < DIAS_NO_MES ? diaContado : null) : diaPelasContas;
  const contasNaoBatem =
    gastoInvisivel === 0 && diaPelasContas !== null && (diaContado === null || diaPelasContas < diaContado - 7);

  const totalMes = gastosFixos + gastosDiaADia + parcelasMes + gastoInvisivel;
  const sobraMes = renda - totalMes;
  const comprometimento = (gastosFixos + parcelasMes) / base;
  const parteParcelas = parcelasMes / base;

  /* Orçamento */
  const apontados = new Set(r.vazamentos.map((v) => VAZAMENTO_PARA_CATEGORIA[v]).filter(Boolean));
  const linhas: LinhaOrcamento[] = [...CATEGORIAS_FIXAS, ...CATEGORIAS_DIA_A_DIA].map((categoria) => {
    const atual = r.gastos[categoria];
    return {
      categoria,
      grupo: (CATEGORIAS_FIXAS as CategoriaGasto[]).includes(categoria) ? "fixo" : "dia_a_dia",
      rotulo: ROTULOS_GASTO[categoria],
      atual,
      parteDaRenda: atual / base,
      acima: atual > 0 && atual / base > REFERENCIA[categoria] * 1.15,
      apontado: apontados.has(categoria),
      ajuste: 0,
      meta: atual,
    };
  });
  if (gastoInvisivel > 0) {
    linhas.push({
      categoria: "invisivel",
      grupo: "dia_a_dia",
      rotulo: ROTULO_INVISIVEL,
      atual: gastoInvisivel,
      parteDaRenda: gastoInvisivel / base,
      acima: true,
      apontado: r.vazamentos.includes("nao_sei"),
      ajuste: 0,
      meta: gastoInvisivel,
    });
  }

  /* Ajustes: o suficiente para o mês fechar e sobrar a meta de guardar */
  const guardarAlvo = metaDeGuardar(r);
  const prioridade = (l: LinhaOrcamento) => (l.categoria === "invisivel" ? -1 : l.apontado || l.acima ? 0 : 1);
  const fila = [...linhas].sort(
    (a, b) => prioridade(a) - prioridade(b) || ORDEM_AJUSTE.indexOf(a.categoria) - ORDEM_AJUSTE.indexOf(b.categoria),
  );
  let precisa = Math.max(0, guardarAlvo - sobraMes);
  for (const linha of fila) {
    if (precisa <= 0) break;
    const ajuste = Math.min(desce(linha.atual * AJUSTE_MAXIMO[linha.categoria], 10), sobe(precisa, 10));
    linha.ajuste = ajuste;
    precisa -= ajuste;
  }
  // Onde a pessoa disse que o dinheiro escapa, o plano sempre põe uma meta,
  // mesmo quando a conta já fecha sem mexer ali.
  for (const linha of linhas) {
    if (linha.apontado && linha.ajuste === 0 && META_QUANDO_APONTADO.has(linha.categoria)) {
      linha.ajuste = desce((linha.atual * AJUSTE_MAXIMO[linha.categoria]) / 2, 10);
    }
  }
  // Se depois dos ajustes faltar só um trocado (até R$ 50), ele sai do dia a
  // dia: "faltam R$ 10" assusta mais do que ajuda.
  const resto = sobraMes + soma(linhas.map((l) => l.ajuste));
  if (resto < 0 && resto >= -50) {
    const candidata = (["invisivel", "comer_fora", "compras_lazer", "outros", "mercado"] as IdLinha[])
      .map((c) => linhas.find((l) => l.categoria === c))
      .find((l) => l && l.atual - l.ajuste >= sobe(-resto, 10));
    if (candidata) candidata.ajuste += sobe(-resto, 10);
  }
  for (const linha of linhas) linha.meta = linha.atual - linha.ajuste;

  const ajustesTotal = soma(linhas.map((l) => l.ajuste));
  const ajustesFixos = soma(linhas.filter((l) => l.grupo === "fixo").map((l) => l.ajuste));
  const metasDiaADia = soma(linhas.filter((l) => l.grupo === "dia_a_dia").map((l) => l.meta));

  /* Os quatro potes */
  const sobraComAjustes = sobraMes + ajustesTotal;
  let guardarPorMes = 0;
  let folga = 0;
  let faltaComAjustes = 0;
  if (sobraComAjustes >= guardarAlvo) {
    // Metade do que passa da meta vai para o futuro; a outra metade fica de respiro.
    guardarPorMes = guardarAlvo + desce((sobraComAjustes - guardarAlvo) / 2, 10);
    folga = sobraComAjustes - guardarPorMes;
  } else if (sobraComAjustes >= 0) {
    // Guardar R$ 10 não muda nada e soa como piada: abaixo de R$ 30, a
    // prioridade é só fechar o mês, e o valor fica de respiro.
    guardarPorMes = sobraComAjustes >= 30 ? desce(sobraComAjustes, 10) : 0;
    folga = sobraComAjustes - guardarPorMes;
  } else {
    faltaComAjustes = -sobraComAjustes;
  }
  const contasPlano = gastosFixos - ajustesFixos;
  const diaADiaPlano = metasDiaADia + folga;
  const potes: Pote[] = [
    { id: "contas", rotulo: "Contas fixas", valor: contasPlano },
    { id: "parcelas", rotulo: "Parcelas", valor: parcelasMes },
    { id: "dia_a_dia", rotulo: "Dia a dia", valor: diaADiaPlano },
    { id: "futuro", rotulo: "Futuro", valor: guardarPorMes },
  ];
  const livrePorSemana = desce((diaADiaPlano * 7) / DIAS_NO_MES, 5);
  const diaComPlano =
    faltaComAjustes > 0 ? diaEmQueAcaba(renda - contasPlano - parcelasMes, metasDiaADia / DIAS_NO_MES) : null;

  /* Reserva */
  const mercadoPlano = linhas.find((l) => l.categoria === "mercado")?.meta ?? 0;
  const essencialMes = contasPlano + parcelasMes + mercadoPlano;
  let metas: Omit<MetaReserva, "meses">[] = [
    { rotulo: "Colchão para imprevistos", valor: sobe(Math.max(300, Math.min(1000, renda * 0.25)), 100) },
    { rotulo: "Um mês do essencial", valor: sobe(essencialMes, 100) },
    { rotulo: "Três meses do essencial", valor: sobe(essencialMes * 3, 100) },
  ];
  if (metas[1].valor <= metas[0].valor) metas = metas.slice(1);
  const metasReserva: MetaReserva[] = metas.map((m) => ({
    ...m,
    meses: guardarPorMes > 0 ? Math.ceil(m.valor / guardarPorMes) : null,
  }));

  /* Vazamentos: os gastos miúdos que mais pesam */
  const vazamentos: VazamentoAnalisado[] = linhas
    .filter(
      (l): l is LinhaOrcamento & { categoria: CategoriaGasto } =>
        l.categoria !== "invisivel" &&
        l.atual > 0 &&
        (l.grupo === "dia_a_dia" || l.categoria === "assinaturas") &&
        (l.apontado || (l.acima && l.categoria !== "mercado")),
    )
    .sort((a, b) => b.atual - a.atual)
    .slice(0, 3)
    .map((l) => ({ categoria: l.categoria, rotulo: l.rotulo, porMes: l.atual, porAno: l.atual * 12, apontado: l.apontado }));

  /* Nível */
  const fechaNoCredito = r.comoFecha.some((c) => c === "cartao" || c === "cheque_especial" || c === "emprestimo");
  const fechaComAjuda = r.comoFecha.some((c) => c === "familia" || c === "atraso_contas");
  const pontos = pontuar({
    comprometimento,
    sobraNaRenda: sobraMes / base,
    parteParcelas,
    fechaNoCredito,
    fechaComAjuda,
    fatura: r.fatura,
    semReserva: r.reserva === "nenhuma",
    apostas: r.vazamentos.includes("apostas"),
  });
  const nivel = nivelDosPontos(pontos);

  return {
    nivel,
    nivelRotulo: ROTULOS_NIVEL[nivel],
    pontos,
    renda,
    gastosFixos,
    gastosDiaADia,
    parcelasMes,
    gastoInvisivel,
    totalMes,
    sobraMes,
    sobraInformada,
    comprometimento,
    parteParcelas,
    diaQueAcaba,
    diaPelasContas,
    diaContado,
    contasNaoBatem,
    orcamento: linhas,
    ajustesTotal,
    potes,
    guardarPorMes,
    diaADiaPlano,
    livrePorSemana,
    folga,
    faltaComAjustes,
    diaComPlano,
    metasReserva,
    em12Meses: {
      ritmoAtual: sobraMes * 12,
      plano: faltaComAjustes > 0 ? -faltaComAjustes * 12 : guardarPorMes * 12,
    },
    vazamentos,
    sinais: {
      contaNaoFecha: sobraMes < 0,
      fechaNoCredito,
      salarioComprometido: comprometimento > 0.7,
      temGastoInvisivel: gastoInvisivel > 0,
      rendaVariavel: r.tipoRenda !== "fixa",
      semReserva: r.reserva === "nenhuma",
      semControle: r.controle === "nenhum",
      apostas: r.vazamentos.includes("apostas"),
      ajudaFamilia: r.vazamentos.includes("ajuda_familia"),
      faturaAtrasada: r.fatura === "atrasada",
      pagaMinimoDaFatura: r.fatura === "minimo_ou_parcela",
      parcelasAltas: parteParcelas > 0.2,
    },
  };
}

/* ---------- Simulações para o resultado gratuito ---------- */

export interface OpcaoSimulacao {
  id: string;
  rotulo: string;
  /** Quanto sai a menos por mês com essa mudança. */
  corte: number;
}

/** Até três mudanças simples que a pessoa pode testar no resultado: os maiores vazamentos e o gasto invisível. */
export function opcoesDeSimulacao(d: Diagnostico): OpcaoSimulacao[] {
  const opcoes: OpcaoSimulacao[] = [];
  if (d.gastoInvisivel > 0) {
    opcoes.push({ id: "invisivel", rotulo: "Achar e cortar metade do gasto invisível", corte: desce(d.gastoInvisivel / 2, 10) });
  }
  for (const v of d.vazamentos.slice(0, 2)) {
    opcoes.push({ id: v.categoria, rotulo: `${v.rotulo} pela metade`, corte: desce(v.porMes / 2, 10) });
  }
  const assinaturas = d.orcamento.find((l) => l.categoria === "assinaturas");
  if (assinaturas && assinaturas.atual >= 40 && !opcoes.some((o) => o.id === "assinaturas")) {
    opcoes.push({ id: "assinaturas", rotulo: "Cancelar metade das assinaturas", corte: desce(assinaturas.atual / 2, 10) });
  }
  return opcoes.filter((o) => o.corte > 0).slice(0, 3);
}

/**
 * Até que dia o dinheiro duraria se saíssem `corte` reais a menos por mês dos
 * gastos do dia a dia (espalhados pelos 30 dias) e `corteInvisivel` a menos do
 * gasto invisível (que, pelo próprio cálculo, sai até o dia contado).
 */
export function simularDia(d: Diagnostico, corte: number, corteInvisivel = 0): number | null {
  const disponivel = d.renda - d.gastosFixos - d.parcelasMes;
  if (disponivel <= 0) return 1;
  // Com gasto invisível, o ritmo de hoje é o do dia contado pela pessoa.
  const ritmoHoje =
    d.gastoInvisivel > 0 && d.diaContado !== null
      ? disponivel / Math.min(d.diaContado, DIAS_NO_MES)
      : d.gastosDiaADia / DIAS_NO_MES;
  const diasDoInvisivel = d.diaContado !== null ? Math.min(d.diaContado, DIAS_NO_MES) : DIAS_NO_MES;
  return diaEmQueAcaba(disponivel, ritmoHoje - corte / DIAS_NO_MES - corteInvisivel / diasDoInvisivel);
}
