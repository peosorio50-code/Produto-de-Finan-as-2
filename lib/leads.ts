/**
 * Leads do quiz. Cada evento do funil é gravado no banco do servidor (tabelas
 * `leads` e `eventos`, em lib/db.ts) e, se LEADS_WEBHOOK_URL estiver
 * configurada, também é enviado por webhook para outra ferramenta (Make,
 * Zapier, n8n, planilha Google, CRM...).
 */
import { MARCA, PRECO_REAIS } from "./config";
import { agora, db } from "./db";
import { perfilDaSituacao } from "./perfil";
import {
  ROTULOS_COMO_FECHA,
  ROTULOS_OBJETIVO,
  ROTULOS_QUANDO_ACABA,
  ROTULOS_RESERVA,
  ROTULOS_SENTIMENTO,
  ROTULOS_VAZAMENTO,
} from "./rotulos";
import type { Contato, Diagnostico, Origem, Respostas } from "./tipos";

export type EventoLead =
  | "quiz_iniciado"
  | "quiz_concluido"
  | "checkout_iniciado"
  /** Avisos da Kiwify: */
  | "pix_gerado"
  | "compra_recusada"
  | "carrinho_abandonado"
  | "compra_aprovada"
  | "reembolso"
  | "plano_gerado";

export interface ResumoLead {
  perfil: string;
  nivel: number;
  nivelRotulo: string;
  rendaMensal: number;
  contasFixas: number;
  diaADia: number;
  parcelas: number;
  gastoInvisivel: number;
  /** Negativa = o mês não fecha. */
  sobraMes: number;
  /** null = o dinheiro dura o mês inteiro. */
  diaQueAcaba: number | null;
  quandoAcaba: string;
  comoFecha: string[];
  vazamentos: string[];
  reserva: string;
  objetivo: string;
  sentimento: string;
}

export interface Lead {
  evento: EventoLead;
  enviadoEm: string;
  produto: string;
  contato: {
    nome: string;
    primeiroNome: string;
    email: string;
    /** Só dígitos, com DDD. Pode vir vazio nos avisos da Kiwify. */
    telefone: string;
    /** Formato internacional, pronto para link de WhatsApp: 5511912345678 */
    whatsapp: string;
  };
  origem: Origem;
  resultado?: ResumoLead;
  pedido?: { ref: string; valor: number; linkPagamento?: string; linkPlano?: string };
}

export function resumirParaLead(r: Respostas, d: Diagnostico): ResumoLead {
  return {
    perfil: perfilDaSituacao(r, d).titulo,
    nivel: d.nivel,
    nivelRotulo: d.nivelRotulo,
    rendaMensal: d.renda,
    contasFixas: d.gastosFixos,
    diaADia: d.gastosDiaADia,
    parcelas: d.parcelasMes,
    gastoInvisivel: d.gastoInvisivel,
    sobraMes: d.sobraMes,
    diaQueAcaba: d.diaQueAcaba,
    quandoAcaba: ROTULOS_QUANDO_ACABA[r.quandoAcaba],
    comoFecha: r.comoFecha.map((c) => ROTULOS_COMO_FECHA[c]),
    vazamentos: r.vazamentos.map((v) => ROTULOS_VAZAMENTO[v]),
    reserva: ROTULOS_RESERVA[r.reserva],
    objetivo: ROTULOS_OBJETIVO[r.objetivo],
    sentimento: ROTULOS_SENTIMENTO[r.sentimento],
  };
}

export function montarLead(args: {
  evento: EventoLead;
  contato: Contato;
  origem?: Origem;
  resultado?: ResumoLead;
  pedido?: { ref: string; linkPagamento?: string; linkPlano?: string };
}): Lead {
  const { contato } = args;
  return {
    evento: args.evento,
    enviadoEm: new Date().toISOString(),
    produto: MARCA.nome,
    contato: {
      nome: contato.nome,
      primeiroNome: contato.nome.split(" ")[0],
      email: contato.email,
      telefone: contato.telefone,
      whatsapp: contato.telefone ? `55${contato.telefone}` : "",
    },
    origem: args.origem ?? {},
    ...(args.resultado && { resultado: args.resultado }),
    ...(args.pedido && { pedido: { ...args.pedido, valor: PRECO_REAIS } }),
  };
}

/**
 * Grava o lead no banco: atualiza a ficha da pessoa (uma por e-mail) e
 * acrescenta o evento ao histórico. Nunca lança erro.
 */
export function salvarLead(lead: Lead): boolean {
  try {
    const banco = db();
    const email = lead.contato.email.toLowerCase();
    const momento = agora();
    const origem = Object.keys(lead.origem).length > 0 ? JSON.stringify(lead.origem) : null;
    banco
      .prepare(
        `INSERT INTO leads (email, nome, telefone, origem, resultado, ultimo_evento, criado_em, atualizado_em)
         VALUES (?, ?, ?, COALESCE(?, '{}'), ?, ?, ?, ?)
         ON CONFLICT (email) DO UPDATE SET
           nome = CASE WHEN excluded.nome <> '' THEN excluded.nome ELSE leads.nome END,
           telefone = CASE WHEN excluded.telefone <> '' THEN excluded.telefone ELSE leads.telefone END,
           -- guarda a primeira campanha que trouxe a pessoa
           origem = CASE WHEN leads.origem = '{}' AND ? IS NOT NULL THEN ? ELSE leads.origem END,
           resultado = COALESCE(excluded.resultado, leads.resultado),
           ultimo_evento = excluded.ultimo_evento,
           atualizado_em = excluded.atualizado_em`,
      )
      .run(
        email,
        lead.contato.nome,
        lead.contato.telefone,
        origem,
        lead.resultado ? JSON.stringify(lead.resultado) : null,
        lead.evento,
        momento,
        momento,
        origem,
        origem,
      );
    banco
      .prepare("INSERT INTO eventos (em, evento, email, ref, detalhe) VALUES (?, ?, ?, ?, ?)")
      .run(
        momento,
        lead.evento,
        email,
        lead.pedido?.ref ?? null,
        lead.pedido?.linkPagamento ? JSON.stringify({ linkPagamento: lead.pedido.linkPagamento }) : null,
      );
    return true;
  } catch (erro) {
    console.error(`[lead] falha ao gravar ${lead.evento} no banco:`, erro instanceof Error ? erro.message : erro);
    return false;
  }
}

/**
 * Grava o lead no banco e, se houver webhook configurado, envia para ele.
 * Nunca lança erro: uma falha aqui não pode atrapalhar o quiz nem a compra.
 */
export async function registrarLead(lead: Lead): Promise<void> {
  salvarLead(lead);
  await enviarLead(lead);
}

/** Envia o lead ao webhook externo (opcional). Devolve se o envio foi aceito. */
export async function enviarLead(lead: Lead): Promise<boolean> {
  const url = process.env.LEADS_WEBHOOK_URL;
  if (!url) return false;
  const cabecalhos: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.LEADS_WEBHOOK_TOKEN) cabecalhos.Authorization = `Bearer ${process.env.LEADS_WEBHOOK_TOKEN}`;
  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resposta.ok) {
      console.error(`[lead] webhook respondeu ${resposta.status} ao evento ${lead.evento}`);
      return false;
    }
    return true;
  } catch (erro) {
    console.error(`[lead] falha ao enviar ${lead.evento}:`, erro instanceof Error ? erro.message : erro);
    return false;
  }
}
