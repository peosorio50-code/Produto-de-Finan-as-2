/**
 * Mantém servidor/mesinteiro_exemplo.json igual ao que o site manda de verdade.
 * O servidor usa esse arquivo no modo de teste (MOCK_IA=1), no comando
 * "mesinteiro.py teste EMAIL" e no teste ponta a ponta em Python.
 * Para atualizar depois de mudar o motor: ATUALIZAR_EXEMPLO=1 npm test
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { diagnosticar } from "@/lib/diagnostico";
import { EXEMPLO } from "@/lib/exemplo";
import { dadosParaIA } from "@/lib/ia-dados";
import { narrativaPadrao } from "@/lib/narrativa-padrao";
import { resumoParaServidor } from "@/lib/resumo";
import type { Respostas } from "@/lib/tipos";

const ARQUIVO = new URL("../servidor/mesinteiro_exemplo.json", import.meta.url);

function montar() {
  const respostas: Respostas = { ...EXEMPLO, nome: "Ana" };
  const d = diagnosticar(respostas);
  const ia = narrativaPadrao(respostas, d);
  return {
    respostas,
    resumo: resumoParaServidor(respostas, d, true),
    dadosIA: dadosParaIA(respostas, d),
    // No modo de teste, o "texto da IA" é a versão padrão do mesmo caso.
    ia: { ...ia, recado: `${ia.recado} (texto de teste)` },
  };
}

describe("exemplo do servidor", () => {
  it("está em dia com o motor do site", () => {
    const esperado = JSON.stringify(montar(), null, 1) + "\n";
    if (process.env.ATUALIZAR_EXEMPLO === "1") writeFileSync(ARQUIVO, esperado);
    expect(readFileSync(ARQUIVO, "utf8")).toBe(esperado);
  });
});
