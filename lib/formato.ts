const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const moedaCentavos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** Espaço que não quebra linha: "R$" nunca fica numa linha e o número na outra. */
const ESPACO_FIXO = "\u00a0";
const fixarEspaco = (texto: string) => texto.replace(/[\s\u00a0\u202f]/g, ESPACO_FIXO);

/** R$ 1.234 — sem centavos, para valores do raio-x. */
export function brl(valor: number): string {
  return fixarEspaco(moeda.format(Math.round(valor)));
}

/** R$ 29,90 — com centavos, para preço. */
export function brlCentavos(valor: number): string {
  return fixarEspaco(moedaCentavos.format(valor));
}

export function milhar(valor: number): string {
  return inteiro.format(Math.round(valor));
}

/** 0.324 -> "32%" */
export function pct(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}

/** 0.085 -> "8,5%" */
export function pctTaxa(fracao: number): string {
  const v = fracao * 100;
  const texto = Number.isInteger(Math.round(v * 10) / 10) ? String(Math.round(v)) : v.toFixed(1).replace(".", ",");
  return `${texto}%`;
}

/** 21 -> "1 ano e 9 meses" */
export function duracao(meses: number): string {
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes: string[] = [];
  if (anos > 0) partes.push(anos === 1 ? "1 ano" : `${anos} anos`);
  if (resto > 0 || anos === 0) partes.push(resto === 1 ? "1 mês" : `${resto} meses`);
  return partes.join(" e ");
}

export function dataExtenso(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

/** "11912345678" -> "(11) 91234-5678", formatando aos poucos enquanto a pessoa digita. */
export function mascaraTelefone(digitos: string): string {
  const d = digitos.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  const corte = d.length === 11 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}
