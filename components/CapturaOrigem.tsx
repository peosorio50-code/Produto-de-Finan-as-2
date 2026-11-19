"use client";

import { useEffect } from "react";
import { gravarOrigem } from "@/lib/armazenamento";
import type { Origem } from "@/lib/tipos";

const CHAVES: (keyof Origem)[] = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];

/**
 * Guarda os parâmetros de campanha (utm_*, gclid, fbclid) da visita, para o
 * lead chegar ao webhook dizendo de qual anúncio veio. Só grava quando a URL
 * traz algum, então a última campanha que trouxe a pessoa é a que vale.
 */
export function CapturaOrigem() {
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const origem: Origem = {};
    for (const chave of CHAVES) {
      const valor = parametros.get(chave);
      if (valor) origem[chave] = valor.slice(0, 200);
    }
    if (Object.keys(origem).length > 0) gravarOrigem(origem);
  }, []);
  return null;
}
