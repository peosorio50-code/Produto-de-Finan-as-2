# Mês Inteiro

Quiz gratuito sobre o salário, que mostra em que dia o dinheiro acaba e para
onde ele vai, e oferece um plano do mês personalizado (R$ 29,90), escrito por
IA a partir das respostas do quiz.

É o segundo produto do **Fôlego Financeiro**, feito para testar lado a lado
com o [Fôlego](https://github.com/peosorio50-code/Produto-de-Finan-as) (plano
de quitação de dívidas). Mesmo funil, mesma estrutura, mesmo domínio; muda o
problema que o produto resolve. O porquê está em [CONTEXTO.md](CONTEXTO.md).

1. **Contato primeiro.** A primeira tela pede nome, e-mail e WhatsApp. O lead
   fica gravado na hora no banco da VPS.
2. **Perguntas de um toque.** Começa pelo gancho ("em que parte do mês o seu
   dinheiro costuma acabar?") e segue: pessoas na casa, renda, quando o
   dinheiro entra, contas fixas, dia a dia, parcelas, fatura do cartão, como
   fecha o mês, onde o dinheiro escapa, controle, reserva, como se sente e
   objetivo.
3. **Raio-x do mês.** O resultado dá nome ao tipo de mês ("Dinheiro que some",
   "Fim de mês no cartão", "Salário com dono"...), pinta o calendário do mês
   até o dia em que o dinheiro acaba, mostra para onde vai o salário, os
   vazamentos que mais pesam (por mês e por ano) e o primeiro passo.
4. **Gancho para o plano.** O fim do resultado retoma o que a pessoa contou e
   lista o que o plano completo traz para o caso dela.
5. **Plano.** Depois do pagamento, sai o plano: o salário dividido em quatro
   potes, o valor por semana para o dia a dia, onde ajustar, o calendário do
   mês, regras pessoais, reserva, desafio de 30 dias e mensagens prontas.

O plano tem duas partes:

- **Parte personalizada**: os números são calculados por regras fixas
  (`lib/diagnostico.ts`) e o texto é escrito por IA (Claude) em cima deles.
- **Parte fixa**: o guia que acompanha todo plano (`lib/guia.ts`), com o
  método, os quatro potes, renda variável, cartão, armadilhas, direitos,
  mensagens e ajuda gratuita.

```
/  →  /diagnostico  →  /resultado  →  checkout  →  /plano
início   quiz (contato     raio-x +       Kiwify       plano do mês
         + perguntas)      oferta                      (tela, PDF, link por e-mail)
```

**Onde roda:** na mesma VPS do Fôlego, como o serviço `mesinteiro` na porta
8021, com um banco SQLite em `/opt/mesinteiro/dados/mesinteiro.db`. O
endereço é o subdomínio `mesinteiro.folegofinanceiro.shop`, no mesmo
Cloudflare Tunnel do Fôlego. Passo a passo em [COMO-SUBIR.md](COMO-SUBIR.md).

**Venda em espera.** Enquanto `KIWIFY_CHECKOUT` estiver vazio (e sem
`PAGAMENTO_MODO=teste`), o resultado mostra a oferta do plano como "Em breve",
sem preço nem botão. O quiz e o resultado funcionam normalmente.

## O que é calculado

- **Em que dia o dinheiro acaba.** Contas fixas e parcelas saem logo que o
  dinheiro entra; o dia a dia vai saindo aos poucos, em 30 dias.
- **Gasto invisível.** Se a pessoa diz que o dinheiro acaba antes do que as
  contas dela preveem, a diferença é o que sai sem aparecer em lugar nenhum
  (estimativa conservadora: só o que sai a mais até o dia em que ele acaba).
- **Quatro potes.** Contas fixas, parcelas, dia a dia e futuro, somando a
  renda. Os ajustes começam pelo que a pessoa apontou como vazamento e pelo
  que está acima do comum, até o mês fechar e sobrar a meta de guardar.
- **Valor por semana.** O pote do dia a dia dividido em semanas.
- **Reserva.** Colchão para imprevistos, um mês e três meses do essencial, com
  o prazo no ritmo do plano.

## Pagamento (Kiwify)

Igual ao Fôlego:

1. Ao clicar em comprar, o site grava um **pedido** no banco (as respostas do
   quiz) e manda a pessoa para `https://pay.kiwify.com.br/<KIWIFY_CHECKOUT>?sck=<ref>`.
   As referências do Mês Inteiro começam com `mi-` (as do Fôlego, com `fl-`).
2. A Kiwify avisa o servidor em `https://SEU-SITE/api/kiwify/<KIWIFY_WEBHOOK_SEGREDO>`.
   O aviso só é aceito com o segredo certo no endereço e, se `KIWIFY_TOKEN`
   estiver preenchido, com a assinatura certa.
3. A compra é ligada ao pedido pelo `sck`; se ele não voltar, pelo pedido mais
   recente do mesmo e-mail (7 dias). Quem pagou com outro e-mail pode informar
   o e-mail do pagamento na tela de espera.
4. Depois do pagamento, a Kiwify manda a pessoa para `/plano`. O plano é gerado
   ali, guardado no banco e fica no link `/plano?ref=...`, que abre em qualquer
   aparelho. Com a Resend configurada, o link também vai por e-mail.
5. Reembolso e chargeback bloqueiam o pedido.

Avisos de **outros produtos** da mesma conta Kiwify (inclusive o Fôlego) são
ignorados sem gravar nada. O produto é reconhecido pelo nome, com
`KIWIFY_PRODUTO` (padrão `mes inteiro`). **O nome do produto na Kiwify não pode
ter a palavra "Fôlego"**: o servidor do Fôlego reconhece os produtos dele por
essa palavra.

## IA e créditos

- O plano é escrito pelo Claude (`claude-opus-5-5`) com as respostas do quiz e
  o raio-x calculado. E-mail e telefone não vão para a IA.
- Custo estimado: uns US$ 0,10 a 0,25 por plano, num produto de R$ 29,90.
- **Uma chamada por venda.** O plano fica guardado. Se a IA falhar, a pessoa
  recebe a versão escrita por regras na hora e pode pedir a versão da IA mais
  2 vezes (`MAX_GERACOES` em `lib/registros.ts`).
- **Se o crédito acabar, ninguém fica sem plano:** sai a versão por regras. O
  `mesinteiro-admin status` avisa quando isso aconteceu nas últimas 24 h.

## Leads (banco na VPS)

Cada etapa do funil é gravada no banco: uma ficha por e-mail na tabela `leads`
e o histórico na tabela `eventos`. Os eventos são os mesmos do Fôlego, o que
deixa os dois funis comparáveis:

| `evento` | Quando |
| --- | --- |
| `quiz_iniciado` | A pessoa preencheu o contato e começou |
| `quiz_concluido` | Respondeu tudo e viu o resultado (grava o resumo do resultado) |
| `checkout_iniciado` | Clicou em comprar |
| `pix_gerado` | Kiwify: Pix ou boleto gerado e ainda não pago |
| `compra_recusada` | Kiwify: cartão recusado |
| `carrinho_abandonado` | Kiwify: abriu o checkout e não terminou |
| `compra_aprovada` | Kiwify: pagamento aprovado |
| `reembolso` | Kiwify: reembolso ou chargeback |
| `plano_gerado` | O plano foi gerado pela primeira vez |

Na VPS:

```bash
mesinteiro-admin status
```

```bash
mesinteiro-admin leads 30 > /root/leads-mesinteiro.csv
```

```bash
mesinteiro-admin buscar EMAIL
```

O CSV tem dado pessoal: use, apague e não mande por chat. Para uma cópia dos
eventos em outra ferramenta (Make, n8n, CRM), preencha `LEADS_WEBHOOK_URL`.

## Rodar no computador

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Abra http://localhost:3000. Com `PAGAMENTO_MODO=teste` no `.env.local`, o
pagamento é simulado e nada é cobrado. Sem `ANTHROPIC_API_KEY`, o plano sai na
versão escrita por regras, o que basta para testar o fluxo.

Testes e checagem de tipos:

```bash
npm test
```

```bash
npm run typecheck
```

## Configuração

Na VPS, em `/opt/mesinteiro/.env` (modelo comentado em `deploy/env.exemplo`).
Depois de mudar: `systemctl restart mesinteiro`.

| Variável | Para que serve |
| --- | --- |
| `SITE_URL` | Endereço público. Na VPS: `https://mesinteiro.folegofinanceiro.shop`. |
| `CONTATO_EMAIL` | E-mail de atendimento mostrado no site. Vazio = o site não mostra e-mail. |
| `KIWIFY_CHECKOUT` | Código do checkout do produto. Com ele a venda abre. |
| `KIWIFY_WEBHOOK_SEGREDO` | Trecho secreto do endereço do webhook (gerado na instalação). |
| `KIWIFY_TOKEN` | Token do webhook na Kiwify, para conferir a assinatura. Aceita vários, separados por vírgula. |
| `KIWIFY_PRODUTO` | Trecho do nome do produto na Kiwify (padrão `mes inteiro`). |
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic. Liga o texto personalizado por IA. |
| `ANTHROPIC_MODEL` | Opcional. Padrão: `claude-opus-5-5`. |
| `RESEND_API_KEY`, `EMAIL_REMETENTE` | Opcionais. Mandam o link do plano por e-mail. |
| `LEADS_WEBHOOK_URL`, `LEADS_WEBHOOK_TOKEN` | Opcionais. Cópia dos leads em outra ferramenta. |
| `PAGAMENTO_MODO` | `teste` simula o pagamento. Só no computador, nunca na VPS. |

Nome do produto, preço e dias de garantia ficam em `lib/config.ts`. O preço
cobrado é o da Kiwify: mantenha os dois iguais.

## Publicar (VPS)

```bash
npm run empacotar
```

Gera `mesinteiro-vps.zip` (site compilado + instalador + serviço +
`mesinteiro-admin`, sem `.env`). Instalação e atualizações em
[COMO-SUBIR.md](COMO-SUBIR.md).

## Antes de vender

- [ ] Fazer uma compra real (Pix e cartão) e conferir se o plano é liberado e
      se `mesinteiro-admin buscar` mostra a compra ligada ao pedido.
- [ ] Conferir que uma compra do Fôlego **não** aparece no Mês Inteiro e
      vice-versa (`ignorado: outro_produto` no log).
- [ ] Gerar alguns planos com a chave da Anthropic e ler o texto da IA em casos
      diferentes (sobra dinheiro, gasto invisível, mês que não fecha, renda
      variável).
- [ ] Revisar o aviso de uso do contato na primeira tela do quiz
      (`components/Quiz.tsx`) e a página de privacidade com quem cuida da LGPD
      (inclua razão social/CNPJ ou CPF de quem vende).
- [ ] Revisar os trechos legais de `lib/guia.ts` e do prompt em `lib/ia.ts`
      (arrependimento de 7 dias, cancelamento pelo SAC, devolução em dobro,
      teto do rotativo e do cheque especial, tarifa social). Foram conferidos
      em novembro de 2026, mas essas regras mudam.

## Limitações conhecidas

- O dia em que o dinheiro acaba supõe que contas e parcelas saem no começo do
  mês e o dia a dia sai em ritmo constante. Quem recebe duas vezes no mês tem
  o calendário do plano ajustado, mas o cálculo do dia é o mesmo.
- O gasto invisível é uma estimativa a partir de uma resposta aproximada
  ("lá pela metade do mês" = dia 15). O texto sempre trata como estimativa.
- Sem limite de requisições em `/api/lead` e `/api/checkout` (dá para limitar
  no Cloudflare). Sem pixel de anúncios nem analytics (os UTMs ficam no banco).

## Onde mexer

| Quero mudar | Arquivo |
| --- | --- |
| Nome, preço, garantia | `lib/config.ts` |
| Textos da página inicial | `app/page.tsx` |
| Perguntas e ordem do quiz | `components/Quiz.tsx`, `lib/rotulos.ts` |
| Tipos de mês, primeiro passo e itens da oferta | `lib/perfil.ts` |
| Tela de resultado e oferta do plano | `components/Resultado.tsx` |
| Regras de cálculo (dia, gasto invisível, ajustes, potes) | `lib/diagnostico.ts` |
| Calendário do mês do plano | `lib/calendario.ts` |
| Instruções dadas à IA | `lib/ia.ts` |
| Texto padrão sem IA | `lib/narrativa-padrao.ts` |
| Guia fixo | `lib/guia.ts` |
| Layout do plano / PDF | `components/PlanoDocumento.tsx` |
| Leads (banco e webhook) | `lib/leads.ts` |
| Webhook da Kiwify | `app/api/kiwify/[segredo]/route.ts`, `lib/kiwify.ts` |
| Pedidos, compras e limite de gerações da IA | `lib/registros.ts` |
| E-mail com o link do plano | `lib/email.ts` |
| Instalação na VPS e `mesinteiro-admin` | `deploy/` |
| Cores e fontes | `app/globals.css` |
