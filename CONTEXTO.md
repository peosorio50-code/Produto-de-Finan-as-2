# Mês Inteiro — documento de contexto

> Para quem vai trabalhar neste código (pessoa ou IA). Cobre o produto, por que
> ele existe, o fluxo, a arquitetura, as regras de cálculo e as decisões que
> não estão óbvias no código. Para rodar e publicar, veja `README.md` e
> `docs/COMO-SUBIR.md`.

---

## 1. Por que este produto existe

O Fôlego Financeiro testa **dois produtos lado a lado**, no mesmo domínio
(`folegofinanceiro.shop`):

| | Fôlego | Mês Inteiro |
| --- | --- | --- |
| Problema | "Estou endividado e não sei por onde começar" | "Meu salário acaba antes do mês" |
| Público | Quem já tem dívida, muitas vezes atrasada | Quem vive no aperto todo mês (com ou sem dívida) |
| Gancho do quiz | A situação real das dívidas | Em que dia o salário acaba |
| Entrega paga | Plano de quitação: fila das dívidas, mensagens para credores | Plano do mês: quatro potes, valor por semana, mensagens para casa |
| Endereço | `folegofinanceiro.shop` | `mesinteiro.folegofinanceiro.shop` |

**A variação escolhida muda o problema e mantém o funil.** Quiz com captura de
lead, resultado gratuito, oferta de R$ 29,90 por Kiwify, plano escrito por IA
em cima de números calculados por regras, garantia de 7 dias: tudo igual ao
Fôlego. Assim, a diferença de venda entre os dois mede o apelo do problema, e
não uma diferença de preço, de página ou de checkout.

Por que "o salário acaba antes do mês":

- É um público maior que o de endividados (quem tem dívida quase sempre
  também vive isso, mas o contrário não), com menos vergonha de clicar.
- A dor é mensal e concreta: dá para nomear um dia ("o meu dinheiro acaba no
  dia 20"), o que rende um gancho forte para anúncio e um resultado visual.
- Tem números determinísticos fortes para mostrar de graça (o dia em que o
  dinheiro acaba, o gasto invisível, os vazamentos por ano) e um entregável
  concreto para vender (o valor por semana e os quatro potes).
- Não depende de dados que a pessoa não tem (saldo exato de cada dívida,
  juros), então o quiz é mais fácil de terminar.

Mesmo preço do Fôlego de propósito. Se um dos dois ganhar, o próximo teste
natural é de preço.

---

## 2. O produto

1. **Quiz gratuito** (uma pergunta por tela, cartões de um toque), começando
   pelo contato (nome, e-mail, WhatsApp).
2. **Resultado gratuito na tela**: nome do tipo de mês, calendário de 30 dias
   pintado até o dia em que o dinheiro acaba, nível de 1 a 4 (Equilibrado, No
   limite, Apertado, No vermelho), números, para onde vai o salário,
   vazamentos, o que mais pesa e o primeiro passo.
3. **Oferta do plano pago** no fim do resultado: R$ 29,90 pela Kiwify.
4. **Plano do mês** na tela (e em PDF pela impressão do navegador), com uma
   parte personalizada (números por regras + texto da IA) e um guia fixo.

Público: pessoa física, muitas vezes cansada, ansiosa ou com culpa, lendo no
celular. **Todo o texto é em português do Brasil, simples, direto, sem
julgamento sobre como a pessoa gasta e sem promessa de resultado.**

---

## 3. Fluxo e rotas

```
/  →  /diagnostico  →  /resultado  →  checkout (Kiwify)  →  /plano
```

O site é **estático** (Cloudflare Pages, projeto `mesinteiro`). As rotas de servidor ficam no módulo
`servidor/mesinteiro.py`, dentro do servidor do Meu Santo Protetor (`/opt/mapadaalma`, público em
`https://api.mapadaalma.online`).

| Página / rota | Arquivo | O que faz |
| --- | --- | --- |
| `/` | `app/page.tsx` | Página inicial. Fala só do quiz gratuito. Ilustração `CalendarioAnotado` com o caso `lib/exemplo.ts`, calculado pelo motor real. |
| `/diagnostico` | `components/Quiz.tsx` | O quiz. |
| `/resultado` | `components/Resultado.tsx` | Resultado gratuito + oferta (`?r=TOKEN` abre o resultado guardado no servidor). |
| `/plano` | `components/TelaPlano.tsx` + `OfertaObrigado.tsx` + `PlanoDocumento.tsx` | Página de obrigado da Kiwify (upsell de 1 clique) e link do plano. |
| `/privacidade`, `/sair` | `app/privacidade/page.tsx`, `components/SairDaLista.tsx` | Privacidade e termos; descadastro (o botão faz POST no servidor). |
| `POST /api/mesinteiro/lead` | `mesinteiro.py` | `quiz_iniciado` e `quiz_concluido` (este guarda o resultado e devolve um token). |
| `GET /api/mesinteiro/resultado?r=` | | Resultado guardado, para o link dos e-mails abrir em qualquer aparelho. |
| `POST /api/mesinteiro/checkout` | | Cria o pedido (respostas, resumo, JSON da IA) e devolve o link da Kiwify com `sck`. |
| `POST /api/mesinteiro/plano` | | 402 sem pagamento, 202 enquanto a IA escreve, 200 com `{respostas, ia, acompanhamento}`. |
| `POST /api/mesinteiro/vincular`, `/reenviar` | | "Paguei com outro e-mail" e "manda o link de novo". |
| `POST /api/mesinteiro/sair` | | Descadastro com link assinado (só POST). |
| `POST /webhook/kiwify/<segredo>` | `servidor.py` → `mesinteiro.evento_kiwify` | O webhook de sempre; o desvio do Mês Inteiro vem antes do Fôlego e do Meu Santo. |
| `POST /api/evento` | `servidor.py` | Contador do funil (`p=mesinteiro`), lido por `mesinteiro.py funil`. |

### Telas do quiz (em `montarTelas`)

1. contato
2. **em que parte do mês o dinheiro acaba** (o gancho)
3. pessoas na casa
4. tipo de renda (fixa, variável, mista)
5. renda por mês
6. quando o dinheiro entra (começo, meio/fim, duas vezes, aos poucos)
7. contas fixas (moradia, contas, transporte, saúde e educação, assinaturas)
8. dia a dia (mercado, delivery e lanches, compras e lazer, outros)
9. parcelas (cartão; empréstimos, financiamentos e carnês)
   → tela "Primeira conta feita": o dia pelas contas até aqui e, se a pessoa
   disse que o dinheiro acaba antes, o gancho "no resultado você descobre de
   onde vem essa diferença"
10. fatura do cartão
11. como fecha o mês quando o dinheiro acaba (pulada se "sobra")
12. onde o dinheiro escapa
13. controle dos gastos
14. reserva
15. como se sente
16. objetivo

O rascunho fica no `localStorage` (`mesinteiro:quiz`, `VERSAO_RASCUNHO`).

---

## 4. Arquitetura (padrão da skill produto-digital, igual ao Fôlego v2)

1. **A IA não faz conta.** Todo número sai de `lib/diagnostico.ts`, no navegador. No checkout, o site manda ao
   servidor o JSON pronto para a IA (`lib/ia-dados.ts: dadosParaIA`) e um resumo (`lib/resumo.ts`) que alimenta
   os e-mails. O servidor não refaz contas.
2. **O plano nunca falha para quem pagou.** O servidor chama a IA quando o pagamento cai. Se ela falhar, o pedido
   fica com `ia = null` e o navegador monta o plano com `narrativaPadrao`; o servidor tenta a IA de novo a cada
   30 min (até 3 gerações). `conciliar` completa campo a campo o que a IA não mandou, e o servidor derruba
   promessa de resultado (`RE_PROMESSA`).
3. **O navegador monta o plano.** `/plano` recebe `{respostas, ia}` e faz `diagnosticar` + `calendarioDoMes` +
   `conciliar(ia, narrativaPadrao)`. O link abre em qualquer aparelho e a IA é chamada uma vez por venda.
4. **Contato não vai para a IA.**
5. **Banco** = o SQLite do servidor (`dados/mapa.db`), tabelas `mesinteiro_*`: pedidos, compras (uma linha por
   `order_id`, com os `skus` plano/acompanhamento), leads, eventos, resultados, envios, descadastros e recup.
6. **Webhook seguro contra repetição** (upsert por `order_id`, status com peso: pendente/recusado 1, pago 2,
   reembolsado 3). Em erro, o `servidor.py` devolve 500 e a Kiwify manda de novo.
7. **Bump** no mesmo aviso ou em aviso separado (liga ao pedido mais recente do mesmo e-mail, 30 dias). Compra sem
   quiz liga quando a pessoa faz o quiz com o mesmo e-mail.
8. **Separação dos outros produtos**: prefixo `mi-`, trecho `mes inteiro` (`PRODUTO_MESINTEIRO`), chaves
   `mesinteiro:*` no navegador, tabelas próprias, remetente próprio (nunca o "responder para" do Meu Santo).
9. **Recuperação e lembretes** (trabalhador do `mesinteiro.py`, a cada minuto): quiz sem compra (1 h, 24 h,
   72 h), Pix (60 min), recusado (15 min), carrinho (90 min), compra sem quiz, upsell do Fôlego sem o quiz do
   Fôlego, acompanhamento semanal do bump e limpeza dos quizzes sem compra depois de 60 dias.
10. **Configuração do site em `public/config.js`** (pixel, contato, checkout de reserva, upsell): muda sem
    compilar. Componentes que aparecem no HTML do build leem o `config()` dentro de `useEffect`.
11. **Pixel opcional**: `Purchase` só quando o plano acabou de sair (menos de 30 min), uma vez por pedido no
    aparelho, com `eventID` = referência do pedido.

---

## 5. Regras do cálculo (`lib/diagnostico.ts`)

- **Mês de 30 dias.** Contas fixas e parcelas saem logo que o dinheiro entra.
  O dia a dia sai em ritmo constante.
- **Dia pelas contas**: `(renda − fixos − parcelas) ÷ (dia a dia ÷ 30)`. Se
  passar de 29, o dinheiro dura o mês. Se as contas já levam tudo, dia 1.
- **Dia contado** pela pessoa: primeira semana = 7, metade = 15, última
  semana = 24, chega justo = 30, sobra = não acaba.
- **Gasto invisível**: quando o dia contado é mais de 2 dias antes do dia pelas
  contas, `disponível − dia a dia × (dia contado ÷ 30)`, arredondado para baixo
  de 10 em 10, e só se passar de `max(R$ 100, 3% da renda)`. É o que sai a mais
  até o dia em que o dinheiro acaba (estimativa conservadora). Entra como uma
  linha do orçamento ("Gastos que não aparecem nas contas"). Com ele, o dia em
  que o dinheiro acaba passa a ser o dia contado.
- **Contas que não batem**: sem gasto invisível, o dia pelas contas fica mais
  de 7 dias antes do dia contado (ou a pessoa diz que sobra). O resultado
  mostra um aviso para conferir no extrato.
- **Referência por grupo** (só para marcar "acima do comum", com 15% de
  folga): moradia 30%, contas 8%, transporte 10%, saúde e educação 8%,
  assinaturas 2%, mercado 18%, delivery 5%, compras e lazer 6%, outros 5%.
- **Ajuste máximo por grupo** (fração do gasto atual): moradia e saúde 0;
  contas, transporte e mercado 10%; outros 25%; compras e lazer 40%;
  assinaturas e delivery 50%; gasto invisível 60%.
- **Meta de guardar**: 10% da renda se o objetivo é reserva ou um sonho, senão
  5%; no mínimo R$ 50 e no máximo 20% da renda.
- **Ajustes**: primeiro o gasto invisível, depois os grupos que a pessoa
  apontou ou que estão acima do comum, depois o resto, na ordem do que dói
  menos, até o mês fechar com a meta de guardar. Grupos apontados pela pessoa
  sempre ganham meta (metade do ajuste máximo), mesmo com o mês fechando. Se
  depois disso faltar até R$ 50, sai do dia a dia.
- **Potes**: contas fixas (com ajustes), parcelas, dia a dia (metas + respiro)
  e futuro. Se sobra além da meta, metade do excesso vai para o futuro e a
  outra metade fica de respiro. Abaixo de R$ 30, o futuro fica em zero. Quando
  o plano fecha, os potes somam exatamente a renda.
- **Valor por semana**: pote do dia a dia × 7 ÷ 30, para baixo de 5 em 5.
- **Reserva**: colchão (25% da renda, entre R$ 300 e R$ 1.000), um mês e três
  meses do essencial (contas + parcelas + mercado), com meses no ritmo do plano.
- **Nível** por pontos (parte do salário com destino, sobra, parcelas, fecha no
  crédito, fatura, reserva, apostas): ≥ 9 → 4; ≥ 6 → 3; ≥ 3 → 2; senão 1.

- **Simulador "E se...?"** (`opcoesDeSimulacao`, `simularDia`): até três
  mudanças (metade do gasto invisível e dos dois maiores vazamentos, ou das
  assinaturas). Cortes do dia a dia são espalhados pelos 30 dias; o corte do
  gasto invisível sai do ritmo até o dia contado, coerente com o cálculo dele.

### Tipos de mês (`lib/perfil.ts`, o primeiro que bater)

1. **Salário com dono**: contas fixas + parcelas ≥ 85% da renda.
2. **Dinheiro que some**: gasto invisível ≥ `max(R$ 150, 8% da renda)`.
3. **Fim de mês no cartão**: o mês não fecha e a pessoa fecha com cartão,
   cheque especial ou empréstimo.
4. **No vermelho todo mês**: o mês não fecha.
5. **Vazamento miúdo**: delivery + compras e lazer + assinaturas ≥ 18% da renda.
6. **Renda montanha-russa**: renda que varia, sem reserva ou com sobra < 10%.
7. **Sem colchão**: sem reserva.
8. **No azul, sem rumo**: o resto.

---

## 6. A IA (`servidor/mesinteiro.py`)

`_chamar_ia`: modelo `MESINTEIRO_MODELO` (padrão `claude-opus-5-5`), chave `MESINTEIRO_ANTHROPIC_API_KEY` (vazia =
a do Meu Santo), streaming, `output_config` com `effort: "medium"` e `json_schema` (`ESQUEMA`), fallback de
recusa do lado da API (`server-side-fallback-2026-07-01`). Com `MOCK_IA=1` devolve o texto de
`mesinteiro_exemplo.json`.

Saída: `leitura`, `pontosCriticos` (3), `regrasDoMes` (3–5), `ajustes` (um por grupo com ajuste),
`primeiros7Dias`, `desafio30Dias` (4 semanas), `mensagens` (1–3), `proximos90Dias`, `recado`. `conferir` (servidor)
tira markdown, corta excessos e derruba promessa; `conciliar` (navegador) completa com a versão padrão.

O prompt (`SISTEMA`) fixa: tom, uso do tipo de mês e de "como se sente", significado dos potes e do gasto
invisível, só números do JSON, lista fechada de regras legais e de canais citáveis, e proibição de indicar
bancos, aplicativos, produtos, investimentos, crédito ou antecipações.

Se mudar a `Narrativa`, mude junto: `lib/tipos.ts`, `SISTEMA`/`ESQUEMA`/`conferir` no `mesinteiro.py`,
`conciliar` em `lib/ia-dados.ts`, `narrativa-padrao.ts`, `PlanoDocumento.tsx`, e rode
`ATUALIZAR_EXEMPLO=1 npm test` para atualizar o `servidor/mesinteiro_exemplo.json`.

---

## 7. Convenções

- Tudo em português: nomes, comentários, commits (título no presente, como
  "Cria o Mês Inteiro: ...").
- Valores em reais como inteiros; preço em centavos só em `config.ts`.
- Dinheiro exibido com `brl()` (R$ 1.234, com espaço que não quebra linha).
- Visual: a folha do mês anotada a caneta. Dia com dinheiro em verde, dia no
  aperto em vermelho. Mesma base de CSS e fontes do Fôlego, outra paleta.
- Copy: frases curtas, "você", sem jargão sem explicação, sem culpa.

---

## 8. Onde mexer

| Quero mudar | Arquivo |
| --- | --- |
| Nome, preço, garantia | `lib/config.ts` (e o preço na Kiwify) |
| Pixel, contato, checkout de reserva, upsell | `public/config.js` |
| Perguntas do quiz | `components/Quiz.tsx`, `lib/rotulos.ts`, `lib/tipos.ts`, `lib/validacao.ts` |
| Regras de cálculo | `lib/diagnostico.ts` |
| Tipos de mês, primeiro passo, oferta | `lib/perfil.ts` |
| Calendário do plano | `lib/calendario.ts` |
| Texto padrão | `lib/narrativa-padrao.ts` |
| O que vai para a IA / como o texto dela entra | `lib/ia-dados.ts` |
| Prompt e formato da IA | `servidor/mesinteiro.py` (`SISTEMA`, `ESQUEMA`, `conferir`) |
| E-mails (plano, recuperação, lembretes, acompanhamento) | `servidor/mesinteiro.py` |
| Resumo que o servidor usa nos e-mails | `lib/resumo.ts` |
| Guia fixo | `lib/guia.ts` |
| Resultado / plano / obrigado | `components/Resultado.tsx`, `PlanoDocumento.tsx`, `TelaPlano.tsx`, `OfertaObrigado.tsx` |
| Cores | `app/globals.css` |
| Simulador do resultado | `components/Simulador.tsx` |
| Contador do funil | `lib/eventos.ts` (e `funil` no `mesinteiro.py`) |
| Kit (criativos, vídeos, Kiwify, prévia do link) | `scripts/gerar-kit.cjs`, `scripts/gerar-videos.cjs`, `docs/TEXTOS-KIWIFY-E-ANUNCIOS.md` |

**Ao acrescentar uma pergunta**: `tipos.ts`, `rotulos.ts`, `validacao.ts`
(esquema e objeto normalizado, na ordem), `Quiz.tsx` (tela, validação,
conversão, `VERSAO_RASCUNHO`), e onde for usada (`diagnostico.ts`,
`perfil.ts`, `ia-dados.ts`, `resumo.ts`, `exemplo.ts`, testes; depois `ATUALIZAR_EXEMPLO=1 npm test`). `Resultado.tsx`
descarta respostas salvas por versões antigas (`respostasAtuais`).
