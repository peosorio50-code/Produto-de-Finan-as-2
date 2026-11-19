import { z } from "zod";
import { telefoneValido } from "./contato";
import { LIMITES } from "./limites";
import type { Contato, Origem, Respostas } from "./tipos";

const reais = z.number().finite().min(0).max(LIMITES.maxValor).transform((v) => Math.round(v));

/** Só letras, números, espaços e pontuação simples: o texto livre vai para o prompt da IA. */
function limparTexto(texto: string, max: number): string {
  return texto
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} .'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const COMO_FECHA = ["cartao", "cheque_especial", "emprestimo", "familia", "atraso_contas", "aperto"] as const;
const VAZAMENTOS = [
  "delivery",
  "compras_online",
  "saidas",
  "assinaturas",
  "mercado",
  "app_transporte",
  "ajuda_familia",
  "apostas",
  "nao_sei",
] as const;

const esquema = z.object({
  nome: z
    .string()
    .max(200)
    .transform((t) => limparTexto(t, LIMITES.maxNome))
    .refine((t) => t.length >= 1, "Informe seu nome"),
  quandoAcaba: z.enum(["primeira_semana", "metade", "ultima_semana", "chega_justo", "sobra"]),
  pessoasNaCasa: z.number().int().min(1).max(20),
  tipoRenda: z.enum(["fixa", "variavel", "mista"]),
  rendaMensal: reais.refine((v) => v >= 1, "Informe quanto entra por mês"),
  recebimento: z.enum(["inicio", "meio_fim", "quinzenal", "aos_poucos"]),
  gastos: z.object({
    moradia: reais,
    contas: reais,
    transporte: reais,
    saude_educacao: reais,
    assinaturas: reais,
    mercado: reais,
    comer_fora: reais,
    compras_lazer: reais,
    outros: reais,
  }),
  parcelas: z.object({ cartao: reais, emprestimos: reais }),
  fatura: z.enum(["inteira", "minimo_ou_parcela", "atrasada", "nao_uso"]),
  comoFecha: z.array(z.enum(COMO_FECHA)).max(COMO_FECHA.length),
  vazamentos: z.array(z.enum(VAZAMENTOS)).max(VAZAMENTOS.length),
  controle: z.enum(["nenhum", "as_vezes", "sempre"]),
  reserva: z.enum(["nenhuma", "menos_1_mes", "mais_1_mes"]),
  sentimento: z.enum(["ansioso", "culpado", "cansado", "tranquilo"]),
  objetivo: z.enum(["fim_do_mes", "sair_do_cartao", "reserva", "saber_para_onde", "juntar_objetivo"]),
});

/**
 * Valida e normaliza as respostas vindas do navegador. Devolve um objeto com
 * as chaves sempre na mesma ordem e as listas ordenadas: o pedido é amarrado
 * ao hash dele (lib/pedido.ts), então qualquer mudança aqui invalida pedidos
 * já feitos.
 */
export function sanitizarRespostas(entrada: unknown): Respostas | null {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) return null;
  const r = resultado.data;
  return {
    nome: r.nome,
    quandoAcaba: r.quandoAcaba,
    pessoasNaCasa: r.pessoasNaCasa,
    tipoRenda: r.tipoRenda,
    rendaMensal: r.rendaMensal,
    recebimento: r.recebimento,
    gastos: {
      moradia: r.gastos.moradia,
      contas: r.gastos.contas,
      transporte: r.gastos.transporte,
      saude_educacao: r.gastos.saude_educacao,
      assinaturas: r.gastos.assinaturas,
      mercado: r.gastos.mercado,
      comer_fora: r.gastos.comer_fora,
      compras_lazer: r.gastos.compras_lazer,
      outros: r.gastos.outros,
    },
    parcelas: { cartao: r.parcelas.cartao, emprestimos: r.parcelas.emprestimos },
    fatura: r.fatura,
    // Quem diz que sobra dinheiro não responde como fecha o mês.
    comoFecha: r.quandoAcaba === "sobra" ? [] : [...new Set(r.comoFecha)].sort(),
    vazamentos: [...new Set(r.vazamentos)].sort(),
    controle: r.controle,
    reserva: r.reserva,
    sentimento: r.sentimento,
    objetivo: r.objetivo,
  };
}

const esquemaContato = z.object({
  nome: z
    .string()
    .max(200)
    .transform((t) => limparTexto(t, LIMITES.maxNomeCompleto))
    .refine((t) => t.length >= 2, "Informe seu nome"),
  email: z
    .string()
    .max(200)
    .transform((t) => t.trim().toLowerCase())
    .pipe(z.email()),
  telefone: z
    .string()
    .max(40)
    .transform((t) => t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
    .refine(telefoneValido, "Telefone inválido"),
});

export function sanitizarContato(entrada: unknown): Contato | null {
  const resultado = esquemaContato.safeParse(entrada);
  return resultado.success ? resultado.data : null;
}

const CHAVES_ORIGEM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"] as const;

/** Mantém só os parâmetros de campanha conhecidos, com texto curto. */
export function sanitizarOrigem(entrada: unknown): Origem {
  const saida: Origem = {};
  if (!entrada || typeof entrada !== "object") return saida;
  for (const chave of CHAVES_ORIGEM) {
    const valor = (entrada as Record<string, unknown>)[chave];
    if (typeof valor === "string" && valor.trim()) {
      saida[chave] = valor.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 200);
    }
  }
  return saida;
}
