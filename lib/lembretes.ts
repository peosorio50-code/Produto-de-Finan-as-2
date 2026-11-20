/**
 * Lembretes do plano para o calendário do celular (arquivo .ics, que Google,
 * Apple e Outlook abrem): o valor da semana toda segunda, a conferência de
 * domingo e o fechamento do mês. Roda no navegador, no horário local.
 */
import { MARCA } from "./config";
import { brl } from "./formato";
import type { Diagnostico } from "./tipos";

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** Data e hora "flutuante" (sem fuso): vale no fuso de quem abre. */
function dataLocal(d: Date, hora: number): string {
  return `${d.getFullYear()}${doisDigitos(d.getMonth() + 1)}${doisDigitos(d.getDate())}T${doisDigitos(hora)}0000`;
}

function dataUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Próximo dia da semana (0 = domingo) a partir de amanhã. */
function proximo(diaDaSemana: number, aPartir: Date): Date {
  const d = new Date(aPartir.getFullYear(), aPartir.getMonth(), aPartir.getDate() + 1);
  while (d.getDay() !== diaDaSemana) d.setDate(d.getDate() + 1);
  return d;
}

/** Último sábado do mês que ainda não passou (o deste mês ou o do próximo). */
function ultimoSabado(aPartir: Date): Date {
  for (let mais = 0; mais < 2; mais++) {
    const d = new Date(aPartir.getFullYear(), aPartir.getMonth() + mais + 1, 0);
    while (d.getDay() !== 6) d.setDate(d.getDate() - 1);
    if (d > aPartir) return d;
  }
  return proximo(6, aPartir);
}

const escaparTexto = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Linhas de .ics não podem passar de 75 bytes: as longas continuam na linha seguinte, com um espaço. */
function dobrar(linha: string): string[] {
  const partes: string[] = [];
  let atual = "";
  for (const caractere of linha) {
    if (new TextEncoder().encode(atual + caractere).length > (partes.length === 0 ? 75 : 74)) {
      partes.push(atual);
      atual = "";
    }
    atual += caractere;
  }
  partes.push(atual);
  return partes.map((p, i) => (i === 0 ? p : ` ${p}`));
}

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  inicio: Date;
  hora: number;
  regra: string;
}

export function lembretesIcs(d: Diagnostico, agora: Date = new Date()): string {
  const semana = brl(d.livrePorSemana);
  const futuro = d.guardarPorMes > 0 ? ` No próximo pagamento, separe ${brl(d.guardarPorMes)} para o futuro antes de tudo.` : "";
  const eventos: Evento[] = [
    {
      id: "semana",
      titulo: `Passar ${semana} para o dia a dia`,
      descricao: `Valor da semana para mercado, delivery, compras, lazer e o resto. Acabou, acabou até a próxima segunda. (${MARCA.nome})`,
      inicio: proximo(1, agora),
      hora: 8,
      regra: "FREQ=WEEKLY;BYDAY=MO",
    },
    {
      id: "conferir",
      titulo: "Conferir a semana (10 minutos)",
      descricao: `A semana fechou dentro dos ${semana}? Anote os gastos, veja o que estourou e confira se o pote do futuro continua intocado. (${MARCA.nome})`,
      inicio: proximo(0, agora),
      hora: 19,
      regra: "FREQ=WEEKLY;BYDAY=SU",
    },
    {
      id: "mes",
      titulo: "Fechar o mês",
      descricao: `Confira os quatro potes, anote o grupo que mais estourou e ajuste as metas do mês seguinte.${futuro} (${MARCA.nome})`,
      inicio: ultimoSabado(agora),
      hora: 10,
      regra: "FREQ=MONTHLY;BYDAY=-1SA",
    },
  ];
  const carimbo = dataUtc(agora);
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${MARCA.nome}//Plano do mes//PT-BR`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...eventos.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.id}-${carimbo}@mesinteiro`,
      `DTSTAMP:${carimbo}`,
      `DTSTART:${dataLocal(e.inicio, e.hora)}`,
      "DURATION:PT15M",
      `RRULE:${e.regra}`,
      `SUMMARY:${escaparTexto(`${MARCA.nome}: ${e.titulo}`)}`,
      `DESCRIPTION:${escaparTexto(e.descricao)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escaparTexto(e.titulo)}`,
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return linhas.flatMap(dobrar).join("\r\n") + "\r\n";
}
