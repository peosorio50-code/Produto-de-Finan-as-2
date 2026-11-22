# Guia do Mês Inteiro para o Claude (leia antes de mexer)

Você vai trabalhar no **Mês Inteiro** (`mesinteiro.folegofinanceiro.shop`), segundo produto do Fôlego Financeiro:
quiz do salário → resultado grátis → plano do mês personalizado por R$ 29,90 (Kiwify), com bump de
acompanhamento (R$ 12,90) e upsell do plano do Fôlego (R$ 19,90) na página de obrigado. Segue a skill
`produto-digital` (cópia em `.claude/skills/produto-digital`) e o mesmo formato do Fôlego v2: página
interativa, plano montado no navegador.

## 1. Arquitetura

| Parte | Onde fica | O que faz |
|---|---|---|
| Site | Next.js exportado como **estático** (`output: "export"` → `out/`), no **Cloudflare Pages**, projeto `mesinteiro`, domínio `mesinteiro.folegofinanceiro.shop` | Quiz, resultado, checkout, obrigado com upsell e o plano montado na tela. Todo o cálculo é no navegador. Configuração em `public/config.js`. |
| Servidor | **`servidor/mesinteiro.py`** dentro do servidor do Meu Santo Protetor: VPS, `/opt/mapadaalma`, serviço `mapadaalma`, porta 8010, público em `https://api.mapadaalma.online` | Pedidos, compras, leads, IA, e-mails, recuperação, lembretes e acompanhamento (SQLite `dados/mapa.db`, tabelas `mesinteiro_*`). |
| Kiwify | Mesmo webhook do Meu Santo e do Fôlego: `/webhook/kiwify/<segredo>` | O `servidor.py` (v21) vê "mes inteiro" no nome e chama `mesinteiro.evento_kiwify()` antes do Fôlego e do Meu Santo. |

Não é preciso servidor Node, Docker, porta nova nem túnel novo. Não crie isso de novo.

## 2. Fluxo

1. **Quiz** (`components/Quiz.tsx`): no início e no fim, `postar("/lead", {evento, contato, origem, respostas, resumo})`.
   Na conclusão, o servidor guarda o resultado (`mesinteiro_resultados`) e devolve um token: o link dos e-mails
   (`/resultado?r=TOKEN`) abre o resultado em qualquer aparelho.
2. **Resultado** (`components/Resultado.tsx`): números de `lib/diagnostico.ts`. Em "Liberar meu plano":
   `postar("/checkout", {respostas, contato, origem, resumo, dadosIA})` → `{ref, url}`, com
   `url = https://pay.kiwify.com.br/<MESINTEIRO_CHECKOUT>?sck=<ref>&name&email&utm_*`. Se o e-mail já tem compra paga
   sem pedido, `url` já é o link do plano. Sem resposta do servidor, o site usa o `CHECKOUT_RESERVA` do `config.js`.
3. **Kiwify → webhook → `evento_kiwify`**: uma linha por `order_id` em `mesinteiro_compras`, com os `skus`
   (`plano`, `acompanhamento`). Liga ao pedido pelo `sck`; senão, plano → pedido não pago mais recente do e-mail
   (7 dias); bump sozinho → pedido mais recente do e-mail (30 dias). Status com peso (pendente/recusado 1, pago 2,
   reembolsado 3). Na primeira aprovação do plano: e-mail com o link e a IA começa a escrever.
4. **`/plano`** (`components/TelaPlano.tsx`): `postar("/plano", {ref, regenerar})` → 402 `{urlPagamento}`, 404,
   202 (a IA está escrevendo: pergunta de novo a cada 5 s) ou 200 `{respostas, ia, geradoEm, podeRegenerar,
   acompanhamento}`. O navegador monta: `diagnosticar` + `calendarioDoMes` + `conciliar(ia, narrativaPadrao)`.
   Logo depois da compra, `OfertaObrigado.tsx` mostra o upsell (só com `UPSELL_ID` e sinal de dívida).
5. **`/reenviar`** (responde sempre igual), **`/vincular`** ("paguei com outro e-mail"), **`/sair`** (link assinado
   com HMAC do `WEBHOOK_SEGREDO`, só POST).

## 3. Onde mexer

| Quero mudar… | Arquivo |
|---|---|
| Pixel, contato, checkout de reserva, upsell | `public/config.js` (sem compilar) |
| Perguntas do quiz | `components/Quiz.tsx`, `lib/rotulos.ts`, `lib/tipos.ts`, `lib/validacao.ts` |
| Contas, potes, vazamentos | `lib/diagnostico.ts` (tem teste: `npm test`) |
| Texto padrão do plano (sem IA) e guia | `lib/narrativa-padrao.ts`, `lib/guia.ts` |
| O que vai para a IA / como o texto dela entra | `lib/ia-dados.ts` |
| Prompt, formato e conferência da IA | `servidor/mesinteiro.py`: `SISTEMA`, `ESQUEMA`, `conferir` |
| E-mails | `servidor/mesinteiro.py`: `email_plano`, `email_recuperacao_quiz`, `email_recuperacao_kiwify`, `email_falta_quiz`, `email_quiz_folego`, `email_acompanhamento` |
| Números que os e-mails usam | `lib/resumo.ts` (o servidor não refaz contas) |

Se mudar o formato do texto da IA, mude juntos: `ESQUEMA`/`SISTEMA`/`conferir` (servidor), `Narrativa` em
`lib/tipos.ts`, `conciliar` em `lib/ia-dados.ts`, e rode `ATUALIZAR_EXEMPLO=1 npm test` para atualizar o
`servidor/mesinteiro_exemplo.json` (usado no `MOCK_IA`, no comando `teste` e no teste em Python).

## 4. Build, testes e entrega

```bash
npm ci
npm test                       # motor do quiz, ia-dados e o exemplo do servidor em dia
npm run typecheck
python3 testes/teste_mesinteiro.py   # servidor.py v21 real + TestClient (pip install fastapi httpx anthropic)
npm run entregas               # build + entregas/site-mesinteiro.zip, atualizacao-servidor-21-mesinteiro.zip e kit-mesinteiro.zip
```
- Para o teste em Python conferir também a venda do Fôlego: `FOLEGO_PY=/caminho/folego.py python3 testes/teste_mesinteiro.py`.
- Kit: `npm run kit` (estáticos e imagens da Kiwify) e `npm run build && npm run kit:videos` (vídeos 9:16).
- O site é estático: **não use** rotas `app/api`, `connection()`, `cookies()`, `headers()`, server actions nem nada
  que precise de servidor Node. Leia `config()` (de `lib/api.ts`) dentro de `useEffect` em componentes que aparecem
  no HTML do build.

## 5. Os 4 ganchos no `servidor.py` (v20 → v21)

Se o `md5sum` do `servidor.py` da VPS não for `0cfbd62f7cc1b87e308623185cba50d8` (v20), não troque o arquivo
inteiro: aplique só isto no arquivo que está lá (e confira o resto com o teste em Python).

1. **CORS**, na tupla do `for _u in (...)`: acrescentar
   `os.environ.get("MESINTEIRO_SITE", "https://mesinteiro.folegofinanceiro.shop")`.
2. **Rotas**, logo depois de `app.include_router(_casamento.router)`:
   ```python
   import mesinteiro as _mesinteiro  # noqa: E402
   app.include_router(_mesinteiro.router)
   ```
3. **Startup**, dentro de `_iniciar()`, depois do bloco do casamento:
   ```python
   try:
       _mesinteiro.iniciar()
   except Exception:
       log.exception("mesinteiro: não iniciou")
   ```
4. **Webhook**, logo depois do bloco do casamento (que vem depois de `nomes_produtos = _produtos_no_payload(p)`):
   ```python
   if _mesinteiro.eh_mesinteiro(nomes_produtos):
       try:
           _mesinteiro.evento_kiwify(p, status, email, nomes_produtos)
       except Exception:
           log.exception("mesinteiro: webhook falhou para %s", email); alerta_admin("Mês Inteiro: webhook falhou", traceback.format_exc())
           raise HTTPException(500)
       nomes_produtos = [n for n in nomes_produtos if not _mesinteiro.eh_mesinteiro([n])]
       if not nomes_produtos:
           return {"ok": True}
   ```

## 6. Configuração (`/opt/mapadaalma/.env`)

| Chave | Para quê |
|---|---|
| `MESINTEIRO_CHECKOUT` | Código do checkout do plano (obrigatória) |
| `MESINTEIRO_REMETENTE` | `plano@folegofinanceiro.shop` (o nome "Mês Inteiro" entra sozinho). Vazio = nenhum e-mail sai |
| `MESINTEIRO_CONTATO` | E-mail de atendimento: vai como "responder para". Nunca o do Meu Santo |
| `MESINTEIRO_ANTHROPIC_API_KEY`, `MESINTEIRO_MODELO` | Opcionais (vazio = chave do Meu Santo; modelo padrão `claude-opus-5-5`) |
| `MESINTEIRO_SITE` | Padrão `https://mesinteiro.folegofinanceiro.shop` (links dos e-mails e CORS) |
| `PRODUTO_MESINTEIRO`, `MESINTEIRO_BUMP` | Trechos dos nomes na Kiwify (padrão `mes inteiro` e `acompanhamento`; aceitam `a\|b`) |
| `MESINTEIRO_RECUPERACAO` | `0` desliga os e-mails de recuperação |
| `KIWIFY_TOKEN` | Lista separada por vírgula; inclui o token do webhook, se for um webhook novo |

## 7. Comandos (VPS, `cd /opt/mapadaalma`)

```
./venv/bin/python mesinteiro.py diagnostico     # configuração, banco e IA
./venv/bin/python mesinteiro.py status          # quizzes, vendas, bump, planos com IA, e-mails e recuperação (24 h e 7 dias)
./venv/bin/python mesinteiro.py funil 7         # funil da página (contador próprio)
./venv/bin/python mesinteiro.py buscar EMAIL    # pedidos, compras, e-mails e link do plano (não copie os dados para lugar nenhum)
./venv/bin/python mesinteiro.py refazer mi-...  # escreve de novo o texto da IA
./venv/bin/python mesinteiro.py liberar mi-...  # libera à mão (depois de conferir o pagamento na Kiwify)
./venv/bin/python mesinteiro.py leads 30 > /root/leads-mesinteiro.csv   # dados pessoais: use e apague
./venv/bin/python mesinteiro.py teste EMAIL [ia]  # e-mails de exemplo e um plano de teste
journalctl -u mapadaalma -n 100 --no-pager | grep mesinteiro
```
Use python3, não o comando `sqlite3`. Sempre diga em qual terminal cada comando roda: Mac `carlosaugusto@macbook`
ou VPS `root@srv2014776`.

## 8. Regras (não negociáveis)

- **Chaves e tokens nunca no chat nem em arquivo.** Ficam só no `/opt/mapadaalma/.env`. Zips sempre sem `.env`.
- **A VPS é compartilhada:** nunca reinicie o Docker nem a máquina, nunca rode `do-release-upgrade`. Reinicie só
  com `systemctl restart mapadaalma`.
- **Não quebre os produtos que já vendem:** o Mês Inteiro fica no `mesinteiro.py` e nas tabelas `mesinteiro_*`. No
  `servidor.py`, só os 4 ganchos. Antes de substituir o `servidor.py`, mande conferir o `md5sum`.
- **Compra paga nunca fica sem entrega:** IA fora → versão padrão; compra sem quiz → lembretes; upsell do Fôlego
  sem o quiz do Fôlego → lembretes.
- **LGPD:** nada de e-mail, CPF ou telefone de cliente em documento, print ou relatório. Só números agregados. Toda
  IA de terceiros usada na geração aparece na política de privacidade (hoje: Claude, da Anthropic).
- **Copy honesta:** sem promessa de resultado, sem depoimento inventado, sem escassez falsa, e nada de anúncio que
  aponte a situação financeira de quem vê ("Seu salário não dura o mês?"). O plano é material educativo, não
  consultoria, e diz que os valores são estimativas.
- **E-mail:** o Mês Inteiro nunca usa o remetente nem o "responder para" do Meu Santo.
