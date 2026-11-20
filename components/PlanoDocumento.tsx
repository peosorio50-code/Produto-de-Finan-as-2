"use client";

import { useState } from "react";
import { CalendarioMes, EscalaNivel, FRASE_NIVEL, LinhasDiagnostico } from "@/components/Resumo";
import { MARCA } from "@/lib/config";
import { lembretesIcs } from "@/lib/lembretes";
import { brl, dataExtenso, duracao, pct } from "@/lib/formato";
import { AVISO_LEGAL, GUIA, type BlocoGuia } from "@/lib/guia";
import type { Diagnostico, PlanoCompleto } from "@/lib/tipos";

function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="botao-texto pequeno nao-imprimir"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          // Sem permissão de área de transferência: a pessoa ainda pode selecionar o texto.
        }
      }}
    >
      {copiado ? "Mensagem copiada" : "Copiar mensagem"}
    </button>
  );
}

function Mensagem({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mensagem">
      <p className="pequeno apoio">{titulo}</p>
      <p className="mensagem__texto">{texto}</p>
      <BotaoCopiar texto={texto} />
    </div>
  );
}

const DESCRICAO_POTE: Record<Diagnostico["potes"][number]["id"], string> = {
  contas: "Sai no dia do pagamento",
  parcelas: "Nenhuma parcela nova",
  dia_a_dia: "Dividido por semana",
  futuro: "Separado antes de tudo",
};

function Potes({ d }: { d: Diagnostico }) {
  return (
    <>
      <ul className="potes">
        {d.potes.map((pote) => (
          <li key={pote.id} className="pote" data-pote={pote.id}>
            <span className="pote__nome">{pote.rotulo}</span>
            <span className="pote__valor numero">{brl(pote.valor)}</span>
            <span className="pote__nota pequeno apoio">
              {pote.id === "futuro" && pote.valor === 0 ? "Começa quando o mês sobrar" : DESCRICAO_POTE[pote.id]}
            </span>
          </li>
        ))}
      </ul>
      <div className="semanal">
        <p className="pequeno apoio">Seu dinheiro do dia a dia</p>
        <p className="semanal__valor numero">{brl(d.livrePorSemana)}</p>
        <p className="semanal__por">por semana</p>
        <p className="pequeno apoio">Para mercado, delivery, compras, lazer e o resto. Acabou, acabou até segunda.</p>
      </div>
    </>
  );
}

/** Baixa os lembretes do plano (.ics) para o calendário do celular. */
function BotaoLembretes({ d }: { d: Diagnostico }) {
  const [baixado, setBaixado] = useState(false);
  return (
    <div className="pilha nao-imprimir">
      <button
        type="button"
        className="botao botao--contorno botao--compacto"
        onClick={() => {
          const arquivo = new Blob([lembretesIcs(d)], { type: "text/calendar;charset=utf-8" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(arquivo);
          link.download = "mes-inteiro-lembretes.ics";
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
          setBaixado(true);
        }}
      >
        Colocar os lembretes no meu calendário
      </button>
      <p className="pequeno apoio" role="status">
        {baixado
          ? "Abra o arquivo baixado e confirme: os lembretes entram no calendário do celular."
          : `Toda segunda, o valor da semana (${brl(d.livrePorSemana)}); todo domingo, a conferência; e o fechamento do mês. Funciona com Google, Apple e Outlook.`}
      </p>
    </div>
  );
}

/** Folha para imprimir (ou copiar num caderno) e acompanhar as semanas do mês. */
function FolhaDeControle({ d }: { d: Diagnostico }) {
  const valor = (id: Diagnostico["potes"][number]["id"]) => d.potes.find((p) => p.id === id)?.valor ?? 0;
  const marcar = [
    d.guardarPorMes > 0 ? `Separei o futuro no dia do pagamento (${brl(d.guardarPorMes)})` : "",
    `Paguei as contas fixas (${brl(valor("contas"))})`,
    d.parcelasMes > 0 ? `Paguei as parcelas (${brl(d.parcelasMes)}) e não fiz nenhuma nova` : "",
    "Não usei o cartão de crédito no dia a dia",
  ].filter(Boolean);
  return (
    <>
      <div className="tabela-rolagem">
        <table className="tabela folha-controle">
          <thead>
            <tr>
              <th scope="col">Semana</th>
              <th scope="col">Valor</th>
              <th scope="col">Gastei</th>
              <th scope="col">Sobrou</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((n) => (
              <tr key={n}>
                <td>Semana {n}</td>
                <td>{brl(d.livrePorSemana)}</td>
                <td className="folha-controle__escrever" aria-label="para preencher" />
                <td className="folha-controle__escrever" aria-label="para preencher" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="lista-caixas">
        {marcar.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="pequeno apoio">
        Alguns meses têm cinco segundas-feiras: na quinta semana, use o que sobrou das outras. Imprima esta
        folha junto com o plano ou copie para um caderno.
      </p>
    </>
  );
}

function prazo(meses: number | null): string {
  if (meses === null) return "quando o mês fechar com sobra";
  if (meses > 60) return "mais de 5 anos no ritmo de hoje";
  return `em ${duracao(meses)}`;
}

function Reserva({ d }: { d: Diagnostico }) {
  const contaHoje = d.em12Meses.ritmoAtual;
  return (
    <>
      {!d.sinais.semReserva && (
        <p className="apoio">
          Você contou que já tem algum dinheiro guardado. Conte o que já tem como parte da primeira meta.
        </p>
      )}
      <ol className="metas">
        {d.metasReserva.map((meta) => (
          <li key={meta.rotulo} className="meta">
            <span className="meta__nome">{meta.rotulo}</span>
            <span className="meta__valor numero">{brl(meta.valor)}</span>
            <span className="meta__prazo pequeno apoio">{prazo(meta.meses)}</span>
          </li>
        ))}
      </ol>
      <div className="cenarios">
        <div className="cenario cenario--atual">
          <p className="pequeno apoio">Em 12 meses, do jeito que está</p>
          <p className={`cenario__prazo ${contaHoje < 0 ? "negativo" : ""}`}>
            {contaHoje < 0 ? `${brl(-contaHoje)} a menos` : `${brl(contaHoje)} sem destino`}
          </p>
          <p>
            {contaHoje < 0
              ? "Esse dinheiro vira cartão, cheque especial ou conta atrasada, e isso antes dos juros."
              : "É o que sobra no papel. Sem destino no dia do pagamento, costuma sumir no dia a dia."}
          </p>
        </div>
        <div className="cenario cenario--plano">
          <p className="pequeno apoio">Em 12 meses, seguindo o plano</p>
          <p className="cenario__prazo positivo">
            {d.faltaComAjustes > 0
              ? `${brl(d.faltaComAjustes * 12)} ainda faltando`
              : d.guardarPorMes > 0
                ? `${brl(d.guardarPorMes * 12)} guardados`
                : "O mês fechando"}
          </p>
          <p>
            {d.faltaComAjustes > 0
              ? "Menos do que hoje, mas ainda falta. O resto se fecha com renda extra e parcelas menores."
              : d.guardarPorMes > 0
                ? `Separando ${brl(d.guardarPorMes)} no dia do pagamento, todo mês.`
                : "Sem cartão para cobrir o fim do mês. O futuro começa quando sobrar."}
          </p>
        </div>
      </div>
      <p className="pequeno apoio">
        São estimativas feitas com os valores que você informou. Cada ajuste que você fizer além das
        metas encurta os prazos.
      </p>
    </>
  );
}

function Bloco({ bloco }: { bloco: BlocoGuia }) {
  switch (bloco.tipo) {
    case "paragrafo":
      return <p>{bloco.texto}</p>;
    case "lista":
      return (
        <ul className="lista-pontos">
          {bloco.itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "marcar":
      return (
        <ul className="lista-caixas">
          {bloco.itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "passos":
      return (
        <ol className="lista-numerada">
          {bloco.itens.map((item) => (
            <li key={item.titulo}>
              <strong>{item.titulo}.</strong> {item.texto}
            </li>
          ))}
        </ol>
      );
    case "topicos":
      return (
        <dl className="topicos">
          {bloco.itens.map((item) => (
            <div key={item.titulo}>
              <dt>{item.titulo}</dt>
              <dd>{item.texto}</dd>
            </div>
          ))}
        </dl>
      );
    case "mensagem":
      return <Mensagem titulo={bloco.quando} texto={bloco.texto} />;
  }
}

export function PlanoDocumento({ plano }: { plano: PlanoCompleto }) {
  const { diagnostico: d, narrativa: n, calendario } = plano;

  return (
    <article>
      <header className="documento__capa">
        <p className="apoio">
          {MARCA.nome}, gerado em {dataExtenso(plano.geradoEm)}
        </p>
        <h1 className="titulo-1">Plano do mês de {plano.nome}</h1>
        <EscalaNivel nivel={d.nivel} />
        <p className="destaque">{FRASE_NIVEL[d.nivel]}</p>
        <div className="acoes-plano nao-imprimir">
          <button type="button" className="botao botao--compacto" onClick={() => window.print()}>
            Salvar em PDF ou imprimir
          </button>
        </div>
        <p className="pequeno apoio nao-imprimir">
          Na janela que abrir, escolha “Salvar como PDF”. O plano também fica guardado neste navegador.
        </p>
      </header>

      <section className="bloco">
        <h2 className="titulo-2">Seu mês hoje</h2>
        {n.leitura.map((paragrafo) => (
          <p key={paragrafo}>{paragrafo}</p>
        ))}
        <CalendarioMes
          ate={d.diaQueAcaba}
          rotulo={d.diaQueAcaba === null ? "Hoje: o dinheiro chega ao dia 30" : `Hoje: o dinheiro dura até o dia ${d.diaQueAcaba}`}
        />
        <LinhasDiagnostico d={d} />
      </section>

      <section className="bloco">
        <h2 className="titulo-2">O que mais pesa no seu caso</h2>
        <dl className="topicos">
          {n.pontosCriticos.map((ponto) => (
            <div key={ponto.titulo}>
              <dt>{ponto.titulo}</dt>
              <dd>{ponto.explicacao}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Seu novo mês</h2>
        <p className="apoio">
          No dia em que o dinheiro entra, ele é dividido em quatro potes. Somados, eles dão os seus{" "}
          {brl(d.renda)}
          {d.faltaComAjustes > 0 ? `, mais os ${brl(d.faltaComAjustes)} que ainda faltam` : ""}.
        </p>
        <Potes d={d} />
        <CalendarioMes
          ate={d.diaComPlano}
          rotulo={d.diaComPlano === null ? "Com o plano: o dinheiro chega ao dia 30" : `Com o plano: o dinheiro dura até o dia ${d.diaComPlano}`}
          legenda={false}
        />
        {d.faltaComAjustes > 0 && (
          <p className="aviso aviso--erro">
            Mesmo com todos os ajustes, faltam {brl(d.faltaComAjustes)} por mês. Não cubra a diferença com
            cartão: o plano mostra como fechar o resto com renda e parcelas menores.
          </p>
        )}
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Onde ajustar</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Grupo</th>
                <th scope="col">Hoje</th>
                <th scope="col">Da renda</th>
                <th scope="col">Meta</th>
              </tr>
            </thead>
            <tbody>
              {d.orcamento
                .filter((l) => l.atual > 0)
                .map((linha) => (
                  <tr key={linha.categoria}>
                    <td>{linha.rotulo}</td>
                    <td>{brl(linha.atual)}</td>
                    <td className={linha.acima ? "negativo" : undefined}>{pct(linha.parteDaRenda)}</td>
                    <td className={linha.ajuste > 0 ? "positivo" : undefined}>{brl(linha.meta)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total por mês</td>
                <td>{brl(d.gastosFixos + d.gastosDiaADia + d.gastoInvisivel)}</td>
                <td />
                <td className="positivo">{brl(d.gastosFixos + d.gastosDiaADia + d.gastoInvisivel - d.ajustesTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {d.ajustesTotal > 0 && (
          <p>
            Os ajustes liberam <strong className="numero positivo">{brl(d.ajustesTotal)}</strong> por mês, ou{" "}
            {brl(d.ajustesTotal * 12)} por ano.
          </p>
        )}
        <dl className="topicos">
          {n.ajustes.map((ajuste) => (
            <div key={ajuste.categoria}>
              <dt>{ajuste.categoria}</dt>
              <dd>{ajuste.sugestao}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">O calendário do seu mês</h2>
        <ol className="momentos">
          {calendario.map((momento) => (
            <li key={momento.quando} className="momento">
              <h3 className="titulo-3">{momento.quando}</h3>
              <p>{momento.oQueFazer}</p>
            </li>
          ))}
        </ol>
        <BotaoLembretes d={d} />
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Sua folha de controle</h2>
        <FolhaDeControle d={d} />
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Suas regras do mês</h2>
        <ol className="regras">
          {n.regrasDoMes.map((regra) => (
            <li key={regra.regra} className="regra">
              <strong>{regra.regra}</strong>
              <span className="apoio">{regra.porque}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Sua reserva</h2>
        <Reserva d={d} />
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Seus primeiros 7 dias</h2>
        <ol className="lista-numerada">
          {n.primeiros7Dias.map((acao) => (
            <li key={acao}>{acao}</li>
          ))}
        </ol>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">O desafio de 30 dias</h2>
        <div className="semanas">
          {n.desafio30Dias.map((semana) => (
            <div key={semana.semana} className="semana">
              <p className="pequeno apoio">{semana.semana}</p>
              <h3 className="titulo-3">{semana.foco}</h3>
              <ul className="lista-pontos">
                {semana.acoes.map((acao) => (
                  <li key={acao}>{acao}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Mensagens prontas</h2>
        <div className="pilha">
          {n.mensagens.map((mensagem) => (
            <Mensagem key={mensagem.titulo} titulo={mensagem.titulo} texto={mensagem.texto} />
          ))}
        </div>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Os próximos 90 dias</h2>
        <ul className="lista-pontos">
          {n.proximos90Dias.map((marco) => (
            <li key={marco}>{marco}</li>
          ))}
        </ul>
        <p className="destaque">{n.recado}</p>
      </section>

      <section className="bloco bloco--final">
        <h2 className="titulo-1">Guia {MARCA.nome}</h2>
        <p className="destaque apoio">
          A parte que acompanha todo plano: o método, as regras do jogo e os modelos para consultar
          sempre que precisar.
        </p>
        {GUIA.map((capitulo) => (
          <section key={capitulo.id} className="capitulo-guia">
            <h3 className="titulo-2">{capitulo.titulo}</h3>
            <p className="apoio">{capitulo.resumo}</p>
            {capitulo.blocos.map((bloco, i) => (
              <Bloco key={i} bloco={bloco} />
            ))}
          </section>
        ))}
        <p className="pequeno apoio">{AVISO_LEGAL}</p>
      </section>
    </article>
  );
}
