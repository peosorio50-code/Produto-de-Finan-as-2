#!/usr/bin/env node
/**
 * Vídeos 9:16 (1080x1920) do Mês Inteiro, para Reels e Stories:
 *
 *   npm run build        (o v3 mostra o plano de exemplo de verdade, tirado do site em out/)
 *   npm run kit:videos
 *
 * Cada vídeo é uma página HTML cujo quadro é uma função do tempo: o script
 * fotografa um quadro por vez a 24 fps com o Playwright e monta o MP4 com o
 * ffmpeg. Sem áudio: escolha a música na biblioteca do Meta.
 *
 * - v1-calendario        (conjunto A, curiosidade): os dias do mês passam até o dinheiro acabar
 * - v2-delivery-no-ano   (conjunto A, curiosidade): R$ 420 por mês somando até R$ 5.040 no ano
 * - v3-plano-por-dentro  (conjunto B, produto): o plano de exemplo rolando no celular, e o preço
 *
 * Os números são de casos fictícios calculados pelo mesmo motor do site, e os vídeos dizem "exemplo".
 */
const { execFileSync } = require("node:child_process");
const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { extname, join } = require("node:path");
const { pathToFileURL } = require("node:url");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Este script precisa do Playwright: npm install --no-save playwright && npx playwright install chromium");
  process.exit(1);
}

const { RAIZ, CSS, marca, EX, POTES, SEMANA } = require("./kit-base.cjs");

const FPS = 24;
const TMP = join(RAIZ, "kit", ".tmp-videos");
const SAIDA = join(RAIZ, "kit", "criativos");

/* ---------- Estilo e funções comuns dos vídeos ---------- */

const CSS_VIDEO = `${CSS}
.v { position: absolute; inset: 0; padding: 230px 84px 330px; display: flex; flex-direction: column; justify-content: center; }
.v .titulo { font-size: 116px; }
.camada { position: absolute; left: 84px; right: 84px; }
.final { position: absolute; left: 84px; right: 84px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; opacity: 0; }
.final .titulo { font-size: 96px; }
.final .cta { display: inline-block; font-size: 44px; padding: 30px 48px; margin-top: 54px; align-self: flex-start; }
.final .dominio { font-size: 30px; margin-top: 18px; }
.final .letras { font-size: 40px; color: var(--grafite); line-height: 1.35; margin-top: 34px; }
.etiqueta { font-size: 26px; color: var(--grafite); }
.saldo { font-family: "Bricolage"; font-weight: 800; font-size: 64px; letter-spacing: -.03em; }
`;

const JS_COMUM = `
const cl = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => cl((t - a) / (b - a));
const ease = (x) => 1 - Math.pow(1 - x, 3);
const $ = (s) => document.querySelector(s);
const brl = (v) => "R$ " + Math.round(v).toLocaleString("pt-BR");
function mostrar(el, p, dy = 50) { el.style.opacity = p; el.style.transform = "translateY(" + ((1 - p) * dy) + "px)"; }
`;

const fimDoVideo = (titulo, texto) => `<div class="final" id="fim">
  <p class="titulo">${titulo}</p>
  <p class="letras">${texto}</p>
  <span class="cta">Faça o quiz grátis →</span>
  <div style="margin-top:70px">${marca(64)}<p class="dominio">mesinteiro.folegofinanceiro.shop</p></div>
</div>`;

/* ---------- v1: o calendário do mês ---------- */

const diasV1 = Array.from({ length: 30 }, (_, i) => `<div class="dia" id="d${i + 1}" style="font-size:38px;background:#fff;border:3px solid var(--linha)">${i + 1}</div>`).join("");

const v1 = {
  id: "v1-calendario",
  dur: 12,
  corpo: `<div class="v">
    <h1 class="titulo" id="t1">Em que dia o salário <span class="grifo">acaba?</span></h1>
    <div class="cartao inclinado" id="cal" style="margin-top:70px;padding:46px">
      <div class="cab" style="font-size:34px"><b>Salário de ${EX.renda}</b><span style="font-size:26px">exemplo</span></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:26px">
        <span class="etiqueta" style="font-size:30px">Ainda sobra</span><span class="saldo" id="saldo">${EX.renda}</span>
      </div>
      <div class="grade" style="gap:12px">${diasV1}</div>
      <p class="caneta vermelho" id="n1" style="font-size:70px;margin-top:34px;opacity:0">dia ${EX.dia}: o dinheiro acabou</p>
      <p class="caneta vermelho" id="n2" style="font-size:60px;opacity:0">${30 - EX.dia} dias no cartão, todo mês</p>
    </div>
    ${fimDoVideo(`O quiz gratuito mostra <span class="grifo">em que dia ele acaba</span>`, "E para onde vai cada real, os vazamentos que mais pesam e por onde começar. 3 minutos, sem CPF.")}
  </div>`,
  // Contas fixas e parcelas saem nos primeiros dias; o resto vai saindo por dia até o dia 20.
  f: `function quadro(t) {
    mostrar($("#t1"), ease(seg(t, 0, 0.8)));
    const cal = $("#cal");
    const saida = 1 - ease(seg(t, 8.6, 9.3));
    cal.style.opacity = Math.min(ease(seg(t, 0.5, 1.3)), saida);
    $("#t1").style.opacity = Math.min(ease(seg(t, 0, 0.8)), saida);
    const dia = Math.floor((t - 1.4) / 0.2) + 1; // um dia a cada 0,2 s
    for (let d = 1; d <= 30; d++) {
      const el = $("#d" + d);
      el.className = "dia";
      el.style.background = "#fff"; el.style.borderColor = "var(--linha)"; el.style.color = "var(--tinta)";
      if (d <= Math.min(dia, ${EX.dia})) { el.className = "dia ok"; el.style.background = ""; el.style.borderColor = "transparent"; el.style.color = ""; }
      if (d === ${EX.dia} && t > 5.4) el.className = "dia ok fim";
      const vermelho = 5.9 + (d - ${EX.dia + 1}) * 0.08;
      if (d > ${EX.dia} && t > vermelho) { el.className = "dia nao"; el.style.background = ""; el.style.borderColor = "transparent"; el.style.color = ""; }
    }
    const ate = cl((t - 1.4) / (${EX.dia} * 0.2));
    const fixas = 1920; // contas fixas + parcelas (exemplo), nos 5 primeiros dias
    const pFix = cl(ate * ${EX.dia} / 5);
    const resto = 3200 - fixas;
    const sobra = 3200 - fixas * pFix - resto * cl((ate * ${EX.dia} - 5) / (${EX.dia} - 5));
    $("#saldo").textContent = brl(Math.max(0, sobra));
    $("#saldo").style.color = sobra <= 1 ? "var(--vermelho)" : "var(--tinta)";
    mostrar($("#n1"), ease(seg(t, 5.5, 6.1)), 20);
    mostrar($("#n2"), ease(seg(t, 7.0, 7.6)), 20);
    mostrar($("#fim"), ease(seg(t, 9.3, 10.1)));
  }`,
};

/* ---------- v2: delivery no ano ---------- */

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const v2 = {
  id: "v2-delivery-no-ano",
  dur: 11,
  corpo: `<div class="v">
    <h1 class="titulo" id="t1" style="font-size:104px">${EX.delivery} por mês em delivery <span class="grifo">parece pouco.</span></h1>
    <div class="cartao inclinado" id="cx" style="margin-top:70px;padding:46px">
      <div class="cab" style="font-size:34px"><b>Delivery e lanches</b><span style="font-size:26px">exemplo</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        ${MESES.map((m, i) => `<div id="m${i}" style="border-radius:16px;padding:18px 0;text-align:center;background:#fff;border:3px solid var(--linha)">
          <p style="font-size:26px;color:var(--grafite)">${m}</p><p style="font-family:Bricolage;font-weight:800;font-size:36px">${EX.delivery}</p></div>`).join("")}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-top:3px solid var(--tinta);margin-top:32px;padding-top:26px">
        <span style="font-size:34px">No ano</span><span class="saldo" id="total" style="font-size:96px;color:var(--vermelho)">R$ 0</span>
      </div>
    </div>
    <p class="caneta vermelho" id="n1" style="font-size:68px;margin-top:34px;opacity:0">mais que um salário inteiro de ${EX.renda.replace(" ", "&nbsp;")}</p>
    ${fimDoVideo(`O quiz mostra os gastos que <span class="grifo">mais pesam</span>`, "Com o custo de cada um no ano e por onde começar. Grátis, em 3 minutos.")}
  </div>`,
  f: `function quadro(t) {
    const saida = 1 - ease(seg(t, 7.8, 8.4));
    $("#t1").style.opacity = Math.min(ease(seg(t, 0, 0.8)), saida);
    $("#t1").style.transform = "translateY(" + ((1 - ease(seg(t, 0, 0.8))) * 50) + "px)";
    $("#cx").style.opacity = Math.min(ease(seg(t, 0.6, 1.3)), saida);
    const n = Math.floor((t - 1.5) / 0.38) + 1; // um mês a cada 0,38 s
    for (let i = 0; i < 12; i++) {
      const el = $("#m" + i), on = i < n;
      el.style.background = on ? "var(--vermelho-fundo)" : "#fff";
      el.style.borderColor = on ? "var(--vermelho)" : "var(--linha)";
      el.style.transform = on && i === n - 1 && t < 6.2 ? "scale(1.06)" : "none";
    }
    $("#total").textContent = brl(${parseInt(EX.delivery.replace(/\D/g, ""), 10)} * Math.max(0, Math.min(12, n)));
    const p = ease(seg(t, 6.3, 6.9));
    $("#n1").style.opacity = Math.min(p, saida); $("#n1").style.transform = "translateY(" + ((1 - p) * 20) + "px)";
    mostrar($("#fim"), ease(seg(t, 8.4, 9.2)));
  }`,
};

/* ---------- v3: o plano por dentro (precisa do site em out/) ---------- */

function v3(alturaImagem, alvos) {
  // Alvos: posição (px na imagem) de cada seção do plano, para a rolagem parar nelas.
  const LARG = 600; // largura da tela do celular no vídeo
  const escala = LARG / 780; // a foto do plano tem 780 px de largura (390 x 2)
  const paradas = alvos.map((a) => Math.max(0, a.y * escala - 40));
  const legendas = alvos.map((a) => a.legenda);
  return {
    id: "v3-plano-por-dentro",
    dur: 15,
    corpo: `<div class="v" style="padding-top:200px;justify-content:flex-start">
      <h1 class="titulo" id="t1" style="font-size:100px">O plano do mês, <span class="grifo">por dentro</span></h1>
      <div id="tel" style="margin:56px auto 0;width:${LARG + 40}px;height:880px;background:#10221a;border-radius:70px;padding:20px;box-shadow:0 50px 90px -40px rgba(16,34,26,.6)">
        <div style="width:${LARG}px;height:840px;border-radius:52px;overflow:hidden;background:#fff;position:relative">
          <img id="img" src="plano.png" style="position:absolute;left:0;top:0;width:${LARG}px;height:${Math.round(alturaImagem * escala)}px">
        </div>
      </div>
      <div class="camada" style="top:1385px;text-align:center"><span class="chip amarelo" id="leg" style="font-size:44px;opacity:0;box-shadow:0 14px 30px -14px rgba(16,34,26,.5)"></span></div>
      <p class="camada etiqueta" id="ex" style="top:1500px;text-align:center;font-size:26px">Plano de exemplo, de um caso fictício</p>
      <div class="final" id="fim">
        <p class="sobre" style="font-size:34px">Plano do Mês Inteiro</p>
        <p class="titulo">Pronto em cerca de <span class="grifo">1 minuto</span></p>
        <div class="cartao" style="margin-top:56px;padding:44px 48px">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <span style="font-size:34px;color:var(--grafite)">Pagamento único</span>
            <span style="font-family:Bricolage;font-weight:800;font-size:120px;letter-spacing:-.04em;line-height:1;color:var(--verde-forte)">R$ 29,90</span>
          </div>
          <p style="font-size:32px;color:var(--grafite);margin-top:20px">7 dias de garantia · feito com as respostas do quiz</p>
        </div>
        <span class="cta">Comece pelo quiz grátis →</span>
        <div style="margin-top:60px">${marca(60)}<p class="dominio">mesinteiro.folegofinanceiro.shop</p></div>
      </div>
    </div>`,
    f: `const PARADAS = ${JSON.stringify(paradas)}, LEGENDAS = ${JSON.stringify(legendas)};
    function quadro(t) {
      const saida = 1 - ease(seg(t, 10.6, 11.2));
      $("#t1").style.opacity = Math.min(ease(seg(t, 0, 0.8)), saida);
      $("#tel").style.opacity = Math.min(ease(seg(t, 0.4, 1.1)), saida);
      $("#ex").style.opacity = Math.min(ease(seg(t, 0.4, 1.1)), saida);
      // Cada seção: 0,7 s rolando até ela e 1,4 s parada, com a legenda.
      const ini = 1.4, passo = 2.1;
      let y = 0, leg = "", op = 0;
      for (let i = 0; i < PARADAS.length; i++) {
        const a = ini + i * passo, de = i ? PARADAS[i - 1] : 0;
        if (t >= a) { y = de + (PARADAS[i] - de) * ease(seg(t, a, a + 0.7)); leg = LEGENDAS[i]; op = ease(seg(t, a + 0.5, a + 0.8)) * (1 - ease(seg(t, a + passo - 0.25, a + passo))); }
      }
      if (t >= ini + PARADAS.length * passo) op = 0;
      $("#img").style.transform = "translateY(" + (-y) + "px)";
      const l = $("#leg"); l.textContent = leg; l.style.opacity = Math.min(op, saida);
      mostrar($("#fim"), ease(seg(t, 11.2, 12)));
    }`,
  };
}

/* ---------- Foto do plano de exemplo (o site de verdade, com a API simulada) ---------- */

const TIPOS = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".json": "application/json" };

async function fotografarPlano(navegador) {
  const OUT = join(RAIZ, "out");
  if (!existsSync(join(OUT, "plano.html"))) return null;
  const exemplo = JSON.parse(readFileSync(join(RAIZ, "servidor", "mesinteiro_exemplo.json"), "utf8"));
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route("http://site.local/**", (rota) => {
    // Como o Cloudflare Pages: /plano → plano.html (a pasta out/plano/ também existe).
    const caminho = decodeURIComponent(new URL(rota.request().url()).pathname).replace(/\/$/, "") || "/index";
    const comHtml = join(OUT, caminho + ".html");
    const arquivo = existsSync(comHtml) ? comHtml : join(OUT, caminho);
    rota.fulfill({ status: 200, contentType: TIPOS[extname(arquivo)] || "application/octet-stream", body: readFileSync(arquivo) });
  });
  await ctx.route("**/api/mesinteiro/plano", (rota) => rota.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ respostas: exemplo.respostas, ia: exemplo.ia, geradoEm: "2026-11-02T10:00:00-03:00", podeRegenerar: false, acompanhamento: false }) }));
  await ctx.route("**/api/evento", (rota) => rota.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  const pagina = await ctx.newPage();
  await pagina.goto("http://site.local/plano?ref=mi-000000000000-0000000000000000");
  await pagina.getByRole("heading", { name: /Plano do mês de/ }).waitFor({ timeout: 20000 });
  await pagina.evaluate(() => document.fonts.ready);
  const secoes = [["Seu novo mês", "O salário em quatro potes"], ["Onde ajustar", "Onde ajustar, grupo por grupo"],
                  ["O calendário do seu mês", "O calendário do mês"], ["O desafio de 30 dias", "Um desafio de 30 dias"]];
  const alvos = [];
  for (const [titulo, legenda] of secoes) {
    const y = await pagina.getByRole("heading", { name: titulo, exact: true }).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    alvos.push({ y: y * 2, legenda });
  }
  const caminho = join(TMP, "plano.png");
  await pagina.screenshot({ path: caminho, fullPage: true });
  const altura = await pagina.evaluate(() => document.documentElement.scrollHeight * 2);
  await ctx.close();
  return { caminho, altura, alvos };
}

/* ---------- Gerar ---------- */

(async () => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(SAIDA, { recursive: true });
  const navegador = await chromium.launch();
  const videos = [v1, v2];
  const plano = await fotografarPlano(navegador);
  if (plano) videos.push(v3(plano.altura, plano.alvos));
  else console.log("· v3-plano-por-dentro pulado: rode npm run build antes (o vídeo usa o site em out/)");

  const pagina = await navegador.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  for (const v of videos) {
    const pasta = join(TMP, v.id);
    mkdirSync(pasta, { recursive: true });
    const html = join(TMP, `${v.id}.html`);
    writeFileSync(html, `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${CSS_VIDEO}</style></head><body>${v.corpo}<script>${JS_COMUM}${v.f}</script></body></html>`);
    await pagina.goto(pathToFileURL(html).href);
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.waitForLoadState("load");
    const total = v.dur * FPS;
    for (let n = 0; n < total; n++) {
      await pagina.evaluate((t) => window.quadro(t), n / FPS);
      await pagina.screenshot({ path: join(pasta, `${String(n).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
    }
    const mp4 = join(SAIDA, `${v.id}.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(pasta, "%04d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p",
      "-crf", "20", "-preset", "medium", "-movflags", "+faststart", "-an", mp4]);
    // Três quadros de conferência (começo, meio e fim), para revisar sem abrir o vídeo.
    for (const [nome, s] of [["a", 1.2], ["b", v.dur * 0.5], ["c", v.dur - 0.5]]) {
      execFileSync("cp", [join(pasta, `${String(Math.floor(s * FPS)).padStart(4, "0")}.jpg`), join(TMP, `${v.id}-${nome}.jpg`)]);
    }
    console.log(`✓ kit/criativos/${v.id}.mp4 (1080x1920, ${v.dur} s, ${FPS} fps, sem áudio)`);
  }
  await navegador.close();
  if (!process.argv.includes("--manter")) rmSync(TMP, { recursive: true, force: true });
})().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
