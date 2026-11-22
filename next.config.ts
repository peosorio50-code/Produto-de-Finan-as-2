import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Site estático: a pasta out/ vai inteira para o Cloudflare Pages (projeto mesinteiro,
  // domínio mesinteiro.folegofinanceiro.shop). A parte de servidor roda no servidor do
  // Meu Santo Protetor (api.mapadaalma.online/api/mesinteiro, módulo mesinteiro.py).
  output: "export",
  images: { unoptimized: true },
};

export default config;
