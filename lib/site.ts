/** Endereço de produção, usado nos metadados quando SITE_URL não está definido. */
export const SITE_PADRAO = "https://mesinteiro.folegofinanceiro.shop";

/** Endereço público para metadados, robots e sitemap. */
export const urlPublica = () => (process.env.SITE_URL || SITE_PADRAO).replace(/\/$/, "");

/** Endereço público do site, sem barra no final. Na VPS, SITE_URL é obrigatório. */
export function urlDoSite(origemDaRequisicao?: string): string {
  return (process.env.SITE_URL || origemDaRequisicao || "http://localhost:3000").replace(/\/$/, "");
}

export const linkDoPlano = (site: string, ref: string) => `${site}/plano?ref=${ref}`;
