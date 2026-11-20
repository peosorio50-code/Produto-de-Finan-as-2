import type { Metadata } from "next";
import Link from "next/link";
import { Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";
import { MARCA } from "@/lib/config";

export const metadata: Metadata = {
  title: "Sair da lista",
  robots: { index: false },
};

/**
 * Página do link "não quero mais receber" dos e-mails. Abrir o link não
 * descadastra: é preciso tocar no botão (leitores de e-mail e antivírus
 * abrem links sozinhos).
 */
export default async function PaginaSair({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string; feito?: string }>;
}) {
  const { e, t, feito } = await searchParams;
  const valido = typeof e === "string" && e.includes("@") && typeof t === "string" && /^[0-9a-f]{32}$/.test(t);

  return (
    <>
      <header className="fluxo topo">
        <Marca />
      </header>
      <main className="fluxo pilha-larga">
        {feito ? (
          <div className="pilha">
            <h1 className="titulo-2">Pronto, você saiu da lista</h1>
            <p className="apoio">
              Você não vai mais receber e-mails sobre o quiz do {MARCA.nome}. Se comprou o plano, o link
              dele continua funcionando normalmente.
            </p>
            <Link href="/" className="botao botao--contorno">
              Voltar ao início
            </Link>
          </div>
        ) : valido ? (
          <form className="pilha" method="post" action={`/api/sair?e=${encodeURIComponent(e)}&t=${t}`}>
            <h1 className="titulo-2">Não quer mais receber nossos e-mails?</h1>
            <p className="apoio">
              Toque no botão para parar de receber os e-mails sobre o quiz no endereço <strong>{e}</strong>.
            </p>
            <button type="submit" className="botao">
              Sair da lista
            </button>
          </form>
        ) : (
          <div className="pilha">
            <h1 className="titulo-2">Link incompleto</h1>
            <p className="apoio">
              Abra esta página pelo link que está no fim do e-mail.
              {MARCA.contatoEmail && (
                <>
                  {" "}
                  Ou escreva para <a href={`mailto:${MARCA.contatoEmail}`}>{MARCA.contatoEmail}</a> pedindo para
                  sair.
                </>
              )}
            </p>
          </div>
        )}
      </main>
      <Rodape />
    </>
  );
}
