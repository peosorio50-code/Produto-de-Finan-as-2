/**
 * Estilo e peças comuns do kit (estáticos e vídeos): fontes, cores e
 * exemplos do Mês Inteiro. Usado por gerar-kit.cjs e gerar-videos.cjs.
 */
const { join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const RAIZ = resolve(__dirname, "..");
const TMP = join(RAIZ, "kit", ".tmp");
const fonte = (pacote, arquivo) => pathToFileURL(join(RAIZ, "node_modules/@fontsource-variable", pacote, "files", arquivo)).href;

/* ---------- Estilo comum ---------- */

const CSS = `
@font-face { font-family: "Bricolage"; src: url("${fonte("bricolage-grotesque", "bricolage-grotesque-latin-wdth-normal.woff2")}") format("woff2"); font-weight: 200 800; font-stretch: 75% 100%; }
@font-face { font-family: "Figtree"; src: url("${fonte("figtree", "figtree-latin-wght-normal.woff2")}") format("woff2"); font-weight: 300 900; }
@font-face { font-family: "Caveat"; src: url("${fonte("caveat", "caveat-latin-wght-normal.woff2")}") format("woff2"); font-weight: 400 700; }
* { box-sizing: border-box; margin: 0; padding: 0; }
:root { --tinta:#10221a; --grafite:#56645c; --verde:#0e7a4e; --verde-forte:#0a5c3a; --verde-fundo:#e2f3e9; --vermelho:#c8372a;
  --vermelho-fundo:#fcebe8; --risco:#f4cdc6; --linha:#d5dfd8; --grifo:#ffe45e; --fundo:#eaf3ed; }
html, body { width: 100%; height: 100%; overflow: hidden; }
body { font-family: "Figtree", sans-serif; color: var(--tinta); background-color: var(--fundo);
  background-image: linear-gradient(rgba(14,122,78,.075) 1px, transparent 1px), linear-gradient(90deg, rgba(14,122,78,.075) 1px, transparent 1px);
  background-size: 44px 44px; -webkit-font-smoothing: antialiased; }
.quadro { position: absolute; inset: 0; padding: 76px 68px 58px; display: flex; flex-direction: column; }
.titulo { font-family: "Bricolage"; font-weight: 800; font-stretch: 88%; font-size: 92px; line-height: .98; letter-spacing: -.035em; }
.grifo { background: linear-gradient(var(--grifo), var(--grifo)) no-repeat 0 72% / 100% .58em; padding: 0 .06em; margin: 0 -.06em;
  -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.sobre { font-size: 26px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--verde); margin-bottom: 22px; }
.sub { font-size: 32px; color: var(--grafite); margin-top: 24px; line-height: 1.35; }
.miolo { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 34px 0 10px; }
.nota { font-size: 27px; color: var(--grafite); line-height: 1.4; margin-top: 34px; }
.minusculo { font-size: 19px; color: var(--grafite); margin-top: 14px; }
.rodape { display: flex; align-items: flex-end; justify-content: space-between; }
.marca { font-family: "Bricolage"; font-weight: 800; font-size: 46px; letter-spacing: -.035em; line-height: 1; display: inline-flex; flex-direction: column; align-self: flex-start; }
.marca svg { width: 100%; height: 12px; margin-top: 4px; color: var(--verde); }
.dominio { font-size: 20px; color: var(--grafite); margin-top: 12px; }
.cta { background: var(--verde); color: #fff; font-family: "Bricolage"; font-weight: 800; font-size: 31px; padding: 22px 36px; border-radius: 999px; }
.cartao { background: #fff; border-radius: 24px; padding: 42px; box-shadow: 0 2px 0 var(--linha), 0 34px 70px -34px rgba(16,34,26,.4); }
.inclinado { transform: rotate(-1deg); }
.caneta { font-family: "Caveat"; font-weight: 700; font-size: 46px; line-height: 1.05; color: var(--verde); }
.caneta.vermelho { color: var(--vermelho); }
.cab { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 18px; margin-bottom: 24px; border-bottom: 3px solid var(--tinta); font-size: 28px; }
.cab b { font-family: "Bricolage"; font-weight: 700; letter-spacing: -.01em; }
.cab span { color: var(--grafite); font-size: 22px; }
.grade { display: grid; grid-template-columns: repeat(10, 1fr); gap: 9px; }
.dia { position: relative; aspect-ratio: 1; display: grid; place-items: center; border-radius: 9px; font-size: 23px; font-weight: 700; }
.dia.ok { background: var(--verde-fundo); color: var(--verde-forte); }
.dia.nao { background: repeating-linear-gradient(-45deg, var(--vermelho-fundo) 0 7px, var(--risco) 7px 11px); color: var(--vermelho); }
.dia.fim::after { content: ""; position: absolute; inset: -9px; border: 4px solid var(--vermelho); border-radius: 51% 49% 54% 46% / 47% 55% 45% 53%; transform: rotate(-8deg); }
.linha { display: flex; align-items: baseline; gap: 14px; padding: 20px 0; border-bottom: 2px dashed var(--linha); font-size: 32px; }
.linha .pontos { flex: 1; border-bottom: 3px dotted var(--linha); transform: translateY(-8px); }
.linha:last-child { border-bottom: 0; }
.num { font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 700; }
.verde { color: var(--verde); } .vermelho { color: var(--vermelho); }
.opcao { display: flex; align-items: center; gap: 22px; background: #fff; border: 3px solid var(--linha); border-radius: 18px; padding: 24px 28px; font-size: 32px; font-weight: 600; margin-top: 16px; }
.opcao i { width: 34px; height: 34px; border-radius: 50%; border: 3px solid var(--grafite); flex: none; }
.opcao.marcada { border-color: var(--verde); background: var(--verde-fundo); }
.opcao.marcada i { border-color: var(--verde); background: var(--verde) radial-gradient(circle, #fff 0 5px, transparent 6px); }
.potes { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.pote { background: #fff; border-radius: 20px; padding: 28px 30px 30px; border-top: 16px solid var(--tinta); box-shadow: 0 2px 0 var(--linha), 0 24px 50px -30px rgba(16,34,26,.35); }
.pote b { display: block; font-size: 30px; }
.pote span { display: block; font-family: "Bricolage"; font-weight: 800; font-size: 58px; letter-spacing: -.03em; margin-top: 8px; }
.pote small { display: block; font-size: 22px; color: var(--grafite); margin-top: 6px; }
.pote.parcelas { border-top-color: var(--grafite); } .pote.dia-a-dia { border-top-color: var(--verde); }
.pote.futuro { border-top-color: var(--verde-forte); background: var(--verde-fundo); }
.chip { display: inline-block; font-family: "Bricolage"; font-weight: 700; font-size: 38px; letter-spacing: -.015em; padding: 18px 28px; border-radius: 16px;
  background: #fff; box-shadow: 0 2px 0 var(--linha), 0 18px 30px -22px rgba(16,34,26,.35); margin: 0 14px 18px 0; }
.chip.amarelo { background: var(--grifo); } .chip.verde { background: var(--verde); color: #fff; }
.selo { background: var(--tinta); color: #fff; border-radius: 22px; padding: 22px 30px; text-align: center; font-family: "Bricolage"; font-weight: 800; line-height: 1.05; }
`;

const RISCO = `<svg viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><path d="M2 5.5 C 20 1.5, 38 7, 55 4 S 86 2, 98 4.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
const marca = (tamanho = 46) => `<span class="marca" style="font-size:${tamanho}px">Mês Inteiro${RISCO}</span>`;
const rodape = `<div class="rodape"><div>${marca()}<p class="dominio">mesinteiro.folegofinanceiro.shop</p></div><span class="cta">Faça o quiz grátis →</span></div>`;

function calendario(ate, { tamanho = 23 } = {}) {
  let dias = "";
  for (let d = 1; d <= 30; d++) {
    const classe = d <= ate ? "ok" : "nao";
    dias += `<div class="dia ${classe}${d === ate ? " fim" : ""}" style="font-size:${tamanho}px">${d}</div>`;
  }
  return `<div class="grade">${dias}</div>`;
}

const criativo = (titulo, miolo, extra = "") => `<div class="quadro">${extra}<h1 class="titulo">${titulo}</h1><div class="miolo">${miolo}</div>${rodape}</div>`;

/* ---------- Exemplos (casos fictícios calculados pelo motor do site) ---------- */

// lib/exemplo.ts: salário de R$ 3.200, o dinheiro acaba no dia 20.
const EX = { renda: "R$ 3.200", dia: 20, delivery: "R$ 420", deliveryAno: "R$ 5.040", compras: "R$ 280", comprasAno: "R$ 3.360" };
// Caso dos potes: um mês que fecha com R$ 160 guardados.
const POTES = [
  ["contas", "Contas fixas", "R$ 1.540", "Sai no dia do pagamento"],
  ["parcelas", "Parcelas", "R$ 380", "Nenhuma parcela nova"],
  ["dia-a-dia", "Dia a dia", "R$ 1.120", "Dividido por semana"],
  ["futuro", "Futuro", "R$ 160", "Separado antes de tudo"],
];
const SEMANA = "R$ 260";

module.exports = { RAIZ, TMP, fonte, CSS, RISCO, marca, rodape, calendario, criativo, EX, POTES, SEMANA };
