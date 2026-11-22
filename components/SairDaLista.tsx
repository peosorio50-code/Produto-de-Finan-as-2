"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, config } from "@/lib/api";
import { MARCA } from "@/lib/config";

/**
 * Página do link "não quero mais receber" dos e-mails. Abrir o link não
 * descadastra: é preciso tocar no botão (leitores de e-mail e antivírus abrem
 * links sozinhos). O botão manda um POST para o servidor, que volta para
 * /sair?feito=1.
 */
export function SairDaLista() {
  const p = useSearchParams();
  const e = p.get("e") ?? "";
  const t = p.get("t") ?? "";
  const valido = e.includes("@") && /^[0-9a-f]{32}$/.test(t);
  const contato = config().contato;

  if (p.get("feito")) {
    return (
      <div className="pilha">
        <h1 className="titulo-2">Pronto, você saiu da lista</h1>
        <p className="apoio">
          Você não vai mais receber e-mails sobre o quiz do {MARCA.nome}. Se comprou o plano, o link dele
          continua funcionando normalmente.
        </p>
        <Link href="/" className="botao botao--contorno">
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (valido) {
    return (
      <form className="pilha" method="post" action={`${api()}/sair?e=${encodeURIComponent(e)}&t=${t}`}>
        <h1 className="titulo-2">Não quer mais receber nossos e-mails?</h1>
        <p className="apoio">
          Toque no botão para parar de receber os e-mails sobre o quiz no endereço <strong>{e}</strong>.
        </p>
        <button type="submit" className="botao">
          Sair da lista
        </button>
      </form>
    );
  }

  return (
    <div className="pilha">
      <h1 className="titulo-2">Link incompleto</h1>
      <p className="apoio">
        Abra esta página pelo link que está no fim do e-mail.
        {contato && (
          <>
            {" "}
            Ou escreva para <a href={`mailto:${contato}`}>{contato}</a> pedindo para sair.
          </>
        )}
      </p>
    </div>
  );
}
