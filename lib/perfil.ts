/**
 * O resultado do quiz: um nome para o tipo de mês da pessoa, uma frase que
 * explica com os números dela, o primeiro passo e os itens do plano pago
 * ligados ao que ela respondeu. Tudo por regras, sem IA.
 */
import { brl, pct } from "./formato";
import { FRASE_QUANDO_ACABA } from "./rotulos";
import type { ComoFecha, Diagnostico, Respostas, Sentimento } from "./tipos";

export type IdPerfil =
  | "salario_com_dono"
  | "dinheiro_que_some"
  | "fim_de_mes_no_cartao"
  | "no_vermelho"
  | "vazamento_miudo"
  | "montanha_russa"
  | "sem_colchao"
  | "no_azul_sem_rumo";

export interface Perfil {
  id: IdPerfil;
  titulo: string;
  resumo: string;
}

/** "a, b ou c" */
export function listaComOu(itens: string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} ou ${itens[itens.length - 1]}`;
}

const CREDITO: Partial<Record<ComoFecha, string>> = {
  cartao: "o cartão",
  cheque_especial: "o limite da conta",
  emprestimo: "um empréstimo",
};

const SEM_CREDITO: Partial<Record<ComoFecha, string>> = {
  familia: "ajuda da família ou de amigos",
  atraso_contas: "contas que atrasam",
  aperto: "aperto, deixando de comprar o que dá",
};

/** Delivery, compras, lazer e assinaturas: os gastos pequenos que somam. */
export function gastosMiudos(r: Respostas): number {
  return r.gastos.comer_fora + r.gastos.compras_lazer + r.gastos.assinaturas;
}

export function perfilDaSituacao(r: Respostas, d: Diagnostico): Perfil {
  const s = d.sinais;
  const disponivel = d.renda - d.gastosFixos - d.parcelasMes;

  if (d.comprometimento >= 0.85) {
    return {
      id: "salario_com_dono",
      titulo: "Salário com dono",
      resumo:
        disponivel > 0
          ? `Antes de o salário cair, ${pct(d.comprometimento)} dele já tem destino: contas fixas e parcelas. Sobram ${brl(disponivel)} para o mês inteiro de mercado, lanches, lazer e todo o resto.`
          : "Antes de o salário cair, contas fixas e parcelas já levam tudo o que entra. Não sobra nada para o mercado e o resto do mês.",
    };
  }
  if (s.temGastoInvisivel && d.gastoInvisivel >= Math.max(150, d.renda * 0.08)) {
    const previsao = d.diaPelasContas === null ? "daria para o mês inteiro" : `daria até o dia ${d.diaPelasContas}`;
    return {
      id: "dinheiro_que_some",
      titulo: "Dinheiro que some",
      resumo: `Pelas contas que você fez, o salário ${previsao}. Mas ele ${FRASE_QUANDO_ACABA[r.quandoAcaba]}. Cerca de ${brl(d.gastoInvisivel)} por mês saem sem aparecer em lugar nenhum.`,
    };
  }
  if (s.contaNaoFecha && s.fechaNoCredito) {
    const onde = r.comoFecha.map((c) => CREDITO[c]).filter((x): x is string => Boolean(x));
    return {
      id: "fim_de_mes_no_cartao",
      titulo: "Fim de mês no cartão",
      resumo: `Faltam cerca de ${brl(-d.sobraMes)} por mês, e essa diferença vai para ${listaComOu(onde)}. É assim que o fim do mês de hoje começa a comer o salário do mês que vem.`,
    };
  }
  if (s.contaNaoFecha) {
    const como = r.comoFecha.map((c) => SEM_CREDITO[c]).filter((x): x is string => Boolean(x));
    return {
      id: "no_vermelho",
      titulo: "No vermelho todo mês",
      resumo: `O que entra não cobre o mês: faltam cerca de ${brl(-d.sobraMes)}. ${
        como.length > 0 ? `Hoje essa diferença sai de ${listaComOu(como)}.` : "Todo mês, alguma coisa fica de fora."
      }`,
    };
  }
  const miudos = gastosMiudos(r);
  if (miudos / Math.max(d.renda, 1) >= 0.18) {
    return {
      id: "vazamento_miudo",
      titulo: "Vazamento miúdo",
      resumo: `Delivery, compras, lazer e assinaturas levam ${brl(miudos)} por mês, ${pct(miudos / d.renda)} do que entra. Um gasto pequeno de cada vez, que no fim do ano soma ${brl(miudos * 12)}.`,
    };
  }
  if (s.rendaVariavel && (s.semReserva || d.sobraMes < d.renda * 0.1)) {
    return {
      id: "montanha_russa",
      titulo: "Renda montanha-russa",
      resumo: `Sua renda muda de um mês para o outro e ${s.semReserva ? "não há reserva para segurar os meses fracos" : "a folga é pequena"}. Quem decide o resto do ano é o pior mês, não o melhor.`,
    };
  }
  if (s.semReserva) {
    return {
      id: "sem_colchao",
      titulo: "Sem colchão",
      resumo: `O mês fecha${d.sobraMes > 0 ? ` e sobram cerca de ${brl(d.sobraMes)}` : ", no limite"}, mas não existe dinheiro guardado. Qualquer imprevisto, de um remédio a um conserto, vira cartão ou empréstimo.`,
    };
  }
  return {
    id: "no_azul_sem_rumo",
    titulo: "No azul, sem rumo",
    resumo:
      d.sobraMes > 0
        ? `Sobram cerca de ${brl(d.sobraMes)} por mês. É uma boa base, mas dinheiro sem destino costuma virar gasto: o próximo passo é dar um trabalho para cada real.`
        : "O mês fecha no zero a zero. Não falta, mas também não sobra: o próximo passo é abrir espaço para guardar sem apertar o resto.",
  };
}

/** Uma frase de acolhimento a partir de como a pessoa disse que se sente. */
export const ACOLHIMENTO: Record<Sentimento, string> = {
  ansioso:
    "Você contou que fica ansioso, contando cada real. Saber exatamente para onde o dinheiro vai é o que mais tira esse peso, e isso você começa a ter agora.",
  culpado:
    "Você contou que sente culpa pelos gastos. Culpa não organiza o mês, números organizam. E agora você tem os seus.",
  cansado:
    "Você contou que está cansado de viver no aperto. Faz sentido: aperto sem plano cansa. A diferença começa quando cada real ganha um destino.",
  tranquilo:
    "Você contou que está tranquilo, mas quer se organizar. É o melhor momento: arrumar o mês sem urgência é bem mais fácil.",
};

/** O primeiro passo, mostrado de graça no resultado. */
export function primeiroPasso(r: Respostas, d: Diagnostico): { titulo: string; texto: string } {
  const perfil = perfilDaSituacao(r, d);
  const maior = d.vazamentos[0];
  switch (perfil.id) {
    case "salario_com_dono":
      return {
        titulo: "Não faça nenhuma parcela nova",
        texto:
          d.parcelasMes > 0
            ? `As parcelas já levam ${brl(d.parcelasMes)} por mês. Até elas diminuírem, nenhuma compra nova parcelada. Ao mesmo tempo, revise as contas fixas que dá para baixar: plano de celular, internet e assinaturas.`
            : "Comece pelas contas fixas que dá para baixar sem mudar de vida: plano de celular, internet, assinaturas e tarifas do banco. E nenhuma compra parcelada nova até o mês respirar.",
      };
    case "dinheiro_que_some":
      return {
        titulo: "Anote tudo por 14 dias",
        texto: `Cada Pix, cada maquininha, cada corrida, sem julgar nenhum gasto. Em duas semanas, os gastos que somem (cerca de ${brl(d.gastoInvisivel)} por mês) aparecem com nome e sobrenome, e aí dá para decidir o que fica.`,
      };
    case "fim_de_mes_no_cartao":
      return {
        titulo: "Tire o cartão do dia a dia",
        texto:
          "Deixe no cartão só o que já está nele. Mercado, lanche e corrida passam para o débito ou o Pix, com um valor fixo por semana. É o que impede o mês de hoje de pegar dinheiro do mês que vem.",
      };
    case "no_vermelho":
      return {
        titulo: `Feche o buraco de ${brl(-d.sobraMes)}`,
        texto: maior
          ? `Comece pelo que mais pesa e menos dói: o gasto com ${maior.rotulo.toLowerCase()}, de ${brl(maior.porMes)} por mês. Defina hoje um teto para ele e siga para o próximo grupo.`
          : "Comece pelos gastos que dá para mudar já: assinaturas, delivery e compras fora da lista. Cada um com um teto definido hoje.",
      };
    case "vazamento_miudo":
      return maior
        ? {
            titulo: "Corte pela metade o maior vazamento",
            texto: `O gasto com ${maior.rotulo.toLowerCase()} é de ${brl(maior.porMes)} por mês. Pela metade, são ${brl(maior.porMes / 2)} a mais por mês, ou ${brl(maior.porAno / 2)} no fim do ano.`,
          }
        : {
            titulo: "Dê um teto para os gastos miúdos",
            texto: "Delivery, compras e assinaturas ganham um valor máximo por mês, definido hoje.",
          };
    case "montanha_russa":
      return {
        titulo: "Pague um salário para você mesmo",
        texto:
          "Deixe tudo o que entra numa conta separada e transfira para a conta do dia a dia um valor fixo por semana, pensado para o seu pior mês. No mês bom, a diferença fica guardada para o mês fraco.",
      };
    case "sem_colchao":
    case "no_azul_sem_rumo":
      return {
        titulo: "Separe o futuro no dia em que o dinheiro entra",
        texto: `Antes de pagar qualquer coisa, separe ${brl(Math.max(d.guardarPorMes, 50))} num lugar à parte. O que fica para depois quase nunca sobra.`,
      };
  }
}

/** O que o plano completo entrega, escrito a partir das respostas da pessoa. */
export function itensDoPlano(r: Respostas, d: Diagnostico): string[] {
  const itens: string[] = [
    `Seu novo mês, real por real: quanto vai para contas, parcelas, dia a dia e futuro com os seus ${brl(d.renda)}`,
    d.faltaComAjustes > 0
      ? `Quanto você pode gastar por semana, e o que fazer com os ${brl(d.faltaComAjustes)} que ainda faltam`
      : "Quanto você pode gastar por semana para o dinheiro chegar ao dia 30",
  ];

  const porObjetivo: Record<Respostas["objetivo"], string> = {
    fim_do_mes: "O calendário do seu mês: o que pagar e o que separar em cada momento, do dia do pagamento ao dia 30",
    sair_do_cartao: "Como parar de fechar o mês no cartão, sem deixar nenhuma conta para trás",
    reserva: "Quando sua reserva chega ao primeiro colchão, no seu ritmo, e quanto separar por mês",
    saber_para_onde: d.sinais.temGastoInvisivel
      ? `Como encontrar, em 14 dias, os gastos que somem (cerca de ${brl(d.gastoInvisivel)} por mês)`
      : "Para onde vai cada real, grupo por grupo, com a meta de cada um",
    juntar_objetivo: "Quanto separar por mês para o seu sonho sem apertar o resto do mês",
  };
  itens.push(porObjetivo[r.objetivo]);

  const maior = d.vazamentos[0];
  if (maior) {
    itens.push(`A meta para o gasto com ${maior.rotulo.toLowerCase()}, que hoje custa ${brl(maior.porAno)} por ano`);
  } else {
    itens.push("Onde ajustar no seu orçamento, grupo por grupo");
  }
  itens.push("Suas regras do mês e um desafio de 30 dias, semana a semana");
  itens.push(
    r.pessoasNaCasa > 1
      ? "Mensagens prontas para combinar o plano com quem mora com você"
      : "Mensagens prontas para cancelar o que não usa e baixar contas",
  );
  itens.push("Um guia com o método, os quatro potes, armadilhas, direitos e ajuda gratuita");
  return itens;
}
