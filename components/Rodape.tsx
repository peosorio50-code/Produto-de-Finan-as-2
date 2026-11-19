import Link from "next/link";
import { connection } from "next/server";
import { MARCA } from "@/lib/config";

export async function Rodape() {
  // O e-mail de atendimento vem do .env do servidor, lido a cada visita.
  await connection();
  return (
    <footer className="rodape nao-imprimir">
      <div className="pagina rodape__grade">
        <div className="pilha">
          <p className="titulo-3">{MARCA.nome}</p>
          <p className="pequeno">Um produto {MARCA.casa}</p>
          <nav className="rodape__links pequeno" aria-label="Rodapé">
            <Link href="/privacidade">Privacidade e termos</Link>
            {MARCA.contatoEmail && <a href={`mailto:${MARCA.contatoEmail}`}>{MARCA.contatoEmail}</a>}
          </nav>
        </div>
        <p className="pequeno">
          O {MARCA.nome} é um material educativo. Não é instituição financeira, não concede crédito, não
          indica investimentos e não substitui orientação jurídica ou financeira individual. Os valores e
          prazos são estimativas feitas a partir das informações que você fornece.
        </p>
      </div>
    </footer>
  );
}
