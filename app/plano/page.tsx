import type { Metadata } from "next";
import { Suspense } from "react";
import { Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";
import { TelaPlano } from "@/components/TelaPlano";

export const metadata: Metadata = {
  title: "Seu plano",
  robots: { index: false },
};

/** Página de obrigado da Kiwify e link do plano (/plano?ref=...). */
export default function PaginaPlano() {
  return (
    <>
      <header className="documento topo nao-imprimir" style={{ paddingBottom: 0 }}>
        <Marca />
      </header>
      <main className="documento">
        <Suspense>
          <TelaPlano />
        </Suspense>
      </main>
      <Rodape />
    </>
  );
}
