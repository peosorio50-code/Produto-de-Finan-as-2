/**
 * Recuperação de venda por e-mail.
 *
 * Quem termina o quiz e não compra recebe até três e-mails, um por vez, com
 * pelo menos 12 horas entre eles:
 * 1. "resultado" (1 h depois do quiz): o resultado guardado, com link que
 *    abre em qualquer aparelho, e o primeiro passo;
 * 2. "plano" (24 h): o que o plano do mês faz com os números da pessoa;
 * 3. "ultimo" (72 h): último lembrete, com a garantia.
 *
 * A sequência para quando a pessoa compra ou pede para sair. Quem roda é o
 * cron da VPS, de hora em hora (mesinteiro-admin recuperar), pela rota
 * /api/tarefas/recuperar.
 */
import { MARCA, PRECO_REAIS } from "./config";
import { agora, db, json } from "./db";
import { linkDescadastro, linkDescadastroDireto, segredoTarefas } from "./descadastro";
import { diagnosticar } from "./diagnostico";
import { botaoEmail, emailConfigurado, enviarEmail, escapar, moldura } from "./email";
import { brl, brlCentavos, pct } from "./formato";
import { perfilDaSituacao, primeiroPasso } from "./perfil";
import type { Contato, Respostas } from "./tipos";
import { sanitizarContato, sanitizarRespostas } from "./validacao";

export type Etapa = "resultado" | "plano" | "ultimo";

export const ETAPAS: { id: Etapa; horas: number }[] = [
  { id: "resultado", horas: 1 },
  { id: "plano", horas: 24 },
  { id: "ultimo", horas: 72 },
];

/** Depois do prazo da etapa, quanto tempo ainda vale mandar (se o cron ficou parado, não manda e-mail velho). */
const JANELA_HORAS = 72;
const INTERVALO_MINIMO_HORAS = 12;
const HORA = 60 * 60 * 1000;

export function recuperacaoConfigurada(): boolean {
  return emailConfigurado() && segredoTarefas() !== null;
}

export interface Candidato {
  email: string;
  token: string;
  etapa: Etapa;
  contato: Contato;
  respostas: Respostas;
}

/** Quem deve receber o e-mail de uma etapa agora. */
export function candidatos(etapa: Etapa, agoraMs = Date.now(), limite = 100): Candidato[] {
  const indice = ETAPAS.findIndex((e) => e.id === etapa);
  const { horas } = ETAPAS[indice];
  const anterior = indice > 0 ? ETAPAS[indice - 1].id : null;
  const ate = new Date(agoraMs - horas * HORA).toISOString();
  const desde = new Date(agoraMs - (horas + JANELA_HORAS) * HORA).toISOString();
  const pausa = new Date(agoraMs - INTERVALO_MINIMO_HORAS * HORA).toISOString();

  const linhas = db()
    .prepare(
      `SELECT r.email, r.token, r.contato, r.respostas FROM resultados r
       WHERE r.criado_em = (SELECT MAX(r2.criado_em) FROM resultados r2 WHERE r2.email = r.email)
         AND r.criado_em <= ? AND r.criado_em >= ?
         AND NOT EXISTS (SELECT 1 FROM descadastros d WHERE d.email = r.email)
         AND NOT EXISTS (SELECT 1 FROM envios e WHERE e.email = r.email AND e.etapa = ?)
         AND NOT EXISTS (SELECT 1 FROM envios e WHERE e.email = r.email AND e.enviado_em > ?)
         AND (? IS NULL OR EXISTS (SELECT 1 FROM envios e WHERE e.email = r.email AND e.etapa = ?))
         AND NOT EXISTS (SELECT 1 FROM compras c WHERE c.email = r.email AND c.status = 'pago')
         AND NOT EXISTS (SELECT 1 FROM pedidos p JOIN compras c ON c.ref = p.ref
                         WHERE p.email = r.email AND c.status = 'pago')
       ORDER BY r.criado_em LIMIT ?`,
    )
    .all(ate, desde, etapa, pausa, anterior, anterior, limite) as {
    email: string;
    token: string;
    contato: string;
    respostas: string;
  }[];

  return linhas.flatMap((l) => {
    const respostas = sanitizarRespostas(json(l.respostas));
    const contato = sanitizarContato(json(l.contato));
    return respostas && contato ? [{ email: l.email, token: l.token, etapa, contato, respostas }] : [];
  });
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? "";

/** O texto de cada e-mail, com os números da pessoa. */
export function montarEmailDeRecuperacao(c: Candidato, site: string) {
  const d = diagnosticar(c.respostas);
  const perfil = perfilDaSituacao(c.respostas, d);
  const nome = primeiroNome(c.contato.nome);
  const saudacao = nome ? `Oi, ${nome}!` : "Oi!";
  const link = `${site}/resultado?r=${c.token}&utm_source=email&utm_medium=recuperacao&utm_campaign=${c.etapa}`;
  const sair = linkDescadastro(site, c.email) ?? "";

  let assunto: string;
  let corpo: string[];
  let botao: string;
  switch (c.etapa) {
    case "resultado": {
      const passo = primeiroPasso(c.respostas, d);
      assunto = nome ? `${nome}, aqui está o resultado do seu quiz` : "Aqui está o resultado do seu quiz";
      corpo = [
        `Aqui está o resultado do seu quiz do ${MARCA.nome}, para você ter guardado.`,
        `Seu tipo de mês: ${perfil.titulo}. ${perfil.resumo}`,
        `Por onde começar: ${passo.titulo.toLowerCase()}. ${passo.texto}`,
        "Quando quiser o caminho inteiro, o plano do mês divide o seu salário em quatro potes e mostra quanto dá para gastar por semana para o dinheiro chegar ao dia 30.",
      ];
      botao = "Ver meu resultado completo";
      break;
    }
    case "plano": {
      const maior = d.vazamentos[0];
      const gancho = d.sinais.temGastoInvisivel
        ? `cerca de ${brl(d.gastoInvisivel)} por mês saem sem aparecer nas suas contas`
        : maior
          ? `só em ${maior.rotulo.toLowerCase()} saem ${brl(maior.porMes)} por mês, ou ${brl(maior.porAno)} no ano`
          : `${pct(d.comprometimento)} do salário já chega com destino certo`;
      assunto = "O dinheiro do dia 25 sendo gasto no dia 5";
      corpo = [
        "O que mais faz o dinheiro acabar antes do mês quase nunca é um gasto grande. É o dinheiro do dia 25 sendo gasto no dia 5, quando ele parece sobrar.",
        `No seu caso, ${gancho}.`,
        `O plano do mês faz a conta inteira com os seus números: o salário dividido em quatro potes, quanto dá para gastar por semana, onde ajustar${
          d.ajustesTotal > 0 ? ` (no seu caso, cerca de ${brl(d.ajustesTotal)} por mês)` : ""
        }, o calendário do mês, regras, reserva e um desafio de 30 dias.`,
        `Fica pronto em cerca de um minuto, por ${brlCentavos(PRECO_REAIS)}, com ${MARCA.garantiaDias} dias de garantia.`,
      ];
      botao = "Ver meu resultado e o plano";
      break;
    }
    case "ultimo":
      assunto = "Seu resultado continua guardado";
      corpo = [
        "Este é o último e-mail sobre o seu quiz. O resultado continua guardado no link abaixo, e o plano do mês continua disponível se você quiser que o próximo mês seja diferente.",
        "O plano começa no dia do pagamento: é nele que o futuro sai primeiro e o dia a dia vira um valor por semana.",
        `Se não fizer sentido para você, são ${MARCA.garantiaDias} dias para pedir o dinheiro de volta.`,
      ];
      botao = "Abrir meu resultado";
      break;
  }

  const rodape = `Você recebe este e-mail porque fez o quiz do ${MARCA.nome} com este endereço.`;
  const texto = [
    saudacao,
    "",
    ...corpo.flatMap((p) => [p, ""]),
    `${botao}: ${link}`,
    "",
    `Equipe ${MARCA.nome}`,
    "",
    sair ? `${rodape} Para não receber mais: ${sair}` : rodape,
  ].join("\n");
  const html = moldura(`<p>${escapar(saudacao)}</p>
${corpo.map((p) => `<p>${escapar(p)}</p>`).join("\n")}
${botaoEmail(link, botao)}
<p>Equipe ${escapar(MARCA.nome)}</p>
<p style="color:#777;font-size:13px">${escapar(rodape)}${
    sair ? ` <a href="${escapar(sair)}" style="color:#777">Não quero mais receber estes e-mails</a>.` : ""
  }</p>`);
  return { assunto, texto, html };
}

function registrarEnvio(c: Candidato): void {
  db()
    .prepare("INSERT OR IGNORE INTO envios (email, etapa, token, enviado_em) VALUES (?, ?, ?, ?)")
    .run(c.email, c.etapa, c.token, agora());
}

const esperar = (ms: number) => new Promise((pronto) => setTimeout(pronto, ms));

/** Manda os e-mails devidos agora. Devolve quantos saíram por etapa. */
export async function rodarRecuperacao(
  site: string,
  opcoes: { limite?: number; pausaMs?: number; agoraMs?: number } = {},
): Promise<{ configurada: boolean; enviados: number; falhas: number; porEtapa: Partial<Record<Etapa, number>> }> {
  const resumo = { configurada: recuperacaoConfigurada(), enviados: 0, falhas: 0, porEtapa: {} as Partial<Record<Etapa, number>> };
  if (!resumo.configurada) return resumo;
  let restante = opcoes.limite ?? 100;
  // Do fim para o começo: quem está mais adiantado na sequência recebe primeiro,
  // e ninguém recebe duas etapas na mesma rodada.
  for (const { id } of [...ETAPAS].reverse()) {
    if (restante <= 0) break;
    for (const c of candidatos(id, opcoes.agoraMs, restante)) {
      const sair = linkDescadastroDireto(site, c.email);
      const ok = await enviarEmail({
        para: c.email,
        ...montarEmailDeRecuperacao(c, site),
        ...(sair && {
          cabecalhos: { "List-Unsubscribe": `<${sair}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        }),
      });
      if (ok) {
        registrarEnvio(c);
        resumo.enviados += 1;
        resumo.porEtapa[id] = (resumo.porEtapa[id] ?? 0) + 1;
      } else {
        resumo.falhas += 1;
      }
      restante -= 1;
      if (opcoes.pausaMs) await esperar(opcoes.pausaMs);
    }
  }
  return resumo;
}
