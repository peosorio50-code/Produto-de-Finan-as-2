import type { CSSProperties } from "react";
import { diagnosticar } from "@/lib/diagnostico";
import { EXEMPLO } from "@/lib/exemplo";
import { brl } from "@/lib/formato";

/**
 * Peça central da página inicial: a folha do mês de um caso fictício, com as
 * anotações que o resultado gratuito faz. Os números saem do mesmo motor que
 * calcula o resultado de verdade.
 */
export function CalendarioAnotado() {
  const d = diagnosticar(EXEMPLO);
  const ate = d.diaQueAcaba ?? 30;
  const dias = Array.from({ length: 30 }, (_, i) => i + 1);
  const ordem = (n: number) => ({ "--ordem": n }) as CSSProperties;

  return (
    <figure className="folha" aria-label="Exemplo de resultado feito pelo Mês Inteiro">
      <div className="folha__cabeca">
        <span className="folha__titulo">
          O mês de um salário de <span className="numero">{brl(d.renda)}</span>
        </span>
        <span className="pequeno apoio">Exemplo</span>
      </div>

      <ol className="folha__grade" aria-hidden="true">
        {dias.map((dia) => (
          <li
            key={dia}
            className="folha__dia"
            data-estado={dia <= ate ? "coberto" : "descoberto"}
            data-marca={dia === ate ? true : undefined}
          >
            {dia}
          </li>
        ))}
      </ol>
      <p className="folha__nota caneta" style={ordem(0)}>
        dia {ate}: o dinheiro acabou
      </p>

      <ul className="folha__lista">
        {d.vazamentos.slice(0, 2).map((v, i) => (
          <li key={v.categoria} className="folha__item">
            <div className="folha__linha">
              <span>{v.rotulo}</span>
              <span className="folha__pontos" aria-hidden="true" />
              <span className="numero">{brl(v.porMes)}</span>
            </div>
            <span className="folha__anotacao caneta" style={ordem(i + 1)}>
              {brl(v.porAno)} por ano
            </span>
          </li>
        ))}
      </ul>

      <p className="folha__conclusao caneta" style={ordem(3)}>
        <span className="marca-texto" style={ordem(4)}>
          {30 - ate} dias no cartão
        </span>{" "}
        todo mês
      </p>

      <figcaption className="pequeno apoio" style={{ marginTop: "1.25rem" }}>
        Caso fictício, calculado pelo mesmo sistema que faz o seu resultado. O seu depende das suas
        respostas.
      </figcaption>
    </figure>
  );
}
