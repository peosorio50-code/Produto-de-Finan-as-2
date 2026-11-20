#!/usr/bin/env node
/**
 * Gera o kit de lançamento do Mês Inteiro a partir de HTML, com as fontes e
 * as cores do site:
 *
 *   npm run kit
 *
 * - kit/kiwify/   imagem do produto (1000x1000) e banners do checkout
 * - kit/criativos/ 10 anúncios estáticos 4:5 (1080x1350) e uma folha com todos
 * - app/opengraph-image.png  imagem da prévia do link (WhatsApp, Facebook...)
 * - app/apple-icon.png       ícone da tela inicial do iPhone
 *
 * Os números dos exemplos são de casos fictícios calculados pelo mesmo motor
 * do site (lib/exemplo.ts e o caso dos potes). Precisa do Playwright com o
 * Chromium instalado (npx playwright install chromium).
 */
const { mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Este script precisa do Playwright: npm install --no-save playwright && npx playwright install chromium");
  process.exit(1);
}

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

/* ---------- Peças ---------- */

const pecas = [];
const peca = (arquivo, largura, altura, corpo) => pecas.push({ arquivo, largura, altura, corpo });

peca("kit/criativos/01-que-dia-acaba.png", 1080, 1350, criativo(
  `Em que dia<br>o salário <span class="grifo">acaba?</span>`,
  `<div class="cartao inclinado">
     <div class="cab"><b>O mês de um salário de ${EX.renda}</b><span>exemplo</span></div>
     ${calendario(EX.dia)}
     <p class="caneta vermelho" style="margin-top:30px">dia ${EX.dia}: o dinheiro acabou</p>
     <p class="caneta vermelho">${30 - EX.dia} dias no cartão, todo mês</p>
   </div>
   <p class="nota">O quiz gratuito mostra em que dia o dinheiro acaba, para onde ele vai e por onde começar.</p>`,
));

peca("kit/criativos/02-gasto-invisivel.png", 1080, 1350, criativo(
  `Pelas contas, dava até o dia 28. <span class="grifo">Acabou no dia 15.</span>`,
  `<div class="cartao inclinado">
     <div class="linha"><span>Pelas contas</span><span class="pontos"></span><span class="num verde">dia 28</span></div>
     <div class="linha"><span>Na vida real</span><span class="pontos"></span><span class="num vermelho">dia 15</span></div>
     <div class="linha"><span>Gasto que não aparece</span><span class="pontos"></span><span class="num vermelho">R$ 520/mês</span></div>
     <p class="caneta" style="margin-top:22px">o quiz encontra essa diferença</p>
   </div>
   <p class="nota">Quando o dinheiro acaba antes do que as contas dizem, a diferença tem nome: gasto invisível.</p>
   <p class="minusculo">Caso fictício, calculado pelo mesmo sistema do quiz.</p>`,
));

peca("kit/criativos/03-quiz-celular.png", 1080, 1350, `<div class="quadro">
  <h1 class="titulo" style="font-size:84px">O quiz gratuito <span class="grifo">do salário</span></h1>
  <p class="sub">3 minutos. Uma pergunta por tela.</p>
  <div class="miolo" style="align-items:center">
    <div style="width:600px;background:#fff;border:16px solid var(--tinta);border-radius:56px;padding:44px 36px 40px;box-shadow:0 40px 80px -40px rgba(16,34,26,.5)">
      <div style="height:10px;border-radius:9px;background:var(--verde-fundo)"><div style="width:18%;height:100%;border-radius:9px;background:var(--verde)"></div></div>
      <p style="font-size:20px;color:var(--grafite);margin-top:18px">Pergunta 1 de 15</p>
      <p style="font-family:Bricolage;font-weight:800;font-size:38px;line-height:1.08;letter-spacing:-.02em;margin-top:10px">Em que parte do mês o dinheiro costuma acabar?</p>
      <div class="opcao" style="font-size:25px;padding:18px 20px"><i style="width:26px;height:26px"></i>Logo na primeira semana</div>
      <div class="opcao marcada" style="font-size:25px;padding:18px 20px"><i style="width:26px;height:26px"></i>Lá pela metade do mês</div>
      <div class="opcao" style="font-size:25px;padding:18px 20px"><i style="width:26px;height:26px"></i>Na última semana</div>
      <div class="opcao" style="font-size:25px;padding:18px 20px"><i style="width:26px;height:26px"></i>Chega ao fim, no limite</div>
    </div>
  </div>
  ${rodape}
</div>`);

peca("kit/criativos/04-delivery-no-ano.png", 1080, 1350, criativo(
  `Delivery: ${EX.delivery} por mês. <span class="grifo">${EX.deliveryAno} no ano.</span>`,
  `<div class="cartao inclinado">
     <div class="cab"><b>Vazamentos do mês</b><span>exemplo</span></div>
     <div class="linha"><span>Delivery e lanches</span><span class="pontos"></span><span class="num">${EX.delivery}</span></div>
     <p class="caneta vermelho" style="margin:-4px 0 6px">× 12 = ${EX.deliveryAno} no ano</p>
     <div class="linha"><span>Compras e lazer</span><span class="pontos"></span><span class="num">${EX.compras}</span></div>
     <p class="caneta vermelho" style="margin-top:-4px">× 12 = ${EX.comprasAno} no ano</p>
   </div>
   <p class="nota">Mais que um salário inteiro de ${EX.renda}, saindo aos poucos. O quiz mostra os vazamentos que mais pesam.</p>`,
));

peca("kit/criativos/05-busca.png", 1080, 1350, criativo(
  `A pergunta que mais se faz <span class="grifo">no dia 20:</span>`,
  `<div style="display:flex;align-items:center;gap:22px;background:#fff;border-radius:999px;padding:30px 40px;font-size:33px;box-shadow:0 2px 0 var(--linha),0 30px 60px -34px rgba(16,34,26,.4)">
     <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#56645c" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
     <span>por que o dinheiro acaba antes do mês<span style="color:var(--verde)">|</span></span>
   </div>
   <div class="cartao" style="margin-top:30px">
     <p style="font-size:22px;color:var(--grafite)">mesinteiro.folegofinanceiro.shop</p>
     <p style="font-size:38px;font-weight:700;color:var(--verde);text-decoration:underline;text-underline-offset:6px;margin-top:10px;line-height:1.2">Quiz gratuito: descubra em que dia o salário acaba</p>
     <p style="font-size:26px;color:var(--grafite);margin-top:14px;line-height:1.4">Responda em 3 minutos e veja para onde vai o dinheiro, os vazamentos que mais pesam e por onde começar.</p>
   </div>`,
));

peca("kit/criativos/06-enquete.png", 1080, 1350, criativo(
  `Quando o dinheiro <span class="grifo">costuma acabar?</span>`,
  `<div>
     <div class="opcao"><i></i>Na primeira semana</div>
     <div class="opcao"><i></i>Lá pela metade do mês</div>
     <div class="opcao"><i></i>Na última semana</div>
     <div class="opcao"><i></i>Chega ao dia 30</div>
   </div>
   <p class="nota">Em 3 minutos, o quiz gratuito mostra em que dia ele acaba e por quê.</p>`,
));

peca("kit/criativos/07-quatro-potes.png", 1080, 1350, criativo(
  `Um salário, <span class="grifo">quatro potes.</span>`,
  `<div class="potes">${POTES.map(([id, nome, valor, nota]) => `<div class="pote ${id}"><b>${nome}</b><span>${valor}</span><small>${nota}</small></div>`).join("")}</div>
   <p class="nota">O plano divide o salário no dia em que ele entra, com os números de cada caso.</p>
   <p class="minusculo">Exemplo ilustrativo de um salário de ${EX.renda}.</p>`,
));

peca("kit/criativos/08-valor-da-semana.png", 1080, 1350, criativo(
  `O número que faz o dinheiro <span class="grifo">durar o mês</span>`,
  `<div class="cartao inclinado" style="background:var(--verde-fundo);border:4px solid var(--verde)">
     <p style="font-size:28px;color:var(--grafite)">Dinheiro do dia a dia</p>
     <p style="font-family:Bricolage;font-weight:800;font-size:170px;line-height:1;letter-spacing:-.04em;color:var(--verde-forte);margin-top:6px">${SEMANA}</p>
     <p class="caneta" style="font-size:64px">por semana</p>
     <p style="font-size:26px;color:var(--grafite);margin-top:16px">Mercado, delivery, compras, lazer e o resto. Acabou, acabou até segunda.</p>
   </div>
   <p class="nota">O plano calcula esse valor com os números de cada caso.</p>
   <p class="minusculo">Exemplo ilustrativo.</p>`,
));

peca("kit/criativos/09-tipos-de-mes.png", 1080, 1350, criativo(
  `Todo mês tem <span class="grifo">um tipo.</span>`,
  `<div>
     <span class="chip amarelo">Dinheiro que some</span><span class="chip">Salário com dono</span>
     <span class="chip verde">Fim de mês no cartão</span><span class="chip">Vazamento miúdo</span>
     <span class="chip">Sem colchão</span><span class="chip">Renda montanha-russa</span>
     <span class="chip">No azul, sem rumo</span>
   </div>
   <p class="nota">O quiz gratuito dá nome a cada caso, mostra em que dia o dinheiro acaba e por onde começar.</p>`,
));

peca("kit/criativos/10-a-conta.png", 1080, 1350, criativo(
  `A conta que <span class="grifo">quase ninguém</span> faz`,
  `<div class="cartao">
     <div class="linha"><span>Salário do mês</span><span class="pontos"></span><span class="num" style="color:#9aa8a0">R$ ____</span></div>
     <div class="linha"><span>− Contas fixas e parcelas</span><span class="pontos"></span><span class="num" style="color:#9aa8a0">R$ ____</span></div>
     <div class="linha"><span>÷ O que sai por dia</span><span class="pontos"></span><span class="num" style="color:#9aa8a0">R$ ____</span></div>
     <div class="linha" style="border-top:3px solid var(--tinta);margin-top:8px"><b style="font-size:34px">= Em que dia acaba</b><span class="pontos" style="border:0"></span><span class="caneta" style="font-size:64px">?</span></div>
   </div>
   <p class="nota">O quiz faz essa conta em 3 minutos, de graça, e mostra para onde vai o resto.</p>`,
));

/* Kiwify: imagem do produto e banners do checkout */

const cartaoPlano = (escala = 1) => `<div class="cartao inclinado" style="padding:${44 * escala}px;width:100%">
  <p class="sobre" style="font-size:${21 * escala}px;margin-bottom:${10 * escala}px;color:var(--grafite)">Plano do mês · exemplo</p>
  <p style="font-family:Bricolage;font-weight:800;font-size:${50 * escala}px;letter-spacing:-.025em;line-height:1.05">Seu salário em quatro potes</p>
  <div style="margin-top:${18 * escala}px">${POTES.map(([id, nome, valor]) => `<div class="linha" style="font-size:${30 * escala}px;padding:${14 * escala}px 0"><span style="display:inline-block;width:${16 * escala}px;height:${16 * escala}px;border-radius:4px;background:${{ contas: "#10221a", parcelas: "#56645c", "dia-a-dia": "#0e7a4e", futuro: "#0a5c3a" }[id]}"></span><span>${nome}</span><span class="pontos"></span><span class="num">${valor}</span></div>`).join("")}</div>
  <p style="margin-top:${18 * escala}px;font-size:${30 * escala}px"><span class="grifo" style="font-weight:800">${SEMANA} por semana</span> <span class="caneta" style="font-size:${40 * escala}px">para o dia a dia</span></p>
</div>`;

peca("kit/kiwify/produto-1000x1000.png", 1000, 1000, `<div class="quadro" style="padding:64px 72px 60px">
  ${marca(58)}
  <div class="miolo" style="padding:26px 30px 30px">${cartaoPlano(0.86)}
    <div style="margin-top:24px;display:flex;flex-wrap:wrap;gap:10px">${["Calendário do mês", "Regras do mês", "Desafio de 30 dias", "Mensagens prontas", "Guia Mês Inteiro"]
      .map((c) => `<span style="font-size:20px;font-weight:600;background:#fff;border:2px solid var(--linha);border-radius:999px;padding:8px 18px">${c}</span>`).join("")}</div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end">
    <div><p class="titulo" style="font-size:66px">Plano do Mês Inteiro</p><p style="font-size:26px;color:var(--grafite);margin-top:12px">Feito com as respostas do seu quiz</p></div>
    <div class="selo"><span style="font-size:42px">7 dias</span><br><span style="font-size:24px">de garantia</span></div>
  </div>
</div>`);

const vantagens = (tamanho) => `<div style="display:flex;gap:${tamanho}px;flex-wrap:wrap">${["Pronto em 1 minuto", "Pagamento único", "7 dias de garantia"]
  .map((v) => `<span style="display:inline-flex;align-items:center;gap:10px;font-size:${tamanho}px;font-weight:700"><svg width="${tamanho + 6}" height="${tamanho + 6}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#0e7a4e"/><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>${v}</span>`)
  .join("")}</div>`;

peca("kit/kiwify/banner-checkout-pc-1200x400.png", 1200, 400, `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 64px">
  <div style="max-width:640px">${marca(40)}<p class="titulo" style="font-size:54px;margin-top:22px;line-height:1.05">Seu plano do mês, feito com as suas respostas</p><div style="margin-top:26px">${vantagens(22)}</div></div>
  <div style="width:400px">${cartaoPlano(0.62)}</div>
</div>`);

peca("kit/kiwify/banner-checkout-celular-1080x540.png", 1080, 540, `<div style="position:absolute;inset:0;padding:56px 60px;display:flex;flex-direction:column;justify-content:center">
  ${marca(44)}
  <p class="titulo" style="font-size:66px;margin-top:24px;line-height:1.02">Seu plano do mês, feito com <span class="grifo">as suas respostas</span></p>
  <div style="margin-top:30px">${vantagens(26)}</div>
</div>`);

/* Prévia do link e ícone */

peca("app/opengraph-image.png", 1200, 630, `<div style="position:absolute;inset:0;display:flex;align-items:center;gap:56px;padding:0 64px">
  <div style="flex:1">${marca(44)}<p class="titulo" style="font-size:78px;margin-top:30px">Em que dia o salário <span class="grifo">acaba?</span></p>
  <p class="sub" style="font-size:30px;margin-top:22px">Quiz gratuito de 3 minutos</p></div>
  <div style="width:470px"><div class="cartao inclinado" style="padding:30px">${calendario(20, { tamanho: 15 })}<p class="caneta vermelho" style="font-size:36px;margin-top:18px">dia 20: o dinheiro acabou</p></div></div>
</div>`);

peca("app/apple-icon.png", 180, 180, `<div style="position:absolute;inset:0;background:#0e7a4e;display:grid;place-items:center">
  <svg width="128" height="128" viewBox="10 10 44 46"><rect x="10" y="12" width="44" height="42" rx="6" fill="#fff"/><rect x="10" y="12" width="44" height="10" rx="6" fill="#10221a"/><rect x="10" y="17" width="44" height="5" fill="#10221a"/>
  <g fill="#9fd0b4"><rect x="15" y="26" width="9" height="9" rx="2"/><rect x="27.5" y="26" width="9" height="9" rx="2"/><rect x="40" y="26" width="9" height="9" rx="2"/><rect x="15" y="39" width="9" height="9" rx="2"/><rect x="27.5" y="39" width="9" height="9" rx="2"/></g>
  <rect x="40" y="39" width="9" height="9" rx="2" fill="#0e7a4e"/></svg>
</div>`);

/* ---------- Gerar ---------- */

(async () => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  for (const pasta of ["kit/criativos", "kit/kiwify", "app"]) mkdirSync(join(RAIZ, pasta), { recursive: true });

  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ deviceScaleFactor: 1 });
  for (const p of pecas) {
    const html = join(TMP, `${p.arquivo.replace(/[/.]/g, "_")}.html`);
    writeFileSync(html, `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${p.corpo}</body></html>`);
    await pagina.setViewportSize({ width: p.largura, height: p.altura });
    await pagina.goto(pathToFileURL(html).href);
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.screenshot({ path: join(RAIZ, p.arquivo) });
    console.log(`✓ ${p.arquivo} (${p.largura}x${p.altura})`);
  }

  // Folha com os 10 criativos lado a lado, para revisar de uma vez.
  const criativos = pecas.filter((p) => p.arquivo.startsWith("kit/criativos/"));
  const folha = join(TMP, "todos.html");
  writeFileSync(folha, `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;display:grid;grid-template-columns:repeat(5,360px);background:#fff}img{width:360px;height:450px;display:block}</style></head><body>${criativos
    .map((p) => `<img src="${pathToFileURL(join(RAIZ, p.arquivo)).href}">`)
    .join("")}</body></html>`);
  await pagina.setViewportSize({ width: 1800, height: 900 });
  await pagina.goto(pathToFileURL(folha).href);
  await pagina.waitForLoadState("load");
  await pagina.screenshot({ path: join(RAIZ, "kit/criativos/00-todos.png") });
  console.log("✓ kit/criativos/00-todos.png (1800x900)");

  await navegador.close();
  rmSync(TMP, { recursive: true, force: true });
})().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
