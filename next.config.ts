import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Gera .next/standalone: o servidor que roda na VPS, sem precisar de npm install lá.
  output: "standalone",
};

export default config;
