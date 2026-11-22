"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { OfertaObrigado, ofertaCabe } from "@/components/OfertaObrigado";
import { PlanoDocumento } from "@/components/PlanoDocumento";
import { config, postar } from "@/lib/api";
import { gravarPedido, gravarPlano, lerContato, lerOrigem, lerPedido, lerPlano, lerRespostas } from "@/lib/armazenamento";
import { calendarioDoMes } from "@/lib/calendario";
import { PRECO_REAIS } from "@/lib/config";
import { diagnosticar } from "@/lib/diagnostico";
import { contar } from "@/lib/eventos";
import { conciliar, dadosParaIA, type NarrativaIA } from "@/lib/ia-dados";
import { narrativaPadrao } from "@/lib/narrativa-padrao";
import { rastrear } from "@/lib/pixel";
import { resumoParaServidor } from "@/lib/resumo";
import type { PlanoCompleto, Respostas } from "@/lib/tipos";

type Estado =
  | { fase: "carregando" }
  | { fase: "sem_pedido" }
  | { fase: "gerando" }
  | { fase: "aguardando_pagamento" }
  | { fase: "erro" }
  | { fase: "pronto"; plano: PlanoCompleto; podeRegenerar: boolean; acompanhamento: boolean };

const ETAPAS = [
  "Conferindo o pagamento",
  "Separando os seus potes",
  "Calculando o dinheiro da semana",
  "Escrevendo seu plano",
  "Revisando os detalhes",
];

/**
 * Compra no pixel: só quando o plano acabou de sair (não a cada vez que o
 * link é aberto) e uma vez por pedido neste aparelho.
 */
function contarCompra(plano: PlanoCompleto) {
  const chave = `mesinteiro:pixel-compra:${plano.ref}`;
  try {
    const recente = Date.now() - new Date(plano.geradoEm).getTime() < 30 * 60 * 1000;
    if (!recente || window.localStorage.getItem(chave)) return;
    window.localStorage.setItem(chave, "1");
  } catch {
    return;
  }
  rastrear("Purchase", { value: PRECO_REAIS, currency: "BRL", content_name: "plano" }, plano.ref);
}

/** Pix: confere sozinho se o pagamento caiu, a cada 5 s, por 2 minutos. */
const TENTATIVAS_PAGAMENTO = 24;
/** IA escrevendo (resposta 202): pergunta de novo a cada 5 s, por até 5 minutos. */
const TENTATIVAS_IA = 60;

/** Monta o plano no navegador: os números saem do mesmo motor do quiz; o texto, da IA (ou da versão padrão). */
function montarPlano(ref: string, respostas: Respostas, ia: NarrativaIA | null, geradoEm: string): PlanoCompleto {
  const diagnostico = diagnosticar(respostas);
  return {
    ref,
    geradoEm,
    nome: respostas.nome,
    diagnostico,
    calendario: calendarioDoMes(respostas, diagnostico),
    narrativa: conciliar(ia, narrativaPadrao(respostas, diagnostico)),
    origemNarrativa: ia ? "ia" : "padrao",
  };
}

function Espera() {
  const [etapa, setEtapa] = useState(0);
  useEffect(() => {
    const relogio = setInterval(() => setEtapa((e) => Math.min(e + 1, ETAPAS.length - 1)), 9000);
    return () => clearInterval(relogio);
  }, []);
  return (
    <div className="espera" role="status" aria-live="polite">
      <h1 className="titulo-2">Montando seu plano</h1>
      <div className="espera__traco" aria-hidden="true" />
      <p className="destaque">{ETAPAS[etapa]}</p>
      <p className="apoio">Leva cerca de um minuto. Pode deixar esta página aberta: o plano aparece aqui e o link chega no seu e-mail.</p>
    </div>
  );
}

/** Formulário de uma linha: e-mail e botão. */
function PedirPorEmail({
  rotulo,
  botao,
  enviar,
}: {
  rotulo: string;
  botao: string;
  enviar: (email: string) => Promise<string>;
}) {
  const [email, setEmail] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  return (
    <form
      className="pilha"
      style={{ marginTop: "1.5rem", textAlign: "left" }}
      onSubmit={async (e) => {
        e.preventDefault();
        setEnviando(true);
        setAviso(await enviar(email).catch(() => "Não deu para conferir agora. Tente de novo em instantes."));
        setEnviando(false);
      }}
    >
      <label className="campo__rotulo" htmlFor="email-compra">
        {rotulo}
      </label>
      <input
        id="email-compra"
        className="entrada"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" className="botao botao--contorno" disabled={enviando}>
        {botao}
      </button>
      {aviso && (
        <p className="pequeno apoio" role="status">
          {aviso}
        </p>
      )}
    </form>
  );
}

/**
 * Página de obrigado (para onde a Kiwify manda depois do pagamento) e link do
 * plano (/plano?ref=...). O pedido e o texto da IA ficam no servidor
 * (api.mapadaalma.online/api/mesinteiro/plano); os números são refeitos aqui,
 * com o mesmo motor do quiz. O link abre em qualquer aparelho.
 */
export function TelaPlano() {
  const { contato: contatoEmail, reenvioPorEmail } = config();
  const parametros = useSearchParams();
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [oferta, setOferta] = useState(false);
  const ref = useRef<string | null>(null);
  const urlPagamento = useRef<string | null>(null);
  const iniciou = useRef(false);
  const tentativas = useRef(0);
  const tentativasIA = useRef(0);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refDaUrl = parametros.get("ref");

  const buscar = useCallback(async (regenerar = false) => {
    const atual = ref.current;
    if (!atual) return;
    if (relogio.current) clearTimeout(relogio.current);
    setEstado((e) => (e.fase === "aguardando_pagamento" || e.fase === "pronto" ? e : { fase: "gerando" }));
    try {
      const resposta = await postar("/plano", { ref: atual, regenerar });
      const dados = await resposta.json().catch(() => ({}));
      if (resposta.status === 202) {
        // A IA está escrevendo: pergunta de novo daqui a pouco.
        if (tentativasIA.current++ >= TENTATIVAS_IA) throw new Error("demorou");
        setEstado((e) => (e.fase === "pronto" ? e : { fase: "gerando" }));
        relogio.current = setTimeout(() => void buscar(), 5000);
        return;
      }
      if (resposta.status === 402) {
        if (dados.urlPagamento) urlPagamento.current = dados.urlPagamento;
        // Pagou antes, por outro caminho (link de reserva, outro aparelho)? Liga a compra a este pedido.
        const email = lerContato()?.email;
        if (email && tentativas.current === 0) {
          const v = await postar("/vincular", { ref: atual, email }).catch(() => null);
          if (v?.ok) {
            void buscar();
            return;
          }
        }
        setEstado({ fase: "aguardando_pagamento" });
        return;
      }
      if (resposta.status === 404 || resposta.status === 400) {
        setEstado({ fase: "sem_pedido" });
        return;
      }
      if (!resposta.ok) throw new Error(String(resposta.status));
      const { respostas, ia, geradoEm, podeRegenerar, acompanhamento } = dados as {
        respostas: Respostas;
        ia: NarrativaIA | null;
        geradoEm: string;
        podeRegenerar: boolean;
        acompanhamento: boolean;
      };
      const plano = montarPlano(atual, respostas, ia, geradoEm);
      gravarPlano(plano);
      contarCompra(plano);
      contar("Plano");
      tentativasIA.current = 0;
      setEstado({ fase: "pronto", plano, podeRegenerar, acompanhamento: !!acompanhamento });
    } catch {
      setEstado((e) => (e.fase === "pronto" ? e : { fase: "erro" }));
    }
  }, []);

  /** Sem pedido neste aparelho, mas com o quiz feito: cria o pedido (quem pagou pelo link de reserva cai aqui). */
  const recriarPedido = useCallback(async (respostas: Respostas) => {
    try {
      const d = diagnosticar(respostas);
      const resposta = await postar("/checkout", {
        respostas,
        contato: lerContato(),
        origem: lerOrigem(),
        resumo: resumoParaServidor(respostas, d, true),
        dadosIA: dadosParaIA(respostas, d),
      });
      if (!resposta.ok) throw new Error();
      const dados = await resposta.json();
      gravarPedido({ ref: dados.ref, respostas: dados.respostas, urlPagamento: dados.url, criadoEm: new Date().toISOString() });
      ref.current = dados.ref;
      urlPagamento.current = dados.url;
      void buscar();
    } catch {
      setEstado({ fase: "sem_pedido" });
    }
  }, [buscar]);

  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;

    // A Kiwify volta para /plano sem a referência: ela fica guardada neste
    // navegador desde o clique em comprar. O link do e-mail já traz a referência.
    const local = lerPedido();
    const atual = refDaUrl ?? local?.ref ?? null;
    if (!atual) {
      const respostas = lerRespostas();
      if (respostas && lerContato()) {
        setEstado({ fase: "gerando" });
        void recriarPedido(respostas);
      } else {
        setEstado({ fase: "sem_pedido" });
      }
      return;
    }
    ref.current = atual;
    const guardado = lerPlano(atual);
    if (local?.ref === atual) {
      urlPagamento.current = local.urlPagamento;
      // Acabou de pagar neste aparelho (ainda não abriu o plano): a oferta da página de obrigado aparece uma vez.
      if (!guardado && ofertaCabe(atual, local.respostas)) setOferta(true);
    }
    if (guardado?.origemNarrativa === "ia") {
      setEstado({ fase: "pronto", plano: guardado, podeRegenerar: false, acompanhamento: false });
      void buscar(); // atualiza em silêncio (o aviso do acompanhamento vem do servidor)
      return;
    }
    void buscar();
  }, [buscar, recriarPedido, refDaUrl]);

  // Pix pode levar alguns segundos para ser confirmado: confere de novo sozinho.
  useEffect(() => {
    if (estado.fase !== "aguardando_pagamento") return;
    if (tentativas.current >= TENTATIVAS_PAGAMENTO) return;
    const espera = setTimeout(() => {
      tentativas.current += 1;
      void buscar();
    }, 5000);
    return () => clearTimeout(espera);
  }, [estado, buscar]);

  useEffect(() => () => {
    if (relogio.current) clearTimeout(relogio.current);
  }, []);

  if (estado.fase === "carregando") return null;

  const blocoOferta = oferta && (estado.fase === "gerando" || estado.fase === "pronto") && (
    <OfertaObrigado refPedido={ref.current ?? ""} fechar={() => setOferta(false)} />
  );

  if (estado.fase === "gerando")
    return (
      <>
        {blocoOferta}
        <Espera />
      </>
    );

  if (estado.fase === "sem_pedido") {
    return (
      <div className="espera">
        <h1 className="titulo-2">Não encontramos seu pedido neste aparelho</h1>
        <p className="apoio">
          Abra esta página pelo link do e-mail de confirmação, ou no navegador em que você respondeu ao
          quiz. Se você pagou sem responder ao quiz, faça o quiz com o mesmo e-mail da compra: no fim, o
          botão leva direto para o seu plano, sem pagar de novo.
          {contatoEmail && (
            <>
              {" "}
              Se você pagou e não consegue acessar, escreva para{" "}
              <a href={`mailto:${contatoEmail}`}>{contatoEmail}</a> e resolvemos.
            </>
          )}
        </p>
        {reenvioPorEmail && (
          <PedirPorEmail
            rotulo="Já pagou? Digite o e-mail da compra e mandamos o link do plano de novo."
            botao="Receber o link por e-mail"
            enviar={async (email) => {
              const r = await postar("/reenviar", { email });
              if (!r.ok) throw new Error();
              return "Se houver uma compra com este e-mail, o link chega em alguns minutos. Confira também o spam.";
            }}
          />
        )}
        <Link href="/diagnostico" className="botao botao--contorno">
          Fazer o quiz
        </Link>
      </div>
    );
  }

  if (estado.fase === "aguardando_pagamento") {
    return (
      <div className="espera" role="status">
        <h1 className="titulo-2">Aguardando a confirmação do pagamento</h1>
        <div className="espera__traco" aria-hidden="true" />
        <p className="apoio">
          Assim que o pagamento for confirmado, seu plano aparece aqui. Com Pix isso costuma levar
          alguns segundos. Estamos conferindo sozinhos, e você não precisa recarregar a página.
        </p>
        <div className="acoes-plano">
          {urlPagamento.current && !urlPagamento.current.includes("/plano?") && (
            <a href={urlPagamento.current} className="botao">
              Ir para o pagamento
            </a>
          )}
          <button
            type="button"
            className="botao botao--contorno"
            onClick={() => {
              tentativas.current = 0;
              void buscar();
            }}
          >
            Já paguei, conferir agora
          </button>
        </div>
        {tentativas.current >= 3 && (
          <PedirPorEmail
            rotulo="Pagou com um e-mail diferente do que usou no quiz? Digite o e-mail do pagamento."
            botao="Conferir com este e-mail"
            enviar={async (email) => {
              const r = await postar("/vincular", { ref: ref.current, email });
              if (r.ok) {
                void buscar();
                return "Encontramos o pagamento. Abrindo seu plano.";
              }
              return "Ainda não chegou confirmação de pagamento com este e-mail. Se você acabou de pagar, espere um minuto e tente de novo.";
            }}
          />
        )}
      </div>
    );
  }

  if (estado.fase === "erro") {
    return (
      <div className="espera">
        <h1 className="titulo-2">Não deu para montar o plano agora</h1>
        <p className="apoio">
          Seu pagamento e suas respostas estão guardados. Tente de novo em instantes.
          {contatoEmail && (
            <>
              {" "}
              Se continuar, escreva para <a href={`mailto:${contatoEmail}`}>{contatoEmail}</a>.
            </>
          )}
        </p>
        <button
          type="button"
          className="botao"
          onClick={() => {
            tentativasIA.current = 0;
            void buscar();
          }}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <>
      {blocoOferta}
      {estado.acompanhamento && (
        <div className="aviso nao-imprimir" style={{ marginTop: "1.5rem" }}>
          <p>
            <strong>Você também levou o acompanhamento.</strong> A partir da próxima segunda-feira, às 8 h,
            chega um e-mail por semana com o valor da semana e o foco do desafio, durante 4 semanas. No fim,
            um último e-mail ajuda a fechar o mês.
          </p>
        </div>
      )}
      {estado.plano.origemNarrativa === "padrao" && estado.podeRegenerar && (
        <div className="aviso nao-imprimir" style={{ marginTop: "1.5rem" }}>
          <p>
            A inteligência artificial não respondeu a tempo, então este plano foi escrito pelas nossas
            regras, com os seus números. Ele já está completo. Quando a IA voltar, o texto dela aparece
            neste mesmo link, ou você pode pedir agora.
          </p>
          <button
            type="button"
            className="botao-texto"
            onClick={() => {
              tentativasIA.current = 0;
              setEstado({ fase: "gerando" });
              void buscar(true);
            }}
          >
            Gerar a versão escrita pela IA
          </button>
        </div>
      )}
      <PlanoDocumento plano={estado.plano} />
    </>
  );
}
