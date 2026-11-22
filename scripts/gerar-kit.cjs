#!/usr/bin/env node
/**
 * Gera o kit de lançamento do Mês Inteiro a partir de HTML, com as fontes e
 * as cores do site:
 *
 *   npm run kit
 *
 * - kit/kiwify/   imagem do produto e do bump (1000x1000) e banners do checkout
 * - kit/criativos/ 12 anúncios estáticos 4:5 (1080x1350) e uma folha com todos
 *   (os vídeos 9:16 saem de scripts/gerar-videos.cjs: npm run kit:videos)
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

const { RAIZ, TMP, CSS, RISCO, marca, rodape, calendario, criativo, EX, POTES, SEMANA } = require("./kit-base.cjs");

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

/* Conjunto B (produto) e cena de conversa */

peca("kit/criativos/11-produto-preco.png", 1080, 1350, `<div class="quadro">
  <p class="sobre">Plano do Mês Inteiro</p>
  <h1 class="titulo" style="font-size:84px">O salário dividido <span class="grifo">antes de ser gasto</span></h1>
  <div class="miolo" style="padding-top:28px">
    <div class="cartao inclinado" style="padding:40px 44px">
      ${["O salário em quatro potes, com os seus números", "Quanto dá para gastar por semana", "Onde ajustar, grupo por grupo", "O calendário do mês e lembretes no celular", "Regras, reserva e desafio de 30 dias"]
        .map((item) => `<div style="display:flex;gap:18px;align-items:flex-start;font-size:31px;line-height:1.3;padding:11px 0"><svg width="34" height="34" viewBox="0 0 24 24" style="flex:none;margin-top:3px"><circle cx="12" cy="12" r="12" fill="#0e7a4e"/><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${item}</span></div>`).join("")}
      <div style="display:flex;align-items:baseline;justify-content:space-between;border-top:3px solid var(--tinta);margin-top:22px;padding-top:24px">
        <span style="font-size:28px;color:var(--grafite)">Pagamento único</span>
        <span style="font-family:Bricolage;font-weight:800;font-size:92px;letter-spacing:-.04em;line-height:1;color:var(--verde-forte)">R$ 29,90</span>
      </div>
      <p class="caneta" style="text-align:right;margin-top:6px">pronto em cerca de 1 minuto</p>
    </div>
    <p class="nota">Começa pelo quiz gratuito: o plano sai com as respostas dele. 7 dias de garantia.</p>
  </div>
  ${rodape}
</div>`);

const bolha = (texto, minha, hora) => `<div style="display:flex;justify-content:${minha ? "flex-end" : "flex-start"};margin-top:18px">
  <div style="max-width:76%;background:${minha ? "#d9fdd3" : "#fff"};border-radius:${minha ? "26px 6px 26px 26px" : "6px 26px 26px 26px"};padding:20px 26px 14px;font-size:32px;line-height:1.32;box-shadow:0 2px 0 rgba(16,34,26,.12)">
    ${texto}<span style="display:block;text-align:right;font-size:18px;color:#7a8a80;margin-top:6px">${hora}</span></div></div>`;

peca("kit/criativos/12-conversa.png", 1080, 1350, `<div class="quadro">
  <h1 class="titulo" style="font-size:80px">A conversa <span class="grifo">do dia 20</span></h1>
  <div class="miolo" style="padding-top:24px">
    <div style="background:#efe7dd;border-radius:30px;padding:26px 30px 34px;box-shadow:0 34px 70px -34px rgba(16,34,26,.4)">
      <div style="display:flex;align-items:center;gap:18px;padding-bottom:14px;border-bottom:2px solid rgba(16,34,26,.1)">
        <div style="width:58px;height:58px;border-radius:50%;background:#9fd0b4;display:grid;place-items:center;font-family:Bricolage;font-weight:800;font-size:28px">M</div>
        <div><b style="font-size:30px">Mãe</b><p style="font-size:20px;color:#56645c">online</p></div>
      </div>
      ${bolha("Mãe, em que dia o dinheiro costuma acabar aí em casa?", true, "19:02")}
      ${bolha("Lá pelo dia 20, filha. Depois é no cartão 😅", false, "19:04")}
      ${bolha("Achei um quiz de 3 minutos que faz essa conta e mostra para onde vai cada real", true, "19:05")}
      ${bolha("Manda o link que eu faço agora", false, "19:05")}
    </div>
    <p class="minusculo" style="margin-top:18px">Cena ilustrativa.</p>
  </div>
  ${rodape}
</div>`);

/* Kiwify: imagem do order bump (acompanhamento de 4 semanas por e-mail) */

const emailSemana = (n, foco, i) => `<div style="width:calc(100% - 84px);background:#fff;border-radius:20px;padding:22px 26px;box-shadow:0 2px 0 var(--linha),0 22px 40px -28px rgba(16,34,26,.4);
  transform:translateX(${i * 26}px) rotate(${i % 2 ? 0.6 : -0.6}deg);margin-top:${i ? 16 : 0}px">
  <div style="display:flex;justify-content:space-between;font-size:19px;color:var(--grafite)"><span>Mês Inteiro</span><span>segunda, 8:00</span></div>
  <p style="font-weight:800;font-size:26px;margin-top:6px">Semana ${n} do seu mês: ${SEMANA} para o dia a dia</p>
  <p style="font-size:22px;color:var(--grafite);margin-top:4px">Foco da semana: ${foco}</p>
</div>`;

peca("kit/kiwify/bump-acompanhamento-1000x1000.png", 1000, 1000, `<div class="quadro" style="padding:62px 64px 56px">
  <p class="sobre" style="font-size:24px">Junto com o plano</p>
  <p class="titulo" style="font-size:64px">Acompanhamento de <span class="grifo">4 semanas</span></p>
  <div class="miolo" style="padding:30px 0 20px">
    ${[["1", "anotar tudo, sem julgar"], ["2", "o valor da semana no débito"], ["3", "cortar um vazamento"], ["4", "separar o futuro primeiro"]].map(([n, f], i) => emailSemana(n, f, i)).join("")}
  </div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end">
    <p style="font-size:26px;color:var(--grafite);line-height:1.35">Toda segunda, um e-mail com o valor<br>da semana e o foco do desafio.</p>
    ${marca(40)}
  </div>
</div>`);

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

  // Folha com os 12 criativos lado a lado, para revisar de uma vez.
  const criativos = pecas.filter((p) => p.arquivo.startsWith("kit/criativos/"));
  const folha = join(TMP, "todos.html");
  writeFileSync(folha, `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;display:grid;grid-template-columns:repeat(6,300px);background:#fff}img{width:300px;height:375px;display:block}</style></head><body>${criativos
    .map((p) => `<img src="${pathToFileURL(join(RAIZ, p.arquivo)).href}">`)
    .join("")}</body></html>`);
  await pagina.setViewportSize({ width: 1800, height: 750 });
  await pagina.goto(pathToFileURL(folha).href);
  await pagina.waitForLoadState("load");
  await pagina.screenshot({ path: join(RAIZ, "kit/criativos/00-todos.png") });
  console.log("✓ kit/criativos/00-todos.png (1800x750)");

  await navegador.close();
  rmSync(TMP, { recursive: true, force: true });
})().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
