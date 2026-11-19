/**
 * Parte fixa do produto: o guia que acompanha todo plano, igual para todos os
 * clientes. Edite os textos aqui. As regras legais citadas foram conferidas em
 * novembro de 2026 — revise de tempos em tempos.
 */

export type BlocoGuia =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "marcar"; itens: string[] }
  | { tipo: "passos"; itens: { titulo: string; texto: string }[] }
  | { tipo: "topicos"; itens: { titulo: string; texto: string }[] }
  | { tipo: "mensagem"; quando: string; texto: string };

export interface CapituloGuia {
  id: string;
  titulo: string;
  resumo: string;
  blocos: BlocoGuia[];
}

export const GUIA: CapituloGuia[] = [
  {
    id: "metodo",
    titulo: "O método do Mês Inteiro",
    resumo: "Sete passos para o dinheiro chegar ao dia 30, na ordem em que funcionam.",
    blocos: [
      {
        tipo: "passos",
        itens: [
          {
            titulo: "Descubra para onde o dinheiro vai",
            texto:
              "Abra o extrato do banco e a fatura do cartão dos últimos dois meses e anote tudo o que sair por 14 dias, sem julgar nenhum gasto. Ninguém organiza o que não enxerga.",
          },
          {
            titulo: "Pague-se primeiro",
            texto:
              "No dia em que o dinheiro entra, a primeira saída é para o futuro, mesmo que pequena. O que fica para o fim do mês quase nunca sobra.",
          },
          {
            titulo: "Pague logo o que tem dono",
            texto:
              "Contas fixas e parcelas saem logo depois. Se der, coloque em débito automático para os dias seguintes ao pagamento: conta paga cedo não disputa espaço com o resto.",
          },
          {
            titulo: "Divida o dia a dia em semanas",
            texto:
              "O que sobra vira um valor por semana. É isso que impede o dinheiro do dia 25 de ser gasto no dia 5, quando ele parece sobrar.",
          },
          {
            titulo: "Tire o cartão do dia a dia",
            texto:
              "Mercado, lanche e corrida no débito ou no Pix, dentro do valor da semana. Cartão de crédito só para o que já está nele, até a fatura caber inteira no mês.",
          },
          {
            titulo: "Confira toda semana",
            texto:
              "Dez minutos, sempre no mesmo dia: quanto sobrou da semana, o que estourou, o que dá para ajustar. Plano que não é olhado morre na terceira semana.",
          },
          {
            titulo: "Ajuste no fim do mês",
            texto:
              "Meta que estourou não é fracasso, é informação. No fim do mês, troque metas impossíveis por metas realistas e comece o próximo pelo futuro.",
          },
        ],
      },
    ],
  },
  {
    id: "potes",
    titulo: "Os quatro potes",
    resumo: "Como montar, na prática, a divisão do seu salário.",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "Pote é um lugar separado para cada destino do dinheiro. Pode ser uma caixinha no aplicativo do banco, uma conta digital gratuita a mais ou até envelopes. O que importa é que o dinheiro de um pote não se misture com o de outro.",
      },
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "Contas fixas",
            texto:
              "Moradia, contas da casa, transporte, saúde, educação e assinaturas. Recebe o valor inteiro no dia do pagamento e só sai dali para pagar boleto.",
          },
          {
            titulo: "Parcelas",
            texto:
              "Tudo o que já foi parcelado. Não cresce: o plano não aceita parcela nova até as de hoje terminarem.",
          },
          {
            titulo: "Dia a dia",
            texto:
              "Mercado, delivery, compras, lazer e o resto. Toda segunda-feira, passe o valor da semana para a conta ou o cartão de débito que você usa no dia a dia. Acabou, acabou até a segunda seguinte.",
          },
          {
            titulo: "Futuro",
            texto:
              "Primeiro o colchão para imprevistos, depois um mês do essencial, depois três. Não fica na conta do dia a dia, para não virar gasto sem você perceber.",
          },
        ],
      },
      {
        tipo: "paragrafo",
        texto:
          "Sobrou dinheiro na semana? Ele vai para a semana seguinte ou para o futuro. Faltou? A semana termina no aperto, mas o pote das contas não é tocado. Essa é a regra que faz o mês inteiro caber no salário.",
      },
    ],
  },
  {
    id: "renda-variavel",
    titulo: "Quando a renda varia",
    resumo: "Para autônomos, comissionados, motoristas e quem faz bicos.",
    blocos: [
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "Conta de entrada",
            texto:
              "Tudo o que você recebe cai numa conta separada, que não é usada para pagar nada no dia a dia.",
          },
          {
            titulo: "Um salário para você mesmo",
            texto:
              "Toda segunda-feira, transfira da conta de entrada um valor fixo para o dia a dia, igual no mês bom e no mês fraco. É ele que dá previsibilidade.",
          },
          {
            titulo: "Planeje pelo pior mês",
            texto:
              "Use como base o mês mais fraco dos últimos seis. No mês bom, a diferença fica na conta de entrada para cobrir o próximo mês fraco.",
          },
          {
            titulo: "Separe o dinheiro do trabalho",
            texto:
              "Combustível, material e taxas do seu trabalho saem antes do seu salário. Misturar as duas coisas faz parecer que sobra quando não sobra.",
          },
        ],
      },
    ],
  },
  {
    id: "cartao",
    titulo: "O cartão no lugar certo",
    resumo: "Como parar de fechar o mês no cartão sem deixar nada para trás.",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "O cartão de crédito não é o vilão: ele só adianta o dinheiro do mês que vem. O problema começa quando o mês de hoje passa a ser pago com o salário do próximo, e o do próximo com o do outro.",
      },
      {
        tipo: "passos",
        itens: [
          {
            titulo: "Congele o cartão no dia a dia",
            texto:
              "Apague o cartão salvo nos aplicativos de delivery, transporte e compras. No dia a dia, só débito ou Pix, dentro do valor da semana.",
          },
          {
            titulo: "Pague a fatura inteira sempre que der",
            texto:
              "O que não é pago vai para o rotativo, um dos créditos mais caros do país. Se não der para pagar tudo, o parcelamento da fatura costuma sair mais barato que o rotativo: compare o custo efetivo total antes.",
          },
          {
            titulo: "Faça a fatura diminuir mês a mês",
            texto:
              "A meta é simples: cada fatura menor que a anterior. Quando ela couber inteira no mês, o cartão volta a ser só um meio de pagamento.",
          },
          {
            titulo: "Não confunda limite com dinheiro",
            texto:
              "Limite do cartão e limite da conta são empréstimos já aprovados. Eles não aumentam o seu salário, só adiantam o aperto.",
          },
        ],
      },
    ],
  },
  {
    id: "armadilhas",
    titulo: "Armadilhas do fim do mês",
    resumo: "Atalhos que parecem resolver e deixam o próximo mês mais curto.",
    blocos: [
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "Parcelado sem juros, de novo e de novo",
            texto:
              "Cada parcela pequena parece caber. Somadas, elas tomam o salário dos próximos meses antes de ele chegar.",
          },
          {
            titulo: "Parcelar o Pix ou o boleto no aplicativo",
            texto: "É um empréstimo com juros, mesmo quando aparece como uma facilidade do aplicativo.",
          },
          {
            titulo: "Compre agora, pague depois",
            texto: "Também é crédito. Entra na conta das parcelas e no aperto do mês que vem.",
          },
          {
            titulo: "Usar o limite da conta como se fosse saldo",
            texto:
              "O cheque especial cobra juros de até 8% ao mês, desde o primeiro dia. Saldo negativo é dívida, não dinheiro.",
          },
          {
            titulo: "Empréstimo pré-aprovado",
            texto:
              "Aparece fácil no aplicativo justamente no fim do mês. Resolve o hoje e tira dinheiro de todos os meses seguintes.",
          },
          {
            titulo: "Antecipar o que ainda vai receber",
            texto:
              "Adiantar salário, 13º, restituição do imposto ou FGTS é pegar emprestado o próprio dinheiro, pagando juros por isso.",
          },
          {
            titulo: "Pagar só o mínimo da fatura",
            texto: "O resto vai para os juros mais altos do mercado e volta maior no mês seguinte.",
          },
          {
            titulo: "Teste grátis que vira cobrança",
            texto:
              "Ao assinar um teste, anote no calendário o dia em que ele acaba e cancele antes, se não for usar.",
          },
          {
            titulo: "Promoção de só hoje",
            texto:
              "Urgência é técnica de venda. Se não estava na lista, espere 48 horas: quase sempre a vontade passa e a promoção volta.",
          },
          {
            titulo: "Apostar para fechar o mês",
            texto:
              "Aposta não é renda. Se as apostas fazem parte do aperto, peça a autoexclusão nas plataformas e procure apoio: Jogadores Anônimos e os CAPS do SUS atendem de graça.",
          },
        ],
      },
    ],
  },
  {
    id: "direitos",
    titulo: "Seus direitos, em português claro",
    resumo: "O que a lei garante e ajuda a não perder dinheiro.",
    blocos: [
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "Sete dias para desistir de compra online",
            texto:
              "Comprou pela internet, por telefone ou fora da loja? Você tem sete dias, a partir da compra ou do recebimento, para desistir e receber o dinheiro de volta, sem precisar explicar o motivo.",
          },
          {
            titulo: "Cancelar tem que ser possível",
            texto:
              "Em telefonia, internet, TV por assinatura, energia, bancos e planos de saúde, o atendimento precisa aceitar o pedido de cancelamento e informar um número de protocolo. Anote o protocolo e guarde.",
          },
          {
            titulo: "Cobrança indevida volta em dobro",
            texto:
              "Pagou uma cobrança que não devia? O Código de Defesa do Consumidor garante a devolução em dobro do que foi pago a mais, salvo engano justificável. Reclame primeiro com a empresa e, se não resolver, no consumidor.gov.br ou no Procon.",
          },
          {
            titulo: "Juros do cartão têm teto",
            texto:
              "No rotativo e no parcelamento da fatura, juros e encargos não podem passar de 100% do valor original, para dívidas feitas a partir de janeiro de 2024. E o rotativo dura no máximo 30 dias: depois, o banco deve oferecer um parcelamento mais barato.",
          },
          {
            titulo: "Cheque especial tem limite de juros",
            texto: "O teto é de 8% ao mês. Continua caro: é para sair dele o quanto antes.",
          },
          {
            titulo: "Pagar antes dá desconto",
            texto:
              "Quem antecipa parcelas ou quita um empréstimo antes do prazo tem direito à redução proporcional dos juros.",
          },
          {
            titulo: "Desconto na conta de luz",
            texto:
              "Famílias de baixa renda inscritas no Cadastro Único podem ter desconto na conta de luz pela tarifa social de energia. A inscrição é feita no CRAS da sua cidade.",
          },
        ],
      },
    ],
  },
  {
    id: "mensagens",
    titulo: "Mensagens prontas",
    resumo: "Para cancelar, baixar contas e combinar o plano em casa.",
    blocos: [
      {
        tipo: "mensagem",
        quando: "Para cancelar uma assinatura ou um serviço",
        texto:
          "Olá. Quero cancelar o serviço [nome do serviço], vinculado ao CPF ou e-mail [seu dado], com efeito imediato. Peço a confirmação do cancelamento e o número de protocolo.",
      },
      {
        tipo: "mensagem",
        quando: "Para baixar o plano de celular, internet ou TV",
        texto:
          "Olá. Sou cliente há [tempo] e quero baixar o valor do meu plano. Quais opções vocês têm por um valor menor? Se não houver, vou avaliar a portabilidade para outra operadora.",
      },
      {
        tipo: "mensagem",
        quando: "Para contestar uma cobrança que você não reconhece",
        texto:
          "Olá. Na minha fatura de [mês] aparece uma cobrança de R$ [valor] de [nome] que eu não reconheço. Peço o estorno e o número de protocolo do pedido.",
      },
      {
        tipo: "mensagem",
        quando: "Para combinar o plano com quem mora com você",
        texto:
          "Fiz as contas do nosso mês e montei um plano para o dinheiro chegar ao fim. A ideia é ter um valor por semana para o dia a dia da casa e separar um pouco para imprevistos logo que o dinheiro entra. Topa tentar comigo por 30 dias?",
      },
    ],
  },
  {
    id: "checklist",
    titulo: "Checklist da semana",
    resumo: "Dez minutos, sempre no mesmo dia.",
    blocos: [
      {
        tipo: "marcar",
        itens: [
          "Passei o valor da semana para o dia a dia",
          "A semana passada fechou dentro do valor",
          "Anotei os gastos da semana",
          "Não usei o cartão de crédito no dia a dia",
          "Não fiz nenhuma parcela nova",
          "As contas da semana foram pagas no prazo",
          "O pote do futuro continua intocado",
          "Cancelei ou ajustei pelo menos uma coisa que não uso",
        ],
      },
    ],
  },
  {
    id: "ajuda",
    titulo: "Onde buscar ajuda de graça",
    resumo: "Serviços públicos e gratuitos que valem o contato.",
    blocos: [
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "consumidor.gov.br",
            texto: "Reclamações para empresas, com prazo para resposta. Bom para cobranças indevidas e cancelamentos que travam.",
          },
          {
            titulo: "Procon",
            texto: "Orientação e mediação com empresas, e atendimento a quem está com dívidas que não consegue pagar.",
          },
          {
            titulo: "CRAS",
            texto:
              "Cadastro Único, benefícios sociais e tarifa social de energia, que aliviam o pote das contas fixas.",
          },
          {
            titulo: "Defensoria Pública",
            texto: "Advogado gratuito para quem não pode pagar, inclusive em problemas com bancos e lojas.",
          },
          {
            titulo: "CVV, telefone 188",
            texto: "Apoio emocional gratuito, 24 horas por dia. Viver no aperto pesa, e conversar ajuda.",
          },
        ],
      },
    ],
  },
  {
    id: "glossario",
    titulo: "Glossário rápido",
    resumo: "As palavras que aparecem no plano e no banco.",
    blocos: [
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "Gasto fixo",
            texto: "Tem valor e data quase certos todo mês, como aluguel, luz e internet.",
          },
          {
            titulo: "Gasto do dia a dia",
            texto: "Muda conforme as escolhas do mês, como mercado, lanche, lazer e compras.",
          },
          {
            titulo: "Reserva de emergência",
            texto: "Dinheiro guardado só para imprevistos, como remédio, conserto ou um mês sem renda.",
          },
          {
            titulo: "Rotativo",
            texto: "Crédito automático usado quando você paga menos que o total da fatura do cartão.",
          },
          {
            titulo: "Cheque especial",
            texto: "O limite da conta: um empréstimo usado automaticamente quando o saldo fica negativo.",
          },
          {
            titulo: "CET",
            texto:
              "Custo efetivo total. Soma juros, tarifas, seguros e impostos de um crédito. É o número certo para comparar propostas.",
          },
        ],
      },
    ],
  },
];

export const AVISO_LEGAL =
  "Este material é educativo e foi gerado a partir das informações que você forneceu. Os valores e prazos são estimativas e não substituem orientação jurídica ou financeira individual. As regras citadas valem na data de geração do plano e podem mudar.";
