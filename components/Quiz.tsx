"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CampoDinheiro, Cartoes, CartoesMultiplos } from "@/components/Campos";
import {
  gravarContato,
  gravarRascunho,
  gravarRespostas,
  lerContato,
  lerOrigem,
  lerRascunho,
} from "@/lib/armazenamento";
import { emailPareceValido, telefoneValido } from "@/lib/contato";
import { CATEGORIAS_DIA_A_DIA, CATEGORIAS_FIXAS } from "@/lib/diagnostico";
import { mascaraTelefone } from "@/lib/formato";
import { LIMITES } from "@/lib/limites";
import {
  AJUDA_GASTO,
  ROTULOS_COMO_FECHA,
  ROTULOS_CONTROLE,
  ROTULOS_FATURA,
  ROTULOS_GASTO,
  ROTULOS_OBJETIVO,
  ROTULOS_QUANDO_ACABA,
  ROTULOS_RECEBIMENTO,
  ROTULOS_RENDA,
  ROTULOS_RESERVA,
  ROTULOS_SENTIMENTO,
  ROTULOS_VAZAMENTO,
} from "@/lib/rotulos";
import type {
  CategoriaGasto,
  ComoFecha,
  Contato,
  Controle,
  Fatura,
  Gastos,
  Objetivo,
  Parcelas,
  QuandoAcaba,
  Recebimento,
  Reserva,
  Respostas,
  Sentimento,
  TipoRenda,
  Vazamento,
} from "@/lib/tipos";

/* ---------- Formulário ---------- */

interface Formulario {
  contato: Contato;
  quandoAcaba: QuandoAcaba | "";
  pessoasNaCasa: number;
  tipoRenda: TipoRenda | "";
  rendaMensal: number;
  recebimento: Recebimento | "";
  gastos: Gastos;
  parcelas: Parcelas;
  fatura: Fatura | "";
  comoFecha: ComoFecha[];
  vazamentos: Vazamento[];
  controle: Controle | "";
  reserva: Reserva | "";
  sentimento: Sentimento | "";
  objetivo: Objetivo | "";
}

const INICIAL: Formulario = {
  contato: { nome: "", email: "", telefone: "" },
  quandoAcaba: "",
  pessoasNaCasa: 0,
  tipoRenda: "",
  rendaMensal: 0,
  recebimento: "",
  gastos: {
    moradia: 0,
    contas: 0,
    transporte: 0,
    saude_educacao: 0,
    assinaturas: 0,
    mercado: 0,
    comer_fora: 0,
    compras_lazer: 0,
    outros: 0,
  },
  parcelas: { cartao: 0, emprestimos: 0 },
  fatura: "",
  comoFecha: [],
  vazamentos: [],
  controle: "",
  reserva: "",
  sentimento: "",
  objetivo: "",
};

/** Muda quando o formato do rascunho muda, para não carregar um rascunho antigo. */
const VERSAO_RASCUNHO = 1;

/** Respostas em que o dinheiro acaba antes do fim do mês. */
const ACABA_ANTES = new Set<QuandoAcaba | "">(["primeira_semana", "metade", "ultima_semana"]);

function limparContato(c: Contato): Contato {
  return { nome: c.nome.replace(/\s+/g, " ").trim(), email: c.email.trim().toLowerCase(), telefone: c.telefone };
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0]?.slice(0, LIMITES.maxNome) ?? "";
}

function paraRespostas(f: Formulario): Respostas {
  return {
    nome: primeiroNome(f.contato.nome),
    quandoAcaba: f.quandoAcaba as QuandoAcaba,
    pessoasNaCasa: f.pessoasNaCasa,
    tipoRenda: f.tipoRenda as TipoRenda,
    rendaMensal: f.rendaMensal,
    recebimento: f.recebimento as Recebimento,
    gastos: f.gastos,
    parcelas: f.parcelas,
    fatura: f.fatura as Fatura,
    comoFecha: f.quandoAcaba === "sobra" ? [] : f.comoFecha,
    vazamentos: f.vazamentos,
    controle: f.controle as Controle,
    reserva: f.reserva as Reserva,
    sentimento: f.sentimento as Sentimento,
    objetivo: f.objetivo as Objetivo,
  };
}

/** Avisa o servidor, que grava o lead. Falha em silêncio. */
function registrar(evento: "quiz_iniciado" | "quiz_concluido", contato: Contato, respostas?: Respostas) {
  void fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evento, contato, origem: lerOrigem(), respostas }),
    keepalive: true,
  }).catch(() => {});
}

/* ---------- Telas ---------- */

type Escolha =
  | "quandoAcaba"
  | "pessoasNaCasa"
  | "tipoRenda"
  | "recebimento"
  | "fatura"
  | "controle"
  | "reserva"
  | "sentimento"
  | "objetivo";

type Multipla = "comoFecha" | "vazamentos";

type Tela =
  | { id: "contato" }
  | { id: "escolha"; campo: Escolha }
  | { id: "renda" }
  | { id: "gastos"; grupo: "fixos" | "dia_a_dia" }
  | { id: "parcelas" }
  | { id: "multipla"; campo: Multipla };

const PESSOAS: Record<string, string> = { "1": "Só eu", "2": "2 pessoas", "3": "3 pessoas", "4": "4 pessoas", "5": "5 ou mais" };

const PERGUNTAS: Record<Escolha, { titulo: string; apoio?: string; opcoes: Record<string, string>; grade?: boolean }> = {
  quandoAcaba: {
    titulo: "Em que parte do mês o seu dinheiro costuma acabar?",
    apoio: "Pense nos últimos três meses.",
    opcoes: ROTULOS_QUANDO_ACABA,
  },
  pessoasNaCasa: {
    titulo: "Quantas pessoas vivem dessa renda, contando você?",
    opcoes: PESSOAS,
    grade: true,
  },
  tipoRenda: {
    titulo: "Como é a sua renda?",
    apoio: "Salário, bicos, benefícios, pensão: tudo o que entra para pagar as contas.",
    opcoes: ROTULOS_RENDA,
  },
  recebimento: { titulo: "Quando o dinheiro entra?", opcoes: ROTULOS_RECEBIMENTO },
  fatura: { titulo: "E a fatura do cartão de crédito?", opcoes: ROTULOS_FATURA },
  controle: { titulo: "Você anota ou acompanha seus gastos?", opcoes: ROTULOS_CONTROLE },
  reserva: { titulo: "Tem algum dinheiro guardado para emergências?", opcoes: ROTULOS_RESERVA },
  sentimento: {
    titulo: "Como você se sente quando o mês está acabando?",
    apoio: "Sem julgamento. Isso muda o jeito como seu resultado é escrito.",
    opcoes: ROTULOS_SENTIMENTO,
  },
  objetivo: {
    titulo: "Por último: o que você mais quer?",
    apoio: "Escolha o que vem primeiro para você.",
    opcoes: ROTULOS_OBJETIVO,
  },
};

const MULTIPLAS: Record<Multipla, { titulo: string; apoio: string }> = {
  comoFecha: {
    titulo: "Quando o dinheiro acaba, como você fecha o mês?",
    apoio: "Marque tudo o que costuma acontecer.",
  },
  vazamentos: {
    titulo: "Onde você sente que o dinheiro escapa?",
    apoio: "Marque quantas quiser.",
  },
};

const TELA_GASTOS = {
  fixos: {
    titulo: "Quais são as contas fixas do mês?",
    apoio: "Valores aproximados já servem. Parcelas de compras e empréstimos vêm depois.",
    categorias: CATEGORIAS_FIXAS as CategoriaGasto[],
  },
  dia_a_dia: {
    titulo: "E quanto vai no dia a dia, por mês?",
    apoio:
      "Coloque o valor que você lembra, mesmo que seja um chute. O resultado mostra se ele bate com o dia em que o dinheiro acaba.",
    categorias: CATEGORIAS_DIA_A_DIA as CategoriaGasto[],
  },
};

function montarTelas(f: Formulario): Tela[] {
  const telas: Tela[] = [
    { id: "contato" },
    { id: "escolha", campo: "quandoAcaba" },
    { id: "escolha", campo: "pessoasNaCasa" },
    { id: "escolha", campo: "tipoRenda" },
    { id: "renda" },
    { id: "escolha", campo: "recebimento" },
    { id: "gastos", grupo: "fixos" },
    { id: "gastos", grupo: "dia_a_dia" },
    { id: "parcelas" },
    { id: "escolha", campo: "fatura" },
  ];
  if (f.quandoAcaba !== "sobra") telas.push({ id: "multipla", campo: "comoFecha" });
  telas.push(
    { id: "multipla", campo: "vazamentos" },
    { id: "escolha", campo: "controle" },
    { id: "escolha", campo: "reserva" },
    { id: "escolha", campo: "sentimento" },
    { id: "escolha", campo: "objetivo" },
  );
  return telas;
}

type Erros = Record<string, string>;

function validar(tela: Tela, f: Formulario): Erros {
  const e: Erros = {};
  switch (tela.id) {
    case "contato": {
      const c = limparContato(f.contato);
      if (c.nome.length < 2 || !/\p{L}/u.test(c.nome)) e.nome = "Escreva seu nome.";
      if (!emailPareceValido(c.email)) e.email = "Confira o e-mail. Ex.: nome@gmail.com";
      if (!telefoneValido(c.telefone)) e.telefone = "Informe o WhatsApp com DDD. Ex.: (11) 91234-5678";
      break;
    }
    case "escolha":
      if (!f[tela.campo]) e.escolha = "Escolha uma opção.";
      break;
    case "renda":
      if (f.rendaMensal <= 0) e.renda = "Informe quanto entra por mês. Um valor aproximado já serve.";
      break;
    case "gastos":
      if (TELA_GASTOS[tela.grupo].categorias.reduce((soma, c) => soma + f.gastos[c], 0) <= 0)
        e.gastos = "Preencha pelo menos um valor. Um valor aproximado já serve.";
      break;
    case "parcelas":
      break;
    case "multipla":
      if (tela.campo === "comoFecha" && ACABA_ANTES.has(f.quandoAcaba) && f.comoFecha.length === 0)
        e.multipla = "Marque pelo menos uma.";
      if (tela.campo === "vazamentos" && f.vazamentos.length === 0)
        e.multipla = "Marque pelo menos uma. Se não souber, marque a última opção.";
      break;
  }
  return e;
}

/* ---------- Tela de análise ---------- */

const ANALISE = [
  "Somando o que entra e o que sai",
  "Separando contas fixas e dia a dia",
  "Calculando em que dia o dinheiro acaba",
  "Montando o seu resultado",
];

function Analisando({ nome }: { nome: string }) {
  const [feitos, setFeitos] = useState(0);
  useEffect(() => {
    const relogio = setInterval(() => setFeitos((n) => Math.min(n + 1, ANALISE.length)), 650);
    return () => clearInterval(relogio);
  }, []);
  return (
    <div className="espera" role="status" aria-live="polite">
      <h1 className="titulo-2">Analisando o seu mês{nome ? `, ${nome}` : ""}</h1>
      <div className="espera__traco" aria-hidden="true" />
      <ul className="analise">
        {ANALISE.map((etapa, i) => (
          <li key={etapa} className="analise__item" data-feito={i < feitos}>
            {etapa}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Quiz ---------- */

export function Quiz() {
  const roteador = useRouter();
  const [f, setF] = useState<Formulario>(INICIAL);
  const [passo, setPasso] = useState(0);
  const [erros, setErros] = useState<Erros>({});
  const [carregado, setCarregado] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  const telas = useMemo(() => montarTelas(f), [f]);
  const tela = telas[Math.min(passo, telas.length - 1)];

  useEffect(() => {
    const salvo = lerRascunho<{ versao: number; formulario: Formulario; passo: number }>();
    if (salvo?.versao === VERSAO_RASCUNHO && salvo.formulario) {
      const formulario = { ...INICIAL, ...salvo.formulario };
      setF(formulario);
      setPasso(Math.min(Math.max(salvo.passo ?? 0, 0), montarTelas(formulario).length - 1));
    } else {
      const contato = lerContato();
      if (contato) setF((atual) => ({ ...atual, contato }));
    }
    setCarregado(true);
    return () => {
      if (espera.current) clearTimeout(espera.current);
    };
  }, []);

  useEffect(() => {
    if (carregado) gravarRascunho({ versao: VERSAO_RASCUNHO, formulario: f, passo });
  }, [f, passo, carregado]);

  function mudar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setF((atual) => ({ ...atual, [campo]: valor }));
    setErros({});
  }

  function mudarContato(mudancas: Partial<Contato>) {
    setF((atual) => ({ ...atual, contato: { ...atual.contato, ...mudancas } }));
    // O aviso some assim que a pessoa mexe no campo; volta a ser conferido ao continuar.
    setErros((atual) => {
      const restantes = { ...atual };
      for (const campo of Object.keys(mudancas)) delete restantes[campo];
      return restantes;
    });
  }

  function irPara(novo: number) {
    setPasso(novo);
    setErros({});
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => titulo.current?.focus());
  }

  function concluir(formulario: Formulario) {
    const respostas = paraRespostas(formulario);
    gravarRespostas(respostas);
    registrar("quiz_concluido", limparContato(formulario.contato), respostas);
    setAnalisando(true);
    window.scrollTo({ top: 0 });
    espera.current = setTimeout(() => roteador.push("/resultado"), ANALISE.length * 650 + 500);
  }

  function avancar(formulario: Formulario = f) {
    const atual = telas[passo];
    const encontrados = validar(atual, formulario);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    if (atual.id === "contato") {
      const contato = limparContato(formulario.contato);
      const anterior = lerContato();
      if (JSON.stringify(anterior) !== JSON.stringify(contato)) {
        gravarContato(contato);
        registrar("quiz_iniciado", contato);
      }
      setF((x) => ({ ...x, contato }));
    }

    const proximas = montarTelas(formulario);
    if (passo >= proximas.length - 1) {
      concluir(formulario);
      return;
    }
    irPara(passo + 1);
  }

  /** Tocar numa resposta única já leva para a próxima pergunta. */
  function escolher(campo: Escolha, valor: string) {
    const formulario = {
      ...f,
      [campo]: campo === "pessoasNaCasa" ? Number(valor) : valor,
      // Quem diz que sobra dinheiro não responde como fecha o mês.
      ...(campo === "quandoAcaba" && valor === "sobra" && { comoFecha: [] }),
    } as Formulario;
    setF(formulario);
    setErros({});
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => avancar(formulario), 260);
  }

  if (!carregado) return null;
  if (analisando) return <Analisando nome={primeiroNome(f.contato.nome)} />;

  const total = telas.length;
  const escolhaSemResposta = tela.id === "escolha" && !f[tela.campo];
  const ultimo = passo === total - 1;

  return (
    <form
      className="passo"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        avancar();
      }}
    >
      <div className="progresso">
        <span className="pequeno apoio">
          {passo === 0 ? "Antes de começar" : `Pergunta ${passo} de ${total - 1}`}
        </span>
        <div
          className="progresso__trilho"
          role="progressbar"
          aria-label="Progresso do quiz"
          aria-valuemin={0}
          aria-valuemax={total - 1}
          aria-valuenow={passo}
        >
          <div className="progresso__barra" style={{ width: `${Math.max(4, (passo / (total - 1)) * 100)}%` }} />
        </div>
      </div>

      {tela.id === "contato" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Descubra em que dia o seu salário acaba, e por quê
            </h1>
            <p className="apoio">
              São perguntas rápidas, quase todas de um toque. No fim você vê, de graça, para onde vai o seu
              dinheiro e por onde começar. Para quem é o resultado?
            </p>
          </div>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="nome">
              Seu nome
            </label>
            <input
              id="nome"
              className="entrada"
              type="text"
              autoComplete="name"
              maxLength={LIMITES.maxNomeCompleto}
              value={f.contato.nome}
              onChange={(e) => mudarContato({ nome: e.target.value })}
              aria-invalid={erros.nome ? true : undefined}
              aria-describedby={erros.nome ? "nome-erro" : undefined}
            />
            {erros.nome && (
              <span className="campo__erro" id="nome-erro" role="alert">
                {erros.nome}
              </span>
            )}
          </div>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="email">
              Seu e-mail
            </label>
            <input
              id="email"
              className="entrada"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={120}
              value={f.contato.email}
              onChange={(e) => mudarContato({ email: e.target.value })}
              aria-invalid={erros.email ? true : undefined}
              aria-describedby={erros.email ? "email-erro" : undefined}
            />
            {erros.email && (
              <span className="campo__erro" id="email-erro" role="alert">
                {erros.email}
              </span>
            )}
          </div>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="telefone">
              Seu WhatsApp, com DDD
            </label>
            <input
              id="telefone"
              className="entrada"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(11) 91234-5678"
              value={mascaraTelefone(f.contato.telefone)}
              onChange={(e) => {
                const digitos = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
                mudarContato({ telefone: digitos });
              }}
              aria-invalid={erros.telefone ? true : undefined}
              aria-describedby={erros.telefone ? "telefone-erro" : undefined}
            />
            {erros.telefone && (
              <span className="campo__erro" id="telefone-erro" role="alert">
                {erros.telefone}
              </span>
            )}
          </div>
          <p className="pequeno apoio">
            Usamos seu contato para falar com você sobre o seu resultado e sobre o plano completo, por
            e-mail e WhatsApp. Sem spam, e você pode pedir para sair quando quiser.{" "}
            <Link href="/privacidade" target="_blank">
              Privacidade
            </Link>
            .
          </p>
        </>
      )}

      {tela.id === "escolha" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" id="pergunta" ref={titulo} tabIndex={-1}>
              {PERGUNTAS[tela.campo].titulo}
            </h1>
            {PERGUNTAS[tela.campo].apoio && <p className="apoio">{PERGUNTAS[tela.campo].apoio}</p>}
          </div>
          <Cartoes
            rotuladoPor="pergunta"
            opcoes={PERGUNTAS[tela.campo].opcoes}
            grade={PERGUNTAS[tela.campo].grade}
            valor={f[tela.campo] ? String(f[tela.campo]) : ""}
            aoEscolher={(v) => escolher(tela.campo, v)}
            erro={erros.escolha}
          />
        </>
      )}

      {tela.id === "renda" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Quanto entra por mês, já com os descontos?
            </h1>
            <p className="apoio">
              {f.tipoRenda === "fixa"
                ? "O valor que cai na conta, não o do contracheque."
                : "Use a média dos últimos três meses."}{" "}
              Se você divide as contas da casa com alguém, some a parte dessa pessoa.
            </p>
          </div>
          <CampoDinheiro
            rotulo="Renda por mês"
            valor={f.rendaMensal}
            aoMudar={(v) => mudar("rendaMensal", v)}
            erro={erros.renda}
          />
        </>
      )}

      {tela.id === "gastos" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              {TELA_GASTOS[tela.grupo].titulo}
            </h1>
            <p className="apoio">{TELA_GASTOS[tela.grupo].apoio}</p>
          </div>
          <div className="grade-campos grade-campos--2">
            {TELA_GASTOS[tela.grupo].categorias.map((categoria) => (
              <CampoDinheiro
                key={categoria}
                rotulo={ROTULOS_GASTO[categoria]}
                ajuda={AJUDA_GASTO[categoria]}
                valor={f.gastos[categoria]}
                aoMudar={(v) => mudar("gastos", { ...f.gastos, [categoria]: v })}
              />
            ))}
          </div>
          {erros.gastos && (
            <p className="campo__erro" role="alert">
              {erros.gastos}
            </p>
          )}
        </>
      )}

      {tela.id === "parcelas" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Quanto você paga de parcelas por mês?
            </h1>
            <p className="apoio">Some todas. Se não tem parcelas, deixe em branco e continue.</p>
          </div>
          <div className="grade-campos grade-campos--2">
            <CampoDinheiro
              rotulo="Compras parceladas no cartão"
              ajuda="As parcelas que caem todo mês na fatura"
              valor={f.parcelas.cartao}
              aoMudar={(v) => mudar("parcelas", { ...f.parcelas, cartao: v })}
            />
            <CampoDinheiro
              rotulo="Empréstimos, financiamentos e carnês"
              ajuda="Consignado, carro, casa, carnê de loja"
              valor={f.parcelas.emprestimos}
              aoMudar={(v) => mudar("parcelas", { ...f.parcelas, emprestimos: v })}
            />
          </div>
        </>
      )}

      {tela.id === "multipla" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" id="pergunta" ref={titulo} tabIndex={-1}>
              {MULTIPLAS[tela.campo].titulo}
            </h1>
            <p className="apoio">{MULTIPLAS[tela.campo].apoio}</p>
          </div>
          {tela.campo === "comoFecha" ? (
            <CartoesMultiplos
              rotuladoPor="pergunta"
              opcoes={ROTULOS_COMO_FECHA}
              valores={f.comoFecha}
              aoMudar={(v) => mudar("comoFecha", v)}
              erro={erros.multipla}
            />
          ) : (
            <CartoesMultiplos
              rotuladoPor="pergunta"
              opcoes={ROTULOS_VAZAMENTO}
              valores={f.vazamentos}
              aoMudar={(v) => mudar("vazamentos", v)}
              erro={erros.multipla}
            />
          )}
        </>
      )}

      <div className="navegacao">
        {passo > 0 ? (
          <button type="button" className="botao-texto" onClick={() => irPara(passo - 1)}>
            Voltar
          </button>
        ) : (
          <span />
        )}
        {!escolhaSemResposta && (
          <button type="submit" className="botao">
            {passo === 0 ? "Começar o quiz" : ultimo ? "Ver meu resultado" : "Continuar"}
          </button>
        )}
      </div>
    </form>
  );
}
