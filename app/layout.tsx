import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource-variable/figtree";
import "@fontsource-variable/caveat";
import "./globals.css";
import { CapturaOrigem } from "@/components/CapturaOrigem";
import { Pixel } from "@/components/Pixel";
import { MARCA } from "@/lib/config";
import { urlPublica } from "@/lib/site";

const titulo = `${MARCA.nome}: em que dia o seu salário acaba?`;

export const metadata: Metadata = {
  metadataBase: new URL(urlPublica()),
  title: {
    default: `${MARCA.nome}: ${MARCA.slogan.toLowerCase()}`,
    template: `%s | ${MARCA.nome}`,
  },
  description: MARCA.descricao,
  // A imagem vem de app/opengraph-image.png (gerada por npm run kit).
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: MARCA.nome,
    title: titulo,
    description: "Quiz gratuito de 3 minutos: descubra em que dia o salário acaba, para onde ele vai e por onde começar.",
  },
  twitter: { card: "summary_large_image", title: titulo },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

/** O pixel depende do .env do servidor, lido a cada visita. */
async function PixelDoServidor() {
  await connection();
  const id = (process.env.META_PIXEL_ID || "").trim();
  return /^\d{5,20}$/.test(id) ? <Pixel id={id} /> : null;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CapturaOrigem />
        {children}
        <Suspense fallback={null}>
          <PixelDoServidor />
        </Suspense>
      </body>
    </html>
  );
}
