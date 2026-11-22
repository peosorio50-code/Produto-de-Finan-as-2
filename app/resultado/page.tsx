import type { Metadata } from "next";
import { Suspense } from "react";
import { Marca } from "@/components/Marca";
import { Resultado } from "@/components/Resultado";
import { Rodape } from "@/components/Rodape";

export const metadata: Metadata = {
  title: "Seu resultado",
  robots: { index: false },
};

export default function PaginaResultado() {
  return (
    <>
      <header className="documento topo" style={{ paddingBottom: 0 }}>
        <Marca />
      </header>
      <main className="documento">
        <Suspense>
          {/* VENDA_ABERTA: false no config.js fecha a venda (o resultado mostra "Em breve"). */}
          <Resultado />
        </Suspense>
      </main>
      <Rodape />
    </>
  );
}
