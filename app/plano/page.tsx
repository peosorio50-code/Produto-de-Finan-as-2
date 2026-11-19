import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";
import { TelaPlano } from "@/components/TelaPlano";
import { MARCA } from "@/lib/config";
import { emailConfigurado } from "@/lib/email";

export const metadata: Metadata = {
  title: "Seu plano",
  robots: { index: false },
};

export default async function PaginaPlano() {
  // O e-mail de atendimento e o reenvio dependem da configuração do servidor.
  await connection();
  return (
    <>
      <header className="documento topo nao-imprimir" style={{ paddingBottom: 0 }}>
        <Marca />
      </header>
      <main className="documento">
        <Suspense>
          <TelaPlano contatoEmail={MARCA.contatoEmail} reenvioPorEmail={emailConfigurado()} />
        </Suspense>
      </main>
      <Rodape />
    </>
  );
}
