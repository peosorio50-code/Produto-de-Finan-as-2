import type { Metadata } from "next";
import { Suspense } from "react";
import { Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";
import { SairDaLista } from "@/components/SairDaLista";

export const metadata: Metadata = {
  title: "Sair da lista",
  robots: { index: false },
};

export default function PaginaSair() {
  return (
    <>
      <header className="fluxo topo">
        <Marca />
      </header>
      <main className="fluxo pilha-larga">
        <Suspense>
          <SairDaLista />
        </Suspense>
      </main>
      <Rodape />
    </>
  );
}
