"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlanoDocumento } from "@/components/PlanoDocumento";
import { gravarPlano, lerPedido, lerPlano } from "@/lib/armazenamento";
import { PRECO_REAIS } from "@/lib/config";
import { rastrear } from "@/lib/pixel";
import type { PlanoCompleto } from "@/lib/tipos";

type Estado =
  | { fase: "carregando" }
  | { fase: "sem_pedido" }
  | { fase: "gerando" }
  | { fase: "aguardando_pagamento" }
  | { fase: "erro" }
  | { fase: "pronto"; plano: PlanoCompleto; podeRegenerar: boolean };

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

/** Quantas vezes conferir sozinho se o pagamento caiu, a cada 5 segundos. */
const TENTATIVAS_AUTOMATICAS = 24;

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
      <p className="apoio">Leva cerca de um minuto. Não feche esta página.</p>
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
 * plano (/plano?ref=...). O plano fica guardado no servidor: o link abre em
 * qualquer aparelho, e a IA só é chamada na primeira vez.
 */
export function TelaPlano({ contatoEmail, reenvioPorEmail }: { contatoEmail: string; reenvioPorEmail: boolean }) {
  const parametros = useSearchParams();
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const ref = useRef<string | null>(null);
  const urlPagamento = useRef<string | null>(null);
  const iniciou = useRef(false);
  const tentativas = useRef(0);

  const refDaUrl = parametros.get("ref");

  const buscar = useCallback(async (regenerar = false) => {
    const atual = ref.current;
    if (!atual) return;
    setEstado((e) => (e.fase === "aguardando_pagamento" ? e : { fase: "gerando" }));
    try {
      const resposta = await fetch("/api/plano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: atual, regenerar }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (resposta.status === 402) {
        if (dados.urlPagamento) urlPagamento.current = dados.urlPagamento;
        setEstado({ fase: "aguardando_pagamento" });
        return;
      }
      if (resposta.status === 404 || resposta.status === 400) {
        setEstado({ fase: "sem_pedido" });
        return;
      }
      if (!resposta.ok) throw new Error(String(resposta.status));
      const { plano, podeRegenerar } = dados as { plano: PlanoCompleto; podeRegenerar: boolean };
      gravarPlano(plano);
      contarCompra(plano);
      setEstado({ fase: "pronto", plano, podeRegenerar });
    } catch {
      setEstado({ fase: "erro" });
    }
  }, []);

  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;

    // A Kiwify volta para /plano sem a referência: ela fica guardada neste
    // navegador desde o clique em comprar. O link do e-mail já traz a referência.
    const local = lerPedido();
    const atual = refDaUrl ?? local?.ref ?? null;
    if (!atual) {
      setEstado({ fase: "sem_pedido" });
      return;
    }
    ref.current = atual;
    if (local?.ref === atual) urlPagamento.current = local.urlPagamento;
    const guardado = lerPlano(atual);
    if (guardado?.origemNarrativa === "ia") {
      setEstado({ fase: "pronto", plano: guardado, podeRegenerar: false });
      return;
    }
    void buscar();
  }, [buscar, refDaUrl]);

  // Pix pode levar alguns segundos para ser confirmado: confere de novo sozinho.
  useEffect(() => {
    if (estado.fase !== "aguardando_pagamento") return;
    if (tentativas.current >= TENTATIVAS_AUTOMATICAS) return;
    const espera = setTimeout(() => {
      tentativas.current += 1;
      void buscar();
    }, 5000);
    return () => clearTimeout(espera);
  }, [estado, buscar]);

  if (estado.fase === "carregando") return null;

  if (estado.fase === "gerando") return <Espera />;

  if (estado.fase === "sem_pedido") {
    return (
      <div className="espera">
        <h1 className="titulo-2">Não encontramos seu pedido neste aparelho</h1>
        <p className="apoio">
          Abra esta página pelo link do e-mail de confirmação, ou no navegador em que você respondeu ao
          quiz.
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
              const r = await fetch("/api/reenviar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });
              if (!r.ok) throw new Error();
              return "Se houver uma compra com este e-mail, o link chega em alguns minutos. Confira também o spam.";
            }}
          />
        )}
        <Link href="/diagnostico" className="botao botao--contorno">
          Fazer o quiz de novo
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
          {urlPagamento.current && (
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
              const r = await fetch("/api/vincular", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ref: ref.current, email }),
              });
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
        <button type="button" className="botao" onClick={() => void buscar()}>
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <>
      {estado.plano.origemNarrativa === "padrao" && estado.podeRegenerar && (
        <div className="aviso nao-imprimir" style={{ marginTop: "1.5rem" }}>
          <p>
            A inteligência artificial não respondeu a tempo, então este plano foi escrito pelas nossas
            regras, com os seus números. Ele já está completo, e você pode pedir a versão escrita pela IA.
          </p>
          <button type="button" className="botao-texto" onClick={() => void buscar(true)}>
            Gerar a versão escrita pela IA
          </button>
        </div>
      )}
      <PlanoDocumento plano={estado.plano} />
    </>
  );
}
