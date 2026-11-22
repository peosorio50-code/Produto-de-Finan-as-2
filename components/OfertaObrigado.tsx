"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/api";
import { diagnosticar } from "@/lib/diagnostico";
import { contar } from "@/lib/eventos";
import { temSinalDeDivida } from "@/lib/resumo";
import type { Respostas } from "@/lib/tipos";

const SITE_FOLEGO = "https://folegofinanceiro.shop";
const chave = (ref: string) => `mesinteiro:oferta:${ref}`;

/**
 * A oferta da página de obrigado aparece uma vez, logo depois da compra, só
 * com o upsell configurado (UPSELL_ID no config.js) e só para quem mostrou no
 * quiz sinal de dívida: fecha o mês no crédito, paga o mínimo ou atrasa a
 * fatura, ou tem parcela pesada. Para os outros, a página vai direto ao plano.
 */
export function ofertaCabe(ref: string, respostas: Respostas | undefined): boolean {
  if (!config().upsell.id || !respostas) return false;
  try {
    if (window.localStorage.getItem(chave(ref))) return false;
    return temSinalDeDivida(respostas, diagnosticar(respostas));
  } catch {
    return false;
  }
}

function marcar(ref: string, valor: string) {
  try {
    window.localStorage.setItem(chave(ref), valor);
  } catch {
    // Sem armazenamento, a oferta pode aparecer de novo neste aparelho: sem problema.
  }
}

/**
 * Upsell de 1 clique: o plano do Fôlego (dívidas), da mesma casa. Quem aceita
 * responde ao quiz do Fôlego com o mesmo e-mail, e o plano sai sem pagar de
 * novo (o servidor liga a compra ao quiz pelo e-mail). Se a pessoa não fizer o
 * quiz, o servidor do Mês Inteiro manda lembretes.
 */
export function OfertaObrigado({ refPedido, fechar }: { refPedido: string; fechar: () => void }) {
  const [aceitou, setAceitou] = useState(false);
  const { id, script, checkout, preco, precoNormal } = config().upsell;

  useEffect(() => {
    // O botão precisa existir antes do script da Kiwify, que procura o id dele.
    const s = document.createElement("script");
    s.src = script;
    s.async = true;
    document.body.appendChild(s);
    contar("Upsell");
    return () => {
      s.remove();
    };
  }, [script]);

  if (aceitou) {
    return (
      <section className="oferta-obrigado nao-imprimir" aria-live="polite">
        <p className="sobretitulo">Plano das dívidas</p>
        <h2 className="titulo-2">Falta só o quiz do Fôlego</h2>
        <p>
          Quando o pagamento for confirmado, responda ao quiz do Fôlego <strong>com o mesmo e-mail desta compra</strong>.
          No fim, o botão leva direto para o plano das dívidas, sem pagar de novo. O link também chega por e-mail.
        </p>
        <div className="acoes-plano" style={{ marginTop: "1rem" }}>
          <a className="botao" href={`${SITE_FOLEGO}/diagnostico?utm_source=mesinteiro&utm_medium=upsell`} target="_blank" rel="noopener">
            Abrir o quiz do Fôlego
          </a>
          <button type="button" className="botao-texto" onClick={fechar}>
            Ver o meu plano do mês
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="oferta-obrigado nao-imprimir" aria-labelledby="oferta-titulo">
      <p className="sobretitulo">Antes de abrir o seu plano · só nesta página</p>
      <h2 className="titulo-2" id="oferta-titulo">
        E as parcelas e dívidas que já chegam no mês?
      </h2>
      <p>
        O Mês Inteiro organiza o salário. O <strong>Fôlego</strong>, da mesma casa, faz o plano das dívidas: a ordem
        de pagamento, o que negociar primeiro, quanto separar por mês e mensagens prontas para falar com cada credor.
      </p>
      <p className="oferta-obrigado__preco">
        <span>
          Preço normal <s>R$ {precoNormal}</s>
        </span>
        <strong>R$ {preco}</strong>
        <span className="pequeno">nesta página, uma vez só</span>
      </p>
      <button
        type="button"
        className="botao botao--largo"
        id={`kiwify-upsell-trigger-${id}`}
        onClick={(e) => {
          contar("UpsellSim");
          marcar(refPedido, "sim");
          e.currentTarget.textContent = "Processando…";
          // Depois do 1 clique da Kiwify, mostra como continuar.
          setTimeout(() => setAceitou(true), 6000);
        }}
      >
        Sim, quero o plano das dívidas por R$ {preco}
      </button>
      {checkout && (
        <a
          className="botao botao--contorno botao--largo"
          style={{ marginTop: "0.625rem" }}
          href={checkout}
          target="_blank"
          rel="noopener"
          onClick={() => {
            contar("UpsellSim");
            marcar(refPedido, "pix");
            setAceitou(true);
          }}
        >
          Paguei no Pix: quero pagar esta oferta no Pix
        </a>
      )}
      <p className="pequeno apoio" style={{ textAlign: "center" }}>
        Com um clique: o pagamento usa o mesmo cartão da compra anterior. Garantia de 7 dias.
      </p>
      <p style={{ textAlign: "center" }}>
        <button
          type="button"
          className="botao-texto"
          onClick={() => {
            marcar(refPedido, "nao");
            fechar();
            window.scrollTo({ top: 0 });
          }}
        >
          Não, obrigado. Quero ver o meu plano
        </button>
      </p>
    </section>
  );
}
