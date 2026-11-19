#!/usr/bin/env node
/**
 * Administração do Mês Inteiro na VPS. Rode como root:
 *
 *   mesinteiro-admin status              números do funil e das vendas
 *   mesinteiro-admin leads [dias]        leads em CSV (padrão: 30 dias) — não deixe o arquivo largado
 *   mesinteiro-admin buscar EMAIL        pedidos, compras e link do plano de uma pessoa
 *   mesinteiro-admin liberar REF         libera um pedido à mão (quando o webhook falhou e você conferiu o pagamento na Kiwify)
 *   mesinteiro-admin backup          copia o banco para /opt/mesinteiro/backups (guarda 14)
 *
 * Não precisa do programa sqlite3: usa o SQLite que vem dentro do Node.
 */
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const CAMINHO = process.env.MESINTEIRO_DB || "/opt/mesinteiro/dados/mesinteiro.db";
const SITE = (process.env.SITE_URL || "").replace(/\/$/, "");
const db = new DatabaseSync(CAMINHO);
db.exec("PRAGMA busy_timeout = 5000;");

const [comando, arg] = process.argv.slice(2);
const json = (t) => {
  try {
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
};
const desde = (dias) => new Date(Date.now() - dias * 86400000).toISOString();
const linkPlano = (ref) => (SITE ? `${SITE}/plano?ref=${ref}` : `/plano?ref=${ref}`);
const tabela = (linhas) => (linhas.length ? console.table(linhas) : console.log("  (nada)"));

function status() {
  const um = (sql, ...p) => Object.values(db.prepare(sql).get(...p))[0];
  console.log(`\nBanco: ${CAMINHO}\n`);
  console.log("Leads");
  tabela([
    {
      total: um("SELECT COUNT(*) FROM leads"),
      "últimas 24 h": um("SELECT COUNT(*) FROM leads WHERE criado_em >= ?", desde(1)),
      "últimos 7 dias": um("SELECT COUNT(*) FROM leads WHERE criado_em >= ?", desde(7)),
    },
  ]);
  console.log("\nFunil dos últimos 7 dias (pessoas diferentes por etapa)");
  tabela(
    db
      .prepare(
        `SELECT evento, COUNT(DISTINCT email) AS pessoas, COUNT(*) AS eventos FROM eventos
         WHERE em >= ? GROUP BY evento ORDER BY MIN(id)`,
      )
      .all(desde(7)),
  );
  console.log("\nCompras da Kiwify");
  tabela(
    db
      .prepare(
        `SELECT status, COUNT(*) AS compras, SUM(ref IS NULL) AS sem_pedido_do_quiz,
                ROUND(SUM(COALESCE(valor_centavos, 0)) / 100.0, 2) AS valor_reais
         FROM compras GROUP BY status`,
      )
      .all(),
  );
  console.log("\nPlanos entregues");
  tabela(
    db
      .prepare(
        `SELECT COALESCE(plano_origem, 'ainda não abriu') AS versao, COUNT(*) AS pedidos FROM pedidos p
         WHERE EXISTS (SELECT 1 FROM compras c WHERE c.ref = p.ref AND c.status = 'pago') GROUP BY 1`,
      )
      .all(),
  );
  const padrao24h = um("SELECT COUNT(*) FROM pedidos WHERE plano_origem = 'padrao' AND gerado_em >= ?", desde(1));
  if (padrao24h > 0) {
    console.log(
      `\n⚠️  ${padrao24h} plano(s) saíram sem o texto da IA nas últimas 24 h. Veja o motivo com:\n` +
        "   journalctl -u mesinteiro --since '-24h' | grep '\\[ia\\]'\n" +
        "   (se for crédito da Anthropic: recarregue em platform.claude.com > Billing)",
    );
  }
  console.log("");
}

function leads(dias = 30) {
  const linhas = db
    .prepare(
      `SELECT l.*, EXISTS (SELECT 1 FROM compras c WHERE c.email = l.email AND c.status = 'pago')
              OR EXISTS (SELECT 1 FROM pedidos p JOIN compras c ON c.ref = p.ref
                         WHERE p.email = l.email AND c.status = 'pago') AS comprou
       FROM leads l WHERE l.atualizado_em >= ? ORDER BY l.criado_em`,
    )
    .all(desde(Number(dias) || 30));
  const campos = [
    "email",
    "nome",
    "whatsapp",
    "primeira_vez",
    "ultima_vez",
    "ultimo_evento",
    "comprou",
    "situacao",
    "nivel",
    "renda",
    "sobra_mes",
    "dia_que_acaba",
    "gasto_invisivel",
    "objetivo",
    "utm_source",
    "utm_campaign",
    "utm_content",
  ];
  const csv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  console.log(campos.join(","));
  for (const l of linhas) {
    const r = json(l.resultado) ?? {};
    const o = json(l.origem) ?? {};
    console.log(
      [
        l.email,
        l.nome,
        l.telefone ? `55${l.telefone}` : "",
        l.criado_em,
        l.atualizado_em,
        l.ultimo_evento,
        l.comprou ? "sim" : "nao",
        r.perfil,
        r.nivel,
        r.rendaMensal,
        r.sobraMes,
        r.diaQueAcaba ?? (r.perfil ? "dura o mês" : ""),
        r.gastoInvisivel,
        r.objetivo,
        o.utm_source,
        o.utm_campaign,
        o.utm_content,
      ]
        .map(csv)
        .join(","),
    );
  }
}

function buscar(email) {
  if (!email) return console.error("Uso: mesinteiro-admin buscar EMAIL");
  const e = email.trim().toLowerCase();
  console.log("\nLead");
  tabela(db.prepare("SELECT email, nome, telefone, ultimo_evento, criado_em, atualizado_em FROM leads WHERE email = ?").all(e));
  console.log("\nPedidos (cliques em comprar)");
  tabela(
    db
      .prepare(
        `SELECT p.ref, p.criado_em, COALESCE(p.plano_origem, '-') AS plano, p.geracoes,
                (SELECT status FROM compras c WHERE c.ref = p.ref ORDER BY atualizado_em DESC LIMIT 1) AS compra
         FROM pedidos p WHERE p.email = ? ORDER BY p.criado_em DESC`,
      )
      .all(e)
      .map((p) => ({ ...p, link: p.compra === "pago" ? linkPlano(p.ref) : "-" })),
  );
  console.log("\nCompras na Kiwify");
  tabela(db.prepare("SELECT order_id, status, metodo, ref, criado_em FROM compras WHERE email = ? ORDER BY criado_em DESC").all(e));
  console.log("\n(Não copie estes dados para documentos ou conversas.)\n");
}

function liberar(ref) {
  const pedido = ref && db.prepare("SELECT ref, email FROM pedidos WHERE ref = ?").get(ref);
  if (!pedido) return console.error("Pedido não encontrado. Use mesinteiro-admin buscar EMAIL para ver a referência (mi-...).");
  const agora = new Date().toISOString();
  db.prepare(
    `INSERT INTO compras (order_id, ref, email, nome, status, metodo, produto, criado_em, atualizado_em)
     VALUES (?, ?, ?, '', 'pago', 'manual', 'liberado à mão', ?, ?)`,
  ).run(`manual-${Date.now()}`, ref, pedido.email ?? "", agora, agora);
  console.log(`Liberado. Mande para a pessoa: ${linkPlano(ref)}`);
}

function backup() {
  const pasta = "/opt/mesinteiro/backups";
  mkdirSync(pasta, { recursive: true });
  const destino = join(pasta, `mesinteiro-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.db`);
  db.exec(`VACUUM INTO '${destino}'`);
  const antigos = readdirSync(pasta).filter((f) => /^mesinteiro-.*\.db$/.test(f)).sort().slice(0, -14);
  for (const f of antigos) rmSync(join(pasta, f));
  console.log(`Backup: ${destino}`);
}

const comandos = { status, leads: () => leads(arg), buscar: () => buscar(arg), liberar: () => liberar(arg), backup };
(comandos[comando] ?? (() => console.log("Comandos: status | leads [dias] | buscar EMAIL | liberar REF | backup")))();
