import { ROTULOS_NIVEL } from "@/lib/diagnostico";
import { brl, pct } from "@/lib/formato";
import type { Diagnostico, Nivel } from "@/lib/tipos";

export const FRASE_NIVEL: Record<Nivel, string> = {
  1: "O mês fecha. O próximo passo é dar destino ao que sobra.",
  2: "O mês fecha no limite: qualquer imprevisto desequilibra.",
  3: "O dinheiro acaba antes do mês, e a diferença vira aperto ou crédito.",
  4: "Hoje o mês não fecha. O primeiro passo é impedir que o buraco cresça.",
};

/** Escala de quatro níveis com o nível da pessoa em destaque. */
export function EscalaNivel({ nivel }: { nivel: Nivel }) {
  return (
    <div>
      <p className="so-leitor">
        Nível {nivel} de 4: {ROTULOS_NIVEL[nivel]}
      </p>
      <ol className="nivel" aria-hidden="true">
        {([1, 2, 3, 4] as Nivel[]).map((n) => (
          <li key={n} className="nivel__faixa" data-n={n} data-ativo={n === nivel} data-passou={n < nivel}>
            {ROTULOS_NIVEL[n]}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * O mês em 30 quadradinhos: verde enquanto o dinheiro cobre, vermelho depois.
 * `ate` é o último dia coberto; null = o mês inteiro.
 */
export function CalendarioMes({ ate, rotulo, legenda = true }: { ate: number | null; rotulo: string; legenda?: boolean }) {
  const dias = Array.from({ length: 30 }, (_, i) => i + 1);
  const descricao =
    ate === null
      ? "O dinheiro cobre os 30 dias do mês."
      : `O dinheiro cobre do dia 1 ao dia ${ate}. Do dia ${ate + 1} ao dia 30, não.`;
  return (
    <figure className="calendario">
      <figcaption className="calendario__rotulo">{rotulo}</figcaption>
      <p className="so-leitor">{descricao}</p>
      <ol className="calendario__grade" aria-hidden="true">
        {dias.map((dia) => (
          <li
            key={dia}
            className="calendario__dia"
            data-estado={ate === null || dia <= ate ? "coberto" : "descoberto"}
            data-marca={dia === ate ? true : undefined}
          >
            {dia}
          </li>
        ))}
      </ol>
      {legenda && (
        <div className="calendario__legenda pequeno" aria-hidden="true">
          <span data-estado="coberto">Com dinheiro</span>
          {ate !== null && <span data-estado="descoberto">No aperto ou no crédito</span>}
        </div>
      )}
    </figure>
  );
}

/** Os números principais do mês, em formato de extrato. */
export function LinhasDiagnostico({ d }: { d: Diagnostico }) {
  return (
    <dl className="linhas">
      <div className="linhas__item">
        <dt>Entra por mês</dt>
        <dd className="positivo">{brl(d.renda)}</dd>
      </div>
      <div className="linhas__item">
        <dt>
          Contas fixas
          <span className="linhas__nota">Moradia, contas da casa, transporte, saúde e assinaturas</span>
        </dt>
        <dd>{brl(d.gastosFixos)}</dd>
      </div>
      {d.parcelasMes > 0 && (
        <div className="linhas__item">
          <dt>
            Parcelas
            <span className="linhas__nota">Cartão, empréstimos, financiamentos e carnês</span>
          </dt>
          <dd>{brl(d.parcelasMes)}</dd>
        </div>
      )}
      <div className="linhas__item">
        <dt>
          Dia a dia
          <span className="linhas__nota">Mercado, delivery, compras, lazer e o resto</span>
        </dt>
        <dd>{brl(d.gastosDiaADia)}</dd>
      </div>
      {d.gastoInvisivel > 0 && (
        <div className="linhas__item">
          <dt>
            Gastos que não aparecem nas contas
            <span className="linhas__nota">Estimativa pelo dia em que o dinheiro acaba</span>
          </dt>
          <dd className="negativo">{brl(d.gastoInvisivel)}</dd>
        </div>
      )}
      <div className="linhas__item">
        <dt>
          Parte do salário que já chega com destino
          <span className="linhas__nota">Contas fixas e parcelas. Acima de 70%, aperta</span>
        </dt>
        <dd className={d.comprometimento > 0.7 ? "negativo" : undefined}>{pct(d.comprometimento)}</dd>
      </div>
      <div className="linhas__item">
        <dt>
          {d.sobraMes < 0 ? "Falta no fim do mês" : "Sobra no fim do mês"}
          <span className="linhas__nota">O que entra menos tudo o que sai</span>
        </dt>
        <dd className={d.sobraMes < 0 ? "negativo" : "positivo"}>{brl(Math.abs(d.sobraMes))}</dd>
      </div>
      <div className="linhas__item">
        <dt>O dinheiro dura</dt>
        <dd className={d.diaQueAcaba === null ? "positivo" : "negativo"}>
          {d.diaQueAcaba === null ? "O mês inteiro" : `Até o dia ${d.diaQueAcaba}`}
        </dd>
      </div>
    </dl>
  );
}
