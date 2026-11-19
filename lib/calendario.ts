/**
 * O calendário do mês que vai no plano: o que fazer em cada momento, conforme
 * o jeito como o dinheiro entra. Sai das regras, com os números do raio-x.
 */
import { brl } from "./formato";
import type { Diagnostico, MomentoDoMes, Respostas } from "./tipos";

function valor(d: Diagnostico, id: Diagnostico["potes"][number]["id"]): string {
  return brl(d.potes.find((p) => p.id === id)?.valor ?? 0);
}

export function calendarioDoMes(r: Respostas, d: Diagnostico): MomentoDoMes[] {
  const semana = brl(d.livrePorSemana);
  const contas = valor(d, "contas");
  const parcelas = d.parcelasMes > 0 ? ` e as parcelas (${valor(d, "parcelas")})` : "";
  const futuro =
    d.guardarPorMes > 0 ? `Separe ${valor(d, "futuro")} para o futuro, antes de qualquer outro gasto. ` : "";
  const momentos: MomentoDoMes[] = [];

  const toda_segunda: MomentoDoMes = {
    quando: "Toda segunda-feira",
    oQueFazer: `Passe ${semana} para a conta ou o cartão de débito do dia a dia. É o que dá para gastar até a segunda seguinte com mercado, lanches, lazer e o resto. Se acabar antes, a semana termina no aperto, mas o pote das contas não é tocado.`,
  };

  switch (r.recebimento) {
    case "inicio":
    case "meio_fim":
      if (r.recebimento === "meio_fim") {
        momentos.push({
          quando: "Antes de tudo",
          oQueFazer:
            "Seu mês começa no dia do pagamento, não no dia 1. Conte as semanas a partir dele e marque no calendário do celular.",
        });
      }
      momentos.push({
        quando: "No dia em que o salário cai",
        oQueFazer: `${futuro}Reserve as contas fixas (${contas})${parcelas}. Se der, coloque as contas em débito automático para os dias logo depois do pagamento: conta paga cedo não disputa espaço com o resto.`,
      });
      momentos.push(toda_segunda);
      break;
    case "quinzenal":
      momentos.push({
        quando: "No primeiro pagamento do mês",
        oQueFazer: `${futuro}Pague as contas que vencem até o segundo pagamento. O resto do dinheiro fica parado até a segunda-feira.`,
      });
      momentos.push({
        quando: "No segundo pagamento",
        oQueFazer: `Pague o restante das contas fixas (no total, ${contas})${parcelas}. O que sobrar completa o pote do dia a dia.`,
      });
      momentos.push(toda_segunda);
      break;
    case "aos_poucos":
      momentos.push({
        quando: "A cada valor que entra",
        oQueFazer:
          "Tudo vai para uma conta de entrada, separada da conta do dia a dia. Nada se gasta direto dali.",
      });
      momentos.push({
        quando: "Toda segunda-feira",
        oQueFazer: `Transfira ${semana} da conta de entrada para a conta do dia a dia: é o seu salário da semana. Ele é o mesmo no mês bom e no mês fraco.`,
      });
      momentos.push({
        quando: "Quando a conta de entrada juntar o valor das contas",
        oQueFazer: `Pague as contas fixas (${contas})${parcelas}. ${futuro}O que passar disso fica na conta de entrada como colchão para o próximo mês fraco.`,
      });
      break;
  }

  if (d.faltaComAjustes > 0) {
    momentos.push({
      quando: "Enquanto o mês não fecha",
      oQueFazer: `Mesmo com os ajustes, faltam ${brl(d.faltaComAjustes)} por mês. Não cubra a diferença com cartão: decida antes de qual grupo ela sai e trabalhe para aumentar a renda ou baixar as parcelas.`,
    });
  }
  momentos.push({
    quando: "No último fim de semana do mês",
    oQueFazer:
      "Dez minutos para conferir: os potes fecharam? Anote o grupo que estourou e ajuste a meta do mês seguinte. Plano bom é plano revisado.",
  });
  return momentos;
}
