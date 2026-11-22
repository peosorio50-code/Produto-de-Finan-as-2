"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Compartilhar } from "@/components/Compartilhar";
import { CalendarioMes, EscalaNivel, FRASE_NIVEL, LinhasDiagnostico } from "@/components/Resumo";
import { Simulador } from "@/components/Simulador";
import {
  gravarContato,
  gravarPedido,
  gravarRespostas,
  lerContato,
  lerOrigem,
  lerPedido,
  lerPlano,
  lerRespostas,
} from "@/lib/armazenamento";
import { api, config, postar } from "@/lib/api";
import { MARCA, PRECO_REAIS } from "@/lib/config";
import { diagnosticar } from "@/lib/diagnostico";
import { contar } from "@/lib/eventos";
import { brl, brlCentavos, pct } from "@/lib/formato";
import { dadosParaIA } from "@/lib/ia-dados";
import { leituraGratuita } from "@/lib/narrativa-padrao";
import { rastrear } from "@/lib/pixel";
import { ACOLHIMENTO, itensDoPlano, perfilDaSituacao } from "@/lib/perfil";
import {
  FRASE_QUANDO_ACABA,
  ROTULOS_OBJETIVO,
  ROTULOS_QUANDO_ACABA,
  ROTULOS_SENTIMENTO,
  ROTULOS_VAZAMENTO,
} from "@/lib/rotulos";
import { resumoParaServidor } from "@/lib/resumo";
import type { Contato, Diagnostico, Origem, Respostas } from "@/lib/tipos";
import { sanitizarRespostas } from "@/lib/validacao";

const ERROS: Record<string, string> = {
  pagamento_nao_configurado: "O plano completo ainda não está à venda. Tente de novo em alguns dias.",
  respostas_invalidas: "Alguma resposta ficou incompleta. Revise o quiz e tente de novo.",
  falha_no_pagamento: "Não conseguimos abrir o pagamento agora. Tente de novo em alguns minutos.",
};

function Cadeado() {
  return (
    <svg className="trancado__cadeado" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.5 7V5a3.5 3.5 0 1 1 7 0v2h.5A1.5 1.5 0 0 1 13.5 8.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4 7h.5Zm1.5 0h4V5a2 2 0 1 0-4 0v2Z"
      />
    </svg>
  );
}

/** "R$ 1.234" vira "R$ •.•••": mostra que o número existe sem entregar o valor. */
const mascarar = (valor: number) => brl(valor).replace(/\d/g, "•");

/** O plano da pessoa já calculado, com os valores escondidos: o que ela leva ao comprar. */
function PreviaPlano({ d }: { d: Diagnostico }) {
  return (
    <div className="previa" aria-label="Prévia do seu plano, com os valores escondidos">
      <p className="previa__selo pequeno">
        <Cadeado /> Seu plano já está calculado
      </p>
      <ul className="potes">
        {d.potes.map((pote) => (
          <li key={pote.id} className="pote" data-pote={pote.id}>
            <span className="pote__nome">{pote.rotulo}</span>
            <span className="pote__valor numero previa__valor" aria-label="valor escondido">
              {mascarar(pote.valor)}
            </span>
          </li>
        ))}
      </ul>
      <p className="previa__semana">
        Dia a dia: <span className="numero previa__valor">{mascarar(d.livrePorSemana)}</span> por semana
      </p>
    </div>
  );
}

/**
 * Servidor fora do ar: o link direto da Kiwify (sem pedido). A compra entra
 * sem quiz e o servidor pede, por e-mail, o quiz com o mesmo e-mail; quem
 * voltar para /plano neste aparelho é levado ao plano sozinho.
 */
function linkReserva(contato: Contato | null, origem: Origem): string | null {
  const base = config().checkoutReserva;
  if (!/^https:\/\//.test(base)) return null;
  const q = new URLSearchParams();
  if (contato) {
    q.set("name", contato.nome);
    q.set("email", contato.email);
  }
  for (const [k, v] of Object.entries(origem)) if (k.startsWith("utm_") && v) q.set(k, v);
  const qs = q.toString();
  return qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
}

/** Respostas salvas por uma versão antiga do quiz não têm as perguntas de hoje. */
function respostasAtuais(salvas: Respostas | null): Respostas | null {
  return salvas?.quandoAcaba && salvas?.parcelas && salvas?.gastos?.comer_fora !== undefined ? salvas : null;
}

/**
 * Resultado do quiz. Entrega o raio-x do mês primeiro; o plano pago só
 * aparece no fim, ligado ao que a pessoa respondeu.
 * Com VENDA_ABERTA: false no config.js, o botão de compra vira "Em breve".
 * (Este componente só aparece no navegador: o HTML do build não tem o resultado.)
 */
export function Resultado() {
  const vendaAberta = config().vendaAberta;
  const parametros = useSearchParams();
  const [respostas, setRespostas] = useState<Respostas | null | undefined>(undefined);
  const [planoPronto, setPlanoPronto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const token = parametros.get("r");

  useEffect(() => {
    const pedido = lerPedido();
    if (pedido && lerPlano(pedido.ref)) setPlanoPronto(pedido.ref);
    if (!token) {
      setRespostas(respostasAtuais(lerRespostas()));
      return;
    }
    // Link dos e-mails: o resultado vem do servidor e passa a valer neste aparelho.
    let ativo = true;
    fetch(`${api()}/resultado?r=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((dados: { respostas: Respostas; contato: Contato } | null) => {
        if (!ativo) return;
        const vindas = sanitizarRespostas(dados?.respostas);
        if (dados && vindas) {
          gravarRespostas(vindas);
          if (dados.contato) gravarContato(dados.contato);
          setRespostas(vindas);
        } else {
          setRespostas(respostasAtuais(lerRespostas()));
        }
      })
      .catch(() => ativo && setRespostas(respostasAtuais(lerRespostas())));
    return () => {
      ativo = false;
    };
  }, [token]);

  const d = useMemo(() => (respostas ? diagnosticar(respostas) : null), [respostas]);
  const leitura = useMemo(() => (respostas && d ? leituraGratuita(respostas, d) : null), [respostas, d]);

  useEffect(() => {
    if (d) contar("Resultado");
  }, [d]);

  async function liberarPlano() {
    const r = respostas ? sanitizarRespostas(respostas) : null;
    if (!r || !d) {
      setErro(ERROS.respostas_invalidas);
      return;
    }
    rastrear("InitiateCheckout", { value: PRECO_REAIS, currency: "BRL" });
    contar("Checkout");
    setEnviando(true);
    setErro(null);
    const contato = lerContato();
    const origem = lerOrigem();
    let resposta: Response;
    try {
      resposta = await postar("/checkout", {
        respostas: r,
        contato,
        origem,
        resumo: resumoParaServidor(r, d, true),
        dadosIA: dadosParaIA(r, d),
      });
    } catch {
      // Sem resposta do servidor: o link de reserva ainda vende (o plano sai depois do quiz com o mesmo e-mail).
      const reserva = linkReserva(contato, origem);
      if (reserva) {
        window.location.assign(reserva);
        return;
      }
      setErro(ERROS.falha_no_pagamento);
      setEnviando(false);
      return;
    }
    try {
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      gravarPedido({
        ref: dados.ref,
        respostas: dados.respostas,
        urlPagamento: dados.url,
        criadoEm: new Date().toISOString(),
      });
      window.location.assign(dados.url);
    } catch (falha) {
      const codigo = falha instanceof Error ? falha.message : "";
      setErro(ERROS[codigo] ?? ERROS.falha_no_pagamento);
      setEnviando(false);
    }
  }

  if (respostas === undefined) return null;

  if (!respostas || !d || !leitura) {
    return (
      <div className="espera">
        <h1 className="titulo-2">Você ainda não fez o quiz neste aparelho</h1>
        <p className="apoio">Responda às perguntas para ver o raio-x do seu mês. Leva uns 3 minutos.</p>
        <Link href="/diagnostico" className="botao">
          Fazer o quiz gratuito
        </Link>
      </div>
    );
  }

  const perfil = perfilDaSituacao(respostas, d);
  const passo = leitura.primeiroPasso;
  const paraOndeVai = [
    ...d.orcamento.filter((l) => l.atual > 0).map((l) => ({ rotulo: l.rotulo, valor: l.atual, negativo: l.categoria === "invisivel" })),
    ...(d.parcelasMes > 0 ? [{ rotulo: "Parcelas", valor: d.parcelasMes, negativo: false }] : []),
  ].sort((a, b) => b.valor - a.valor);

  const contou: { titulo: string; texto: string }[] = [
    { titulo: "O que você mais quer", texto: ROTULOS_OBJETIVO[respostas.objetivo] },
    { titulo: "Quando o dinheiro acaba", texto: ROTULOS_QUANDO_ACABA[respostas.quandoAcaba] },
    { titulo: "Como você se sente", texto: ROTULOS_SENTIMENTO[respostas.sentimento] },
  ];
  if (respostas.vazamentos.length > 0) {
    contou.push({
      titulo: "Onde ele escapa",
      texto: respostas.vazamentos.map((v) => ROTULOS_VAZAMENTO[v]).join(", "),
    });
  }

  return (
    <>
      <header className="documento__capa">
        <p className="apoio">Resultado do quiz de {respostas.nome}</p>
        <p className="sobretitulo">Seu tipo de mês</p>
        <h1 className="titulo-1">{perfil.titulo}</h1>
        <p className="destaque">{perfil.resumo}</p>
        <CalendarioMes
          ate={d.diaQueAcaba}
          rotulo={d.diaQueAcaba === null ? "Seu dinheiro chega ao dia 30" : `Seu dinheiro dura até o dia ${d.diaQueAcaba}`}
        />
        <EscalaNivel nivel={d.nivel} />
        <p>
          <strong>
            Nível {d.nivel} de 4, {d.nivelRotulo.toLowerCase()}.
          </strong>{" "}
          {FRASE_NIVEL[d.nivel]}
        </p>
        <p className="apoio">{ACOLHIMENTO[respostas.sentimento]}</p>
        <Compartilhar titulo={perfil.titulo} id={perfil.id} />
      </header>

      {parametros.get("pagamento") === "falhou" && (
        <p className="aviso aviso--erro" style={{ marginTop: "1.5rem" }} role="alert">
          O pagamento não foi concluído e nada foi cobrado. Você pode tentar de novo quando quiser.
        </p>
      )}

      {planoPronto && (
        <p className="aviso" style={{ marginTop: "1.5rem" }}>
          Você já liberou um plano neste aparelho. <Link href={`/plano?ref=${planoPronto}`}>Abrir meu plano</Link>
        </p>
      )}

      {d.contasNaoBatem && d.diaPelasContas !== null && (
        <p className="aviso" style={{ marginTop: "1.5rem" }}>
          Você contou que o dinheiro {FRASE_QUANDO_ACABA[respostas.quandoAcaba]}. Pelas contas que você
          informou, ele acabaria por volta do dia {d.diaPelasContas}. Se o mês fecha mesmo assim, é provável
          que o cartão ou o limite da conta esteja cobrindo a diferença, ou que algum valor tenha ficado
          acima do real. Vale conferir no extrato.
        </p>
      )}

      <section className="bloco">
        <h2 className="titulo-2">Seus números</h2>
        <LinhasDiagnostico d={d} />
        <p className="pequeno apoio">
          <Link href="/diagnostico">Corrigir minhas respostas</Link>
        </p>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Para onde vai o seu salário</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Grupo</th>
                <th scope="col">Por mês</th>
                <th scope="col">Da renda</th>
              </tr>
            </thead>
            <tbody>
              {paraOndeVai.map((linha) => (
                <tr key={linha.rotulo}>
                  <td>{linha.rotulo}</td>
                  <td className={linha.negativo ? "negativo" : undefined}>{brl(linha.valor)}</td>
                  <td>{pct(linha.valor / d.renda)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className={d.sobraMes < 0 ? "negativo" : undefined}>{brl(d.totalMes)}</td>
                <td className={d.sobraMes < 0 ? "negativo" : undefined}>{pct(d.totalMes / d.renda)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {d.vazamentos.length > 0 && (
        <section className="bloco">
          <h2 className="titulo-2">Os vazamentos que mais pesam</h2>
          <p className="apoio">Gastos do dia a dia que, somados no ano, viram dinheiro grande.</p>
          <ul className="vazamentos">
            {d.vazamentos.map((v) => (
              <li key={v.categoria} className="vazamento">
                <span className="vazamento__nome">{v.rotulo}</span>
                <span className="vazamento__mes numero">{brl(v.porMes)} por mês</span>
                <span className="vazamento__ano caneta">{brl(v.porAno)} por ano</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bloco">
        <h2 className="titulo-2">O que mais pesa no seu caso</h2>
        <dl className="topicos">
          {leitura.pontosCriticos.map((ponto) => (
            <div key={ponto.titulo}>
              <dt>{ponto.titulo}</dt>
              <dd>{ponto.explicacao}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Por onde começar</h2>
        <div className="cenario cenario--plano">
          <p className="pequeno apoio">Seu primeiro passo</p>
          <p className="cenario__prazo">{passo.titulo}</p>
          <p>{passo.texto}</p>
        </div>
      </section>

      <Simulador d={d} />

      <section className="bloco bloco--final">
        <h2 className="titulo-2">O próximo passo: o seu plano do mês</h2>
        <p className="destaque apoio">
          Seu resultado termina aqui, e é seu. Para quem quer o caminho inteiro, o plano completo é
          escrito a partir das suas respostas, começando pelo que você contou:
        </p>
        <dl className="contou">
          {contou.map((item) => (
            <div key={item.titulo}>
              <dt>{item.titulo}</dt>
              <dd>{item.texto}</dd>
            </div>
          ))}
        </dl>
        <p>Com isso, o plano traz:</p>
        <ul className="trancado">
          {itensDoPlano(respostas, d).map((item) => (
            <li key={item}>
              <Cadeado />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <PreviaPlano d={d} />

        <div className="canhoto" style={{ marginTop: "2rem" }}>
          <div className="canhoto__corpo">
            <h3 className="titulo-3">Plano {MARCA.nome} de {respostas.nome}</h3>
            <p className="apoio">
              Escrito por inteligência artificial para o seu tipo de mês, “{perfil.titulo.toLowerCase()}”,
              com os números e as respostas que você acabou de dar, mais um guia que acompanha todo plano.
            </p>
            {vendaAberta && (
              <p className="pequeno apoio">
                Fica pronto em cerca de um minuto depois do pagamento. Pagamento único por Pix ou cartão.{" "}
                {MARCA.garantiaDias} dias para pedir o dinheiro de volta.
              </p>
            )}
          </div>
          <div className="canhoto__valor">
            {vendaAberta ? (
              <>
                <p className="canhoto__preco">{brlCentavos(PRECO_REAIS)}</p>
                <button type="button" className="botao botao--largo" onClick={liberarPlano} disabled={enviando}>
                  {enviando ? "Abrindo o pagamento" : "Liberar meu plano"}
                </button>
              </>
            ) : (
              <>
                <p className="titulo-3">Em breve</p>
                <p className="pequeno apoio">
                  O plano completo ainda não está à venda. Seu resultado continua guardado neste
                  aparelho.
                </p>
              </>
            )}
          </div>
        </div>

        {erro && (
          <p className="aviso aviso--erro" role="alert">
            {erro}
          </p>
        )}
      </section>
    </>
  );
}
