import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Marca } from "@/components/Marca";
import { Resultado } from "@/components/Resultado";
import { Rodape } from "@/components/Rodape";
import { modoPagamento } from "@/lib/pagamento";

export const metadata: Metadata = {
  title: "Seu resultado",
  robots: { index: false },
};

export default async function PaginaResultado() {
  // A venda só aparece aberta quando há um meio de pagamento configurado,
  // o que depende do ambiente em que o site está rodando.
  await connection();
  const vendaAberta = modoPagamento() !== "indisponivel";

  return (
    <>
      <header className="documento topo" style={{ paddingBottom: 0 }}>
        <Marca />
      </header>
      <main className="documento">
        <Suspense>
          <Resultado vendaAberta={vendaAberta} />
        </Suspense>
      </main>
      <Rodape />
    </>
  );
}
