/**
 * Versão do texto personalizado escrita por regras, sem IA. É usada quando a
 * IA está indisponível, para o cliente nunca ficar sem o plano que pagou.
 */
import { brl, duracao, pct } from "./formato";
import { listaComOu, primeiroPasso } from "./perfil";
import type { Diagnostico, IdLinha, Narrativa, Respostas } from "./tipos";

function primeiroNome(nome: string): string {
  return nome.split(" ")[0] || nome;
}

const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

const DICAS: Partial<Record<IdLinha, string>> = {
  contas:
    "Reveja o plano de celular e de internet, peça a tarifa social de energia se tiver direito e desligue da tomada o que fica ligado à toa.",
  transporte:
    "Junte saídas no mesmo dia, compare o custo do carro com o do transporte público e confira se o vale-transporte cobre mais trechos.",
  assinaturas:
    "Liste todas as assinaturas que aparecem no extrato e na fatura. Fique só com as que você usou na última semana e cancele as outras hoje.",
  mercado:
    "Cardápio da semana, lista fechada e uma compra grande no mês, com reposição só de frescos. Ir menos vezes ao mercado é o que mais economiza.",
  comer_fora:
    "Escolha os dias do delivery (por exemplo, só no sábado) e leve marmita ou lanche de casa nos dias úteis. Apague o cartão salvo nos aplicativos.",
  compras_lazer:
    "Lazer com valor fixo no mês, compras só da lista e 48 horas de espera para tudo o que não estava nela. Tire o cartão salvo das lojas online.",
  outros:
    "Olhe o extrato com calma: corridas de aplicativo, beleza e pequenas ajudas somam rápido. Dê um teto para cada um.",
  invisivel:
    "Anote todos os gastos por 14 dias. Quando o que some tiver nome, decida o que fica e o que sai.",
};

const CREDITO: Record<string, string> = {
  cartao: "o cartão",
  cheque_especial: "o limite da conta",
  emprestimo: "empréstimos",
};

function ondeVaiOCredito(r: Respostas): string {
  const onde = r.comoFecha.map((c) => CREDITO[c]).filter(Boolean);
  return listaComOu(onde.length > 0 ? onde : ["o crédito"]);
}

/** Os pontos que mais pesam, do mais grave para o menos. Também aparecem de graça no resultado. */
function pontosCriticos(r: Respostas, d: Diagnostico): Narrativa["pontosCriticos"] {
  const s = d.sinais;
  const pontos: Narrativa["pontosCriticos"] = [];
  const maior = d.vazamentos[0];

  if (s.salarioComprometido) {
    pontos.push({
      titulo: "Salário que já chega com dono",
      explicacao: `${pct(d.comprometimento)} do que entra vai para contas fixas e parcelas antes de você decidir qualquer coisa. Acima de 70%, sobra pouco espaço para viver o mês.`,
    });
  }
  if (s.temGastoInvisivel) {
    pontos.push({
      titulo: "Gasto que não aparece",
      explicacao: `Cerca de ${brl(d.gastoInvisivel)} por mês saem sem você ver, quase sempre no começo do mês, quando o dinheiro parece sobrar. Enquanto eles não tiverem nome, nenhum orçamento fecha.`,
    });
  }
  if (s.contaNaoFecha && s.fechaNoCredito) {
    pontos.push({
      titulo: "O fim do mês no crédito",
      explicacao: `Faltam cerca de ${brl(-d.sobraMes)} por mês, e a diferença vai para ${ondeVaiOCredito(r)}. Cada mês que fecha assim faz o próximo começar devendo.`,
    });
  } else if (s.contaNaoFecha) {
    pontos.push({
      titulo: "O mês não fecha",
      explicacao: `Faltam cerca de ${brl(-d.sobraMes)} por mês. Enquanto isso não mudar, alguma conta, alguma compra ou alguém sempre fica de fora.`,
    });
  }
  if (s.faturaAtrasada) {
    pontos.push({
      titulo: "Fatura atrasada",
      explicacao:
        "Fatura atrasada cobra juros e multa todo mês. Antes de qualquer outro ajuste, ela precisa virar um parcelamento que caiba no seu mês.",
    });
  } else if (s.pagaMinimoDaFatura) {
    pontos.push({
      titulo: "O mínimo da fatura",
      explicacao:
        "Pagar o mínimo ou parcelar a fatura joga o resto nos juros mais caros do mercado. É o atalho que mais encarece o mês seguinte.",
    });
  }
  if (s.parcelasAltas) {
    pontos.push({
      titulo: "Parcelas demais",
      explicacao: `As parcelas levam ${pct(d.parteParcelas)} da renda. Cada compra parcelada nova tira espaço de meses que ainda nem chegaram.`,
    });
  }
  if (s.apostas) {
    pontos.push({
      titulo: "Apostas",
      explicacao:
        "Dinheiro de aposta some do orçamento sem aparecer como gasto. Pedir a autoexclusão nas plataformas é o primeiro passo, e existe apoio gratuito nos Jogadores Anônimos e nos CAPS do SUS.",
    });
  }
  if (maior) {
    pontos.push({
      titulo: `${maior.rotulo} pesa`,
      explicacao: `São ${brl(maior.porMes)} por mês, ou ${brl(maior.porAno)} por ano. É o gasto do dia a dia que mais pesa no seu mês.`,
    });
  }
  if (s.rendaVariavel) {
    pontos.push({
      titulo: "Renda que varia",
      explicacao: "Planejar pelo mês bom faz o mês fraco virar dívida. O plano usa o seu pior mês como base.",
    });
  }
  if (s.semReserva) {
    pontos.push({
      titulo: "Nenhuma reserva",
      explicacao: "Sem dinheiro guardado, qualquer imprevisto vira cartão ou empréstimo e desmonta o mês.",
    });
  }
  if (s.ajudaFamilia) {
    pontos.push({
      titulo: "Ajuda sem teto",
      explicacao:
        "Ajudar quem a gente ama é importante, mas sem um valor combinado a ajuda vira o buraco do mês.",
    });
  }
  if (s.semControle) {
    pontos.push({
      titulo: "Gastos sem registro",
      explicacao: "Sem anotar, o dinheiro some sem deixar pista. Dez minutos por semana olhando o extrato já resolvem.",
    });
  }
  if (pontos.length < 2) {
    pontos.push({
      titulo: "Dinheiro sem destino",
      explicacao: "O que não ganha destino no dia do pagamento costuma sumir até o fim do mês.",
    });
  }
  return pontos.slice(0, 3);
}

/**
 * O que o resultado gratuito mostra além dos números: os pontos que mais
 * pesam e o primeiro passo. Sai das mesmas regras do plano, sem IA.
 */
export function leituraGratuita(r: Respostas, d: Diagnostico) {
  return { pontosCriticos: pontosCriticos(r, d), primeiroPasso: primeiroPasso(r, d) };
}

export function narrativaPadrao(r: Respostas, d: Diagnostico): Narrativa {
  const nome = primeiroNome(r.nome);
  const s = d.sinais;
  const semana = brl(d.livrePorSemana);
  const maior = d.vazamentos[0];
  const linhaDoMaior = maior ? d.orcamento.find((l) => l.categoria === maior.categoria) : undefined;

  /* Leitura */
  const duracaoHoje =
    d.diaQueAcaba === null
      ? d.sobraMes > 0
        ? `o dinheiro chega ao fim do mês e sobram cerca de ${brl(d.sobraMes)}`
        : "o dinheiro chega ao fim do mês, no limite"
      : `o dinheiro dura até mais ou menos o dia ${d.diaQueAcaba}`;
  const leitura: string[] = [
    `${nome}, entram ${brl(d.renda)} por mês e saem cerca de ${brl(d.totalMes)}: ${duracaoHoje}. Do que entra, ${pct(d.comprometimento)} já chega com destino certo, entre contas fixas e parcelas.`,
  ];
  if (s.temGastoInvisivel) {
    leitura.push(
      `Cerca de ${brl(d.gastoInvisivel)} por mês não aparecem nas suas contas. Isso costuma acontecer no começo do mês, quando o dinheiro parece sobrar: pequenos Pix, lanches, corridas e compras que, somados, adiantam o fim do dinheiro.`,
    );
  } else if (s.contaNaoFecha && s.fechaNoCredito) {
    leitura.push(
      `Quando o dinheiro acaba, a diferença vai para ${ondeVaiOCredito(r)}. Assim o mês seguinte começa com uma conta a mais, e é por isso que o aperto se repete.`,
    );
  } else if (maior) {
    leitura.push(
      `O que mais pesa no dia a dia é ${minuscula(maior.rotulo)}: ${brl(maior.porMes)} por mês, ${brl(maior.porAno)} por ano.`,
    );
  }
  if (d.faltaComAjustes === 0) {
    const futuro =
      d.guardarPorMes > 0
        ? `e ${brl(d.guardarPorMes)} para o futuro`
        : "e o futuro começa assim que o mês fechar com sobra";
    leitura.push(
      `Com o plano, o salário é dividido em quatro potes no dia em que entra: ${brl(d.potes[0].valor)} para as contas fixas, ${brl(d.parcelasMes)} para as parcelas, ${brl(d.diaADiaPlano)} para o dia a dia (${semana} por semana) ${futuro}. ${
        d.ajustesTotal > 0 ? `Os ajustes somam ${brl(d.ajustesTotal)} por mês, e o` : "O"
      } dinheiro passa a chegar ao dia 30.`,
    );
  } else {
    leitura.push(
      `Mesmo com ajustes de ${brl(d.ajustesTotal)} por mês, ainda faltam ${brl(d.faltaComAjustes)}. O plano faz o dinheiro durar ${
        d.diaComPlano === null ? "mais" : `até o dia ${d.diaComPlano}`
      } e mostra como fechar o resto: renda extra, parcelas menores e nenhuma compra parcelada nova.`,
    );
  }

  /* Regras do mês */
  const regras: Narrativa["regrasDoMes"] = [
    {
      regra: "O futuro sai primeiro",
      porque:
        d.guardarPorMes > 0
          ? `No dia do pagamento, ${brl(d.guardarPorMes)} vão para o futuro antes de qualquer gasto. O que fica para o fim do mês nunca sobra.`
          : "Assim que o mês fechar com sobra, o dinheiro do futuro sai no dia do pagamento, antes de qualquer gasto.",
    },
    {
      regra: `${semana} por semana, e acabou`,
      porque: "O dia a dia vira um valor por semana. Se acabar na quinta, a sexta é de aperto, não de cartão.",
    },
  ];
  if (s.fechaNoCredito || s.pagaMinimoDaFatura || s.faturaAtrasada) {
    regras.push({
      regra: "Cartão só para o que já está nele",
      porque: "Nenhuma compra nova no crédito até a fatura caber inteira no mês.",
    });
  }
  if (d.parcelasMes > 0) {
    regras.push({
      regra: "Nenhuma parcela nova",
      porque: "Até as parcelas de hoje terminarem, compra nova é à vista ou espera.",
    });
  }
  if (maior && linhaDoMaior) {
    regras.push({
      regra: `${maior.rotulo}: até ${brl(linhaDoMaior.meta)} por mês`,
      porque: "É a meta do plano para o gasto que mais pesa. Chegou no teto, acabou até o mês seguinte.",
    });
  }
  if (s.temGastoInvisivel || s.semControle) {
    regras.push({
      regra: "Gasto anotado no mesmo dia",
      porque: "Até o dinheiro que some ganhar nome. Leva um minuto por dia.",
    });
  }
  regras.push({
    regra: "48 horas antes de comprar o que não estava na lista",
    porque: "Se a vontade passar em dois dias, não era necessidade.",
  });

  /* Ajustes */
  const ajustes: Narrativa["ajustes"] = d.orcamento
    .filter((l) => l.ajuste > 0)
    .map((l) => ({
      categoria: l.rotulo,
      sugestao: `Hoje: ${brl(l.atual)} por mês. Meta: ${brl(l.meta)}. ${DICAS[l.categoria] ?? ""}`.trim(),
    }));
  if (ajustes.length === 0) {
    ajustes.push({
      categoria: "Orçamento enxuto",
      sugestao:
        "Seus gastos já estão dentro do comum para a sua renda. O ganho aqui vem de dar destino à sobra no dia do pagamento, não de cortar mais.",
    });
  }

  /* Primeiros 7 dias */
  const primeiros7Dias: string[] = [
    "Abra o extrato do banco e a fatura do cartão dos últimos dois meses e confira se os valores deste plano estão perto do real.",
  ];
  if (s.temGastoInvisivel || s.semControle) {
    primeiros7Dias.push("Comece a anotar todos os gastos, todos os dias, por 14 dias. Vale caderno, bloco de notas ou planilha.");
  }
  primeiros7Dias.push(
    "Crie os potes: caixinhas no aplicativo do banco (ou contas separadas) para as contas fixas, o dia a dia e o futuro.",
  );
  const assinaturas = d.orcamento.find((l) => l.categoria === "assinaturas");
  if (assinaturas && assinaturas.ajuste > 0) {
    primeiros7Dias.push("Cancele as assinaturas que você não usou na última semana.");
  }
  if (s.fechaNoCredito || s.pagaMinimoDaFatura) {
    primeiros7Dias.push("Apague o cartão de crédito salvo nos aplicativos de delivery, transporte e compras.");
  }
  primeiros7Dias.push(`Na segunda-feira, passe ${semana} para o dia a dia da semana e use só esse valor.`);

  /* Desafio de 30 dias */
  const desafio30Dias: Narrativa["desafio30Dias"] = [
    {
      semana: "Semana 1",
      foco: "Enxergar",
      acoes: [
        "Anote todos os gastos, sem julgar nenhum.",
        "Crie os potes e separe o dinheiro de cada um.",
        `Viva a semana com ${semana} no dia a dia.`,
      ],
    },
    {
      semana: "Semana 2",
      foco: "Cortar o que não faz falta",
      acoes: [
        "Cancele as assinaturas e os serviços que ninguém usa.",
        maior && linhaDoMaior
          ? `Coloque em prática a meta de ${minuscula(maior.rotulo)}: até ${brl(linhaDoMaior.meta)} no mês.`
          : "Escolha um gasto do dia a dia para reduzir pela metade.",
      ],
    },
    {
      semana: "Semana 3",
      foco: "Segurar o ritmo",
      acoes: [
        "Nenhuma compra nova no crédito.",
        "Use a regra das 48 horas para tudo o que não estava na lista.",
        "Confira se a semana fechou dentro do valor e anote onde estourou.",
      ],
    },
    {
      semana: "Semana 4",
      foco: "Fechar o mês",
      acoes: [
        "Confira os quatro potes e anote o grupo que mais estourou.",
        "Ajuste as metas do próximo mês com o que você aprendeu.",
        "No próximo pagamento, separe o futuro antes de tudo.",
      ],
    },
  ];

  /* Mensagens prontas */
  const mensagens: Narrativa["mensagens"] = [];
  if (r.pessoasNaCasa > 1) {
    const hoje =
      d.diaQueAcaba !== null ? `o dinheiro acaba por volta do dia ${d.diaQueAcaba}` : "o dinheiro chega no limite ao fim do mês";
    mensagens.push({
      titulo: "Para combinar com quem mora com você",
      texto: `Queria combinar uma coisa com você. Fiz as contas do nosso mês: entram ${brl(d.renda)} e ${hoje}. Montei um plano: ${semana} por semana para o dia a dia da casa${
        d.guardarPorMes > 0 ? ` e ${brl(d.guardarPorMes)} guardados todo mês` : ""
      }. Topa tentar por 30 dias? No fim do mês a gente senta e vê o que funcionou.`,
    });
  }
  if (s.ajudaFamilia) {
    mensagens.push({
      titulo: "Para quem costuma pedir ajuda",
      texto:
        "Quero continuar ajudando sempre que der, mas estou organizando o meu mês e preciso combinar um valor. Este mês consigo ajudar com até R$ [valor]. Se surgir uma urgência, me avisa antes que a gente vê junto.",
    });
  }
  if ((assinaturas && (assinaturas.ajuste > 0 || assinaturas.apontado)) || mensagens.length === 0) {
    mensagens.push({
      titulo: "Para cancelar uma assinatura",
      texto:
        "Olá. Quero cancelar a assinatura do serviço [nome do serviço], vinculada ao e-mail [seu e-mail], com efeito imediato. Peço a confirmação do cancelamento e o número de protocolo.",
    });
  }
  const contas = d.orcamento.find((l) => l.categoria === "contas");
  if (contas && contas.ajuste > 0 && mensagens.length < 3) {
    mensagens.push({
      titulo: "Para baixar a conta do celular ou da internet",
      texto:
        "Olá. Sou cliente há [tempo] e quero baixar o valor do meu plano. Quais opções vocês têm por um valor menor? Se não houver, vou avaliar a portabilidade para outra operadora.",
    });
  }

  /* Próximos 90 dias */
  const proximos90Dias: string[] = [
    "No segundo mês, repita os potes e compare: o grupo que estourou ganha uma meta mais realista, não uma bronca.",
  ];
  if (s.temGastoInvisivel) {
    proximos90Dias.push(
      "Com os gastos invisíveis já com nome, corte os que não fazem falta e passe a diferença para o futuro.",
    );
  }
  if (s.fechaNoCredito || s.pagaMinimoDaFatura || s.faturaAtrasada) {
    proximos90Dias.push(
      "A cada mês, a fatura do cartão precisa vir menor que a anterior. Quando ela couber inteira no mês, o cartão volta a ser só um meio de pagamento.",
    );
  }
  const colchao = d.metasReserva[0];
  if (d.guardarPorMes > 0 && colchao?.meses && colchao.meses <= 60) {
    proximos90Dias.push(
      `Guardando ${brl(d.guardarPorMes)} por mês, o primeiro objetivo (${minuscula(colchao.rotulo)}, ${brl(colchao.valor)}) chega em ${duracao(colchao.meses)}.`,
    );
  }
  if (d.faltaComAjustes > 0) {
    proximos90Dias.push(
      `Enquanto faltarem ${brl(d.faltaComAjustes)} por mês, teste uma fonte de renda extra por 30 dias e veja se alguma parcela pode ser renegociada para um valor menor.`,
    );
  }
  if (s.rendaVariavel) {
    proximos90Dias.push(
      "Nos meses bons, o que passar do seu salário semanal fica guardado até formar um mês inteiro de reserva para os meses fracos.",
    );
  }
  proximos90Dias.push(
    "No terceiro mês, revise as metas: o que ficou fácil pode apertar um pouco, e o que ficou impossível precisa afrouxar.",
  );

  /* Recado */
  const porObjetivo: Record<Respostas["objetivo"], string> = {
    fim_do_mes:
      "Você quer chegar ao fim do mês sem aperto: o valor por semana é o que faz isso acontecer, porque o dinheiro do dia 25 deixa de ser gasto no dia 5.",
    sair_do_cartao:
      "Você quer parar de fechar o mês no cartão: cada mês em que a fatura vem menor é um passo concreto nessa direção.",
    reserva:
      "Você quer montar sua primeira reserva: ela começa no dia do pagamento, antes do resto, mesmo que com pouco.",
    saber_para_onde:
      "Você quer saber para onde vai o seu dinheiro: em duas semanas de anotação, isso deixa de ser mistério.",
    juntar_objetivo:
      "Você quer juntar para um sonho: o pote do futuro é o primeiro passo, e cada ajuste do plano aproxima esse dia.",
  };

  return {
    leitura,
    pontosCriticos: pontosCriticos(r, d),
    regrasDoMes: regras.slice(0, 5),
    ajustes,
    primeiros7Dias: primeiros7Dias.slice(0, 5),
    desafio30Dias,
    mensagens: mensagens.slice(0, 3),
    proximos90Dias: proximos90Dias.slice(0, 5),
    recado: `${porObjetivo[r.objetivo]} Um mês de cada vez é suficiente.`,
  };
}
