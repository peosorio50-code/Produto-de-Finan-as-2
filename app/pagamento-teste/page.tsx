import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Marca } from "@/components/Marca";
import { PRECO_REAIS } from "@/lib/config";
import { brlCentavos } from "@/lib/formato";
import { modoPagamento } from "@/lib/pagamento";
import { referenciaValida } from "@/lib/pedido";

export const metadata: Metadata = {
  title: "Pagamento de teste",
  robots: { index: false },
};

/** Tela que substitui o checkout da Kiwify quando PAGAMENTO_MODO=teste. */
export default async function PaginaPagamentoTeste({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  if (modoPagamento() !== "teste" || !referenciaValida(ref)) notFound();

  return (
    <>
      <header className="fluxo topo">
        <Marca />
      </header>
      <main className="fluxo pilha-larga">
        <div className="pilha">
          <h1 className="titulo-2">Pagamento de teste</h1>
          <p className="apoio">
            O site está em modo de teste: nada é cobrado. No site publicado, esta tela dá lugar ao
            checkout da Kiwify, com Pix e cartão.
          </p>
        </div>
        <dl className="linhas">
          <div className="linhas__item">
            <dt>Plano completo</dt>
            <dd>{brlCentavos(PRECO_REAIS)}</dd>
          </div>
          <div className="linhas__item">
            <dt>Pedido</dt>
            <dd className="pequeno">{ref}</dd>
          </div>
        </dl>
        <div className="acoes-plano">
          <Link href={`/plano?ref=${ref}`} className="botao">
            Simular pagamento aprovado
          </Link>
          <Link href="/resultado?pagamento=falhou" className="botao botao--contorno">
            Simular pagamento recusado
          </Link>
        </div>
      </main>
    </>
  );
}
