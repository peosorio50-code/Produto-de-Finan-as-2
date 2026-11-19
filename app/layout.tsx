import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource-variable/figtree";
import "@fontsource-variable/caveat";
import "./globals.css";
import { CapturaOrigem } from "@/components/CapturaOrigem";
import { MARCA } from "@/lib/config";

export const metadata: Metadata = {
  title: {
    default: `${MARCA.nome}: ${MARCA.slogan.toLowerCase()}`,
    template: `%s | ${MARCA.nome}`,
  },
  description: MARCA.descricao,
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
        <CapturaOrigem />
        {children}
      </body>
    </html>
  );
}
