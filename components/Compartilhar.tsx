"use client";

import { MARCA } from "@/lib/config";

/**
 * Compartilhar o tipo de mês (sem nenhum número da pessoa). O link leva para
 * a página inicial com utm_source=compartilhar, para medir quem chega por
 * indicação.
 */
export function Compartilhar({ titulo, id }: { titulo: string; id: string }) {
  function compartilhar() {
    const url = `${window.location.origin}/?utm_source=compartilhar&utm_medium=resultado&utm_campaign=${id}`;
    const texto = `Fiz o quiz do ${MARCA.nome} e o meu tipo de mês deu “${titulo}”. Descubra em que dia o seu salário acaba, de graça:`;
    if (typeof navigator.share === "function") {
      navigator.share({ text: texto, url }).catch(() => {});
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`, "_blank", "noopener");
  }
  return (
    <button type="button" className="botao botao--contorno botao--compacto nao-imprimir" onClick={compartilhar}>
      Compartilhar meu tipo de mês
    </button>
  );
}
