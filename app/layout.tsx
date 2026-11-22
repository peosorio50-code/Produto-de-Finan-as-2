import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource-variable/figtree";
import "@fontsource-variable/caveat";
import "./globals.css";
import { CapturaOrigem } from "@/components/CapturaOrigem";
import { Pixel } from "@/components/Pixel";
import Script from "next/script";
import { SITE } from "@/lib/api";
import { MARCA } from "@/lib/config";

const titulo = `${MARCA.nome}: em que dia o seu salário acaba?`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
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

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* Configuração editável (pixel, contato, upsell...): public/config.js, carregado antes do site. */}
        <Script src="/config.js" strategy="beforeInteractive" />
        <CapturaOrigem />
        {children}
        <Pixel />
      </body>
    </html>
  );
}
