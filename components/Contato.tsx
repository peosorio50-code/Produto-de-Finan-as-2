"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/api";

/** E-mail de atendimento do config.js (lido depois de montar, para o HTML do build bater com o do navegador). */
export function useContato(): string {
  const [email, setEmail] = useState("");
  useEffect(() => setEmail(config().contato), []);
  return email;
}

/** Mostra "antes + link do e-mail + depois" só quando há e-mail de atendimento configurado. */
export function EmailContato({ antes = "", depois = "" }: { antes?: string; depois?: string }) {
  const email = useContato();
  if (!email) return null;
  return (
    <>
      {antes}
      <a href={`mailto:${email}`}>{email}</a>
      {depois}
    </>
  );
}

/** Seção da política que só existe com o pixel da Meta ligado no config.js. */
export function SoComPixel({ children }: { children: React.ReactNode }) {
  const [ligado, setLigado] = useState(false);
  useEffect(() => setLigado(/^\d{5,20}$/.test(config().pixel)), []);
  return ligado ? <>{children}</> : null;
}
