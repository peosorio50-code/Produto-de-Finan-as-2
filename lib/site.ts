/** Endereço público do site, sem barra no final. Na VPS, SITE_URL é obrigatório. */
export function urlDoSite(origemDaRequisicao?: string): string {
  return (process.env.SITE_URL || origemDaRequisicao || "http://localhost:3000").replace(/\/$/, "");
}

export const linkDoPlano = (site: string, ref: string) => `${site}/plano?ref=${ref}`;
