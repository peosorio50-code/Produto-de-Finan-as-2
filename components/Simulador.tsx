"use client";

import { useMemo, useState } from "react";
import { CalendarioMes } from "@/components/Resumo";
import { opcoesDeSimulacao, simularDia } from "@/lib/diagnostico";
import { brl } from "@/lib/formato";
import type { Diagnostico } from "@/lib/tipos";

/**
 * "E se?": a pessoa liga e desliga mudanças simples e vê o calendário do mês
 * mudar na hora. Mostra o valor do plano sem entregar o plano.
 */
export function Simulador({ d }: { d: Diagnostico }) {
  const opcoes = useMemo(() => opcoesDeSimulacao(d), [d]);
  const [ligadas, setLigadas] = useState<string[]>([]);

  if (d.diaQueAcaba === null || opcoes.length === 0) return null;

  const escolhidas = opcoes.filter((o) => ligadas.includes(o.id));
  const corte = escolhidas.reduce((soma, o) => soma + o.corte, 0);
  const corteInvisivel = escolhidas.find((o) => o.id === "invisivel")?.corte ?? 0;
  const dia = corte > 0 ? simularDia(d, corte - corteInvisivel, corteInvisivel) : d.diaQueAcaba;
  const ganho = dia === null ? 30 - d.diaQueAcaba : Math.max(0, dia - d.diaQueAcaba);

  return (
    <section className="bloco">
      <h2 className="titulo-2">E se…?</h2>
      <p className="apoio">Toque nas mudanças e veja até onde o dinheiro iria.</p>
      <div className="cartoes" role="group" aria-label="Mudanças para testar">
        {opcoes.map((opcao) => {
          const ligada = ligadas.includes(opcao.id);
          return (
            <button
              key={opcao.id}
              type="button"
              className="cartao cartao--multiplo"
              aria-pressed={ligada}
              onClick={() => setLigadas((atual) => (ligada ? atual.filter((id) => id !== opcao.id) : [...atual, opcao.id]))}
            >
              <span className="cartao__marca" aria-hidden="true" />
              <span className="cartao__texto">
                {opcao.rotulo}
                <span className="cartao__detalhe">{brl(opcao.corte)} a menos por mês</span>
              </span>
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        <CalendarioMes
          ate={dia}
          legenda={false}
          rotulo={
            corte === 0
              ? `Hoje: até o dia ${d.diaQueAcaba}`
              : dia === null
                ? "Com essas mudanças: chega ao dia 30"
                : `Com essas mudanças: até o dia ${dia}${ganho > 0 ? `, ${ganho} ${ganho === 1 ? "dia" : "dias"} a mais` : ""}`
          }
        />
      </div>
      {corte > 0 && (
        <p>
          {dia === null
            ? "Com essas mudanças, o dinheiro chega ao fim do mês."
            : "Uma ou duas mudanças sozinhas raramente fecham o mês."}{" "}
          {d.ajustesTotal > 0 && (
            <>
              O plano completo junta todos os ajustes do seu caso, cerca de{" "}
              <strong className="numero">{brl(d.ajustesTotal)}</strong> por mês,{" "}
              {d.faltaComAjustes === 0
                ? "e faz o dinheiro chegar ao dia 30."
                : "e mostra como fechar o que ainda faltar."}
            </>
          )}
        </p>
      )}
      <p className="pequeno apoio">
        Simulação com os valores que você informou. O plano completo faz essa conta para todos os grupos do
        seu orçamento e transforma o resultado num valor por semana.
      </p>
    </section>
  );
}
