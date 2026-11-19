/** Checagens do contato, sem dependências, para rodar no navegador e no servidor. */

/** Telefone brasileiro com DDD: 10 dígitos (fixo) ou 11 (celular, começando com 9). */
export function telefoneValido(digitos: string): boolean {
  if (!/^[1-9][1-9]\d{8,9}$/.test(digitos)) return false;
  return digitos.length === 10 ? /^[2-5]/.test(digitos.slice(2)) : digitos[2] === "9";
}

/** Checagem simples no formulário; o servidor confere de novo. */
export function emailPareceValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
