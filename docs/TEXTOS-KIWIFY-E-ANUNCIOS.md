# Mês Inteiro: textos prontos (Kiwify e anúncios)

## 1. Produto principal

- **Nome na Kiwify (exato):** `Mês Inteiro: plano do salário`
  - O servidor reconhece a venda pelo trecho **"mes inteiro"** (sem acento, maiúsculas não importam). Se mudar o
    nome na Kiwify, mude também `PRODUTO_MESINTEIRO` no `.env`, senão a venda não é entregue.
  - Não coloque no nome "Fôlego" nem "acompanhamento" (trechos de outro produto e do bump).
- **Preço:** R$ 29,90 · pagamento único · Pix e cartão · garantia de 7 dias
- **Imagem do produto:** `kit/kiwify/produto-1000x1000.png`
- **Checkout:**
  - cores `#FFFFFF` (fundo) e `#0E7A4E` (botões);
  - banner de computador: `kit/kiwify/banner-checkout-pc-1200x400.png`;
  - banner de celular: `kit/kiwify/banner-checkout-celular-1080x540.png`.
- **Página de obrigado (redirecionamento depois da compra):** `https://mesinteiro.folegofinanceiro.shop/plano`

**Descrição (copiar e colar):**

> O Mês Inteiro é um plano do mês feito com as respostas do seu quiz, para o salário chegar ao dia 30.
>
> Vem junto:
> • o salário dividido em quatro potes (contas fixas, parcelas, dia a dia e futuro), com os seus números;
> • quanto dá para gastar por semana no dia a dia;
> • onde ajustar, grupo por grupo, com uma meta para cada um;
> • o calendário do mês, com lembretes para colocar no celular;
> • a folha de controle das semanas, para imprimir;
> • regras do mês, reserva e um desafio de 30 dias;
> • mensagens prontas para combinar com quem mora com você;
> • o Guia Mês Inteiro: o método dos quatro potes, renda variável, cartão, armadilhas e onde buscar ajuda gratuita.
>
> Entrega: o plano abre na tela logo depois do pagamento (cerca de 1 minuto) e o link chega no seu e-mail. Dá para
> salvar em PDF.
>
> Material educativo do Fôlego Financeiro. Não é consultoria financeira. Os valores são estimativas feitas com as
> informações que você dá no quiz.

## 2. Order bump

- **Nome na Kiwify (exato):** `Acompanhamento do Mês Inteiro: 4 semanas por e-mail`
  - O servidor separa o bump do plano pelo trecho **"acompanhamento"** (`MESINTEIRO_BUMP`).
- **Preço:** R$ 12,90
- **Imagem:** `kit/kiwify/bump-acompanhamento-1000x1000.png`
- **Título no checkout:** Sim! Quero também o acompanhamento de 4 semanas por e-mail
- **Descrição:** Toda segunda-feira, às 8 h, um e-mail com o valor da semana para o dia a dia e o foco do desafio
  daquela semana, durante 4 semanas. No fim, um e-mail para fechar o mês e ajustar o próximo.

## 3. Upsell de 1 clique (página de obrigado)

- **Produto:** o do **Fôlego** (plano das dívidas), que já existe e já é entregue pelo servidor. Crie nele uma
  oferta nova de **R$ 19,90** (nome sugerido: "Upsell Mês Inteiro"). O preço normal mostrado na página é R$ 29,90.
- Na Kiwify, no **Gerador de upsell** dessa oferta:
  - "Ao aceitar" e "Ao recusar": deixe em área de membros (a página define o destino).
  - Do código gerado, copie o trecho depois de `kiwify-upsell-trigger-` e cole em `UPSELL_ID` no `config.js` do site.
  - Confira se o `<script src="...">` do código é igual ao `UPSELL_SCRIPT` do `config.js`.
  - O link do checkout da oferta vai em `CHECKOUT_UPSELL`: é a reserva para quem pagou no Pix.
- A oferta aparece **uma vez**, logo depois da compra, e só para quem respondeu no quiz que fecha o mês no crédito,
  paga o mínimo ou atrasa a fatura, ou tem parcelas acima de 20% da renda.
- Quem aceita responde ao quiz do Fôlego com o mesmo e-mail e o plano das dívidas sai sem pagar de novo. Se não
  fizer o quiz, o servidor do Mês Inteiro manda lembretes (~10 min, ~20 h e ~68 h depois).

## 4. Anúncios (Meta)

**Legenda única (copiar e colar):**

> Em que dia o salário acaba? 📅
>
> Contas fixas saem no começo do mês. O dia a dia vai saindo aos poucos. Em algum dia, o dinheiro acaba, e quase
> ninguém sabe qual.
>
> O quiz gratuito do Mês Inteiro faz essa conta em 3 minutos: em que dia o dinheiro acaba, para onde vai cada real,
> os gastos que mais pesam no ano e por onde começar. Sem CPF e sem cartão.
>
> Se quiser, o plano do mês divide o salário em quatro potes e mostra quanto dá para gastar por semana, com os
> números de cada caso.
>
> 👉 Toque em Saiba mais.

- **Título:** Em que dia o salário acaba?
- **Descrição:** Quiz grátis · 3 minutos
- **Botão:** Saiba mais
- **Link** (dê à campanha o nome `mesinteiro-teste` e ao anúncio o nome do criativo):
  ```
  https://mesinteiro.folegofinanceiro.shop/?utm_source=facebook&utm_medium=pago&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
  ```
  No teste contra o Fôlego, use a mesma estrutura lá (campanha `folego-teste`), o mesmo orçamento e o mesmo público.

**Criativos** (`kit/criativos/`):

| Arquivo | Formato | Conjunto | Ideia |
|---|---|---|---|
| `01-que-dia-acaba.png` | 4:5 | A | Calendário do mês pintado até o dia 20 |
| `02-gasto-invisivel.png` | 4:5 | A | "Pelas contas, dava até o dia 28. Acabou no dia 15." |
| `03-quiz-celular.png` | 4:5 | A | O quiz no celular, uma pergunta por tela |
| `04-delivery-no-ano.png` | 4:5 | A | R$ 420 por mês, R$ 5.040 no ano |
| `05-busca.png` | 4:5 | A | A busca "por que o dinheiro acaba antes do mês" |
| `06-enquete.png` | 4:5 | A | "Quando o dinheiro costuma acabar?" (A/B/C/D) |
| `09-tipos-de-mes.png` | 4:5 | A | Os tipos de mês do resultado |
| `10-a-conta.png` | 4:5 | A | A conta que quase ninguém faz |
| `12-conversa.png` | 4:5 | A | Conversa com a mãe, como cena (traz "cena ilustrativa"; não é depoimento) |
| `v1-calendario.mp4` | 9:16, 12 s | A | Os dias do mês passam e o saldo cai até o dia 20 |
| `v2-delivery-no-ano.mp4` | 9:16, 11 s | A | Os 12 meses de delivery somando até R$ 5.040 |
| `07-quatro-potes.png` | 4:5 | B | Um salário, quatro potes |
| `08-valor-da-semana.png` | 4:5 | B | O valor por semana para o dia a dia |
| `11-produto-preco.png` | 4:5 | B | O que vem no plano e o preço |
| `v3-plano-por-dentro.mp4` | 9:16, 15 s | B | O plano de exemplo rolando no celular, terminando com o preço |

- `00-todos.png` é só para revisar os estáticos de uma vez.
- Os vídeos não têm áudio: escolha a música na biblioteca do Meta.
- Os números são de casos fictícios calculados pelo mesmo motor do site, e as peças dizem "exemplo".
- Para regerar: `npm run kit` (estáticos e imagens da Kiwify) e `npm run build && npm run kit:videos` (vídeos).

## 5. Regras que evitam reprovação na Meta

- **Não afirme nem insinue a situação financeira de quem vê o anúncio.** A Meta reprova "Você está endividado?",
  "Seu salário não dura o mês?" ou "Cansado de ficar no vermelho?". Fale do assunto, não da pessoa: "Em que dia o
  salário acaba?", "Quando o dinheiro costuma acabar?". Os textos acima seguem essa regra.
- **Nada de promessa de resultado** ("saia do aperto em 30 dias", "sobra dinheiro todo mês") nem de ganho
  ("renda extra", "fique rico").
- **Não use** escassez nem prazo que não seja verdadeiro, depoimento inventado ou "de/por" falso. O "de R$ 29,90
  por R$ 19,90" do upsell é verdadeiro: o plano do Fôlego custa R$ 29,90 fora da página de obrigado.
- Se mudar um número nos criativos, mantenha "exemplo" ou "caso fictício" na peça.
- Categoria especial: o Mês Inteiro não oferece crédito. Se o gerenciador pedir uma categoria de serviços
  financeiros, siga o que ele indicar.

## 6. Com o pixel ligado (`META_PIXEL_ID` no `config.js`)

O site manda `PageView`, `Lead` (começou o quiz), `CompleteRegistration` (terminou), `InitiateCheckout` (clicou em
comprar) e `Purchase` (o plano saiu, R$ 29,90). Para otimizar por venda, use `Purchase`; com poucas vendas no
começo, `CompleteRegistration` aprende mais rápido. Se também configurar o pixel na Kiwify, deixe a compra contada
em um lugar só.

Independente do pixel, o servidor conta o funil (`mesinteiro.py funil 7`): abriu a página, começou o quiz, viu a
primeira conta, viu o resultado, usou o simulador, clicou em comprar, abriu o plano, viu e aceitou o upsell.
