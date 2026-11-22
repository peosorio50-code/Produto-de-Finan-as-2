/**
 * Identidade e oferta do produto. Para mudar nome ou preço, altere aqui. O
 * e-mail de atendimento, o pixel e o upsell ficam em public/config.js.
 */
export const MARCA = {
  nome: "Mês Inteiro",
  /** A marca guarda-chuva, dona do domínio folegofinanceiro.shop. */
  casa: "Fôlego Financeiro",
  slogan: "Quiz gratuito do seu salário",
  descricao:
    "Responda a um quiz rápido e descubra, de graça, em que dia o seu salário acaba, para onde ele vai e por onde começar a fazer o dinheiro chegar ao dia 30.",
  /** Preço em centavos. 2990 = R$ 29,90. */
  precoCentavos: 2990,
  /** Nome que aparece na fatura do cartão do comprador (até 13 letras, sem acento). */
  nomeNaFatura: "MESINTEIRO",
  garantiaDias: 7,
} as const;

export const PRECO_REAIS = MARCA.precoCentavos / 100;
