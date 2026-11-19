import Link from "next/link";
import { MARCA } from "@/lib/config";

/** Nome do produto com um risco de caneta por baixo. */
export function Marca() {
  return (
    <Link href="/" className="marca" aria-label={`${MARCA.nome}, página inicial`}>
      {MARCA.nome}
      <svg className="marca__risco" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M2 5.5 C 20 1.5, 38 7, 55 4 S 86 2, 98 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Link>
  );
}
