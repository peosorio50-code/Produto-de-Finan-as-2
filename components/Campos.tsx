"use client";

import { useId } from "react";
import { milhar } from "@/lib/formato";

const MAXIMO = 9_999_999;

/** Campo de valor em reais inteiros, com teclado numérico no celular. */
export function CampoDinheiro({
  rotulo,
  ajuda,
  valor,
  aoMudar,
  erro,
}: {
  rotulo: string;
  ajuda?: string;
  valor: number;
  aoMudar: (valor: number) => void;
  erro?: string;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      {ajuda && (
        <span className="campo__ajuda" id={`${id}-ajuda`}>
          {ajuda}
        </span>
      )}
      <div className="entrada-dinheiro">
        <span className="entrada-dinheiro__moeda" aria-hidden="true">
          R$
        </span>
        <input
          id={id}
          className="entrada"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={valor > 0 ? milhar(valor) : ""}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, "").slice(0, 8);
            aoMudar(Math.min(digitos ? parseInt(digitos, 10) : 0, MAXIMO));
          }}
          aria-invalid={erro ? true : undefined}
          aria-describedby={[ajuda ? `${id}-ajuda` : "", erro ? `${id}-erro` : ""].join(" ").trim() || undefined}
        />
      </div>
      {erro && (
        <span className="campo__erro" id={`${id}-erro`} role="alert">
          {erro}
        </span>
      )}
    </div>
  );
}

interface PropsCartoes<T extends string> {
  /** Pergunta visível acima dos cartões. Sem ela, use `rotuladoPor` com o id do título da tela. */
  legenda?: string;
  rotuladoPor?: string;
  ajuda?: string;
  opcoes: Record<T, string>;
  /** Linha menor embaixo de cada opção. */
  detalhes?: Partial<Record<T, string>>;
  /** Cartões em duas colunas, para opções curtas. */
  grade?: boolean;
  erro?: string;
}

function Cabeca({ id, legenda, ajuda }: { id: string; legenda?: string; ajuda?: string }) {
  if (!legenda) return null;
  return (
    <div className="cartoes__legenda" id={id}>
      {legenda}
      {ajuda && <span className="campo__ajuda">{ajuda}</span>}
    </div>
  );
}

/**
 * Respostas de quiz em que só uma vale. Cada opção é um botão: tocar escolhe
 * (e, se a tela quiser, já avança para a próxima pergunta).
 */
export function Cartoes<T extends string>({
  valor,
  aoEscolher,
  ...p
}: PropsCartoes<T> & { valor: T | ""; aoEscolher: (valor: T) => void }) {
  const id = useId();
  return (
    <div className="pilha-cartoes">
      <Cabeca id={id} legenda={p.legenda} ajuda={p.ajuda} />
      <div
        className={p.grade ? "cartoes cartoes--grade" : "cartoes"}
        role="group"
        aria-labelledby={p.legenda ? id : p.rotuladoPor}
        aria-describedby={p.erro ? `${id}-erro` : undefined}
      >
        {(Object.keys(p.opcoes) as T[]).map((chave) => (
          <button
            key={chave}
            type="button"
            className="cartao"
            aria-pressed={valor === chave}
            onClick={() => aoEscolher(chave)}
          >
            <span className="cartao__marca" aria-hidden="true" />
            <span className="cartao__texto">
              {p.opcoes[chave]}
              {p.detalhes?.[chave] && <span className="cartao__detalhe">{p.detalhes[chave]}</span>}
            </span>
          </button>
        ))}
      </div>
      {p.erro && (
        <span className="campo__erro" id={`${id}-erro`} role="alert">
          {p.erro}
        </span>
      )}
    </div>
  );
}

/** Respostas de quiz em que várias podem valer ao mesmo tempo. */
export function CartoesMultiplos<T extends string>({
  valores,
  aoMudar,
  ...p
}: PropsCartoes<T> & { valores: T[]; aoMudar: (valores: T[]) => void }) {
  const id = useId();
  return (
    <div className="pilha-cartoes">
      <Cabeca id={id} legenda={p.legenda} ajuda={p.ajuda} />
      <div
        className={p.grade ? "cartoes cartoes--grade" : "cartoes"}
        role="group"
        aria-labelledby={p.legenda ? id : p.rotuladoPor}
        aria-describedby={p.erro ? `${id}-erro` : undefined}
      >
        {(Object.keys(p.opcoes) as T[]).map((chave) => {
          const marcado = valores.includes(chave);
          return (
            <button
              key={chave}
              type="button"
              className="cartao cartao--multiplo"
              aria-pressed={marcado}
              onClick={() => aoMudar(marcado ? valores.filter((v) => v !== chave) : [...valores, chave])}
            >
              <span className="cartao__marca" aria-hidden="true" />
              <span className="cartao__texto">
                {p.opcoes[chave]}
                {p.detalhes?.[chave] && <span className="cartao__detalhe">{p.detalhes[chave]}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {p.erro && (
        <span className="campo__erro" id={`${id}-erro`} role="alert">
          {p.erro}
        </span>
      )}
    </div>
  );
}
