# Kit de lançamento do Mês Inteiro

Tudo aqui é gerado por `npm run kit` (`scripts/gerar-kit.cjs`), a partir de
HTML com as fontes e as cores do site. Para mudar um texto ou um número, edite
o script e rode de novo.

| Arquivo | Onde usar |
| --- | --- |
| `kiwify/produto-1000x1000.png` | Imagem do produto na Kiwify |
| `kiwify/banner-checkout-pc-1200x400.png` | Banner do checkout (computador) |
| `kiwify/banner-checkout-celular-1080x540.png` | Banner do checkout (celular) |
| `criativos/01` a `10` (1080x1350, 4:5) | Anúncios no feed do Instagram e do Facebook |
| `criativos/00-todos.png` | Só para revisar os 10 de uma vez |
| `../app/opengraph-image.png` | Prévia do link no WhatsApp e nas redes (automática) |

Os números dos criativos são de casos fictícios calculados pelo mesmo motor
do site, e as peças dizem "exemplo" onde aparecem.

## Link dos anúncios

Use o mesmo link em todos, trocando só o `utm_content` pelo número do criativo.
Assim o `mesinteiro-admin leads` mostra qual criativo trouxe cada pessoa.

```
https://mesinteiro.folegofinanceiro.shop/?utm_source=meta&utm_medium=pago&utm_campaign=mesinteiro-teste&utm_content=01
```

Para o teste contra o Fôlego, use a mesma estrutura lá com
`utm_campaign=folego-teste`, o mesmo orçamento e o mesmo público.

## Textos sugeridos

Botão: **Saiba mais**. Descrição (quando houver): *Quiz gratuito de 3 minutos.*

| Criativo | Título | Texto principal |
| --- | --- | --- |
| 01 · que dia acaba | Em que dia o salário acaba? | Contas fixas saem no começo do mês. O dia a dia vai saindo aos poucos. Em algum dia, o dinheiro acaba. O quiz gratuito do Mês Inteiro faz essa conta em 3 minutos e mostra para onde vai cada real, sem pedir CPF nem cartão. |
| 02 · gasto invisível | O gasto que não aparece no extrato | Pelas contas, o dinheiro duraria até o dia 28. Na vida real, acaba no dia 15. A diferença tem nome: gasto invisível. O quiz gratuito compara as contas com o dia em que o dinheiro acaba e mostra quanto sai sem ninguém ver. |
| 03 · quiz no celular | O quiz gratuito do salário | Uma pergunta por tela, quase todas de um toque. No fim: em que dia o dinheiro acaba, para onde ele vai e por onde começar. Leva uns 3 minutos. |
| 04 · delivery no ano | R$ 5.040 por ano em delivery | R$ 420 por mês parece pouco. No ano, é mais que um salário de R$ 3.200. O quiz gratuito mostra os gastos do dia a dia que mais pesam, com o custo no ano. |
| 05 · busca | Por que o dinheiro acaba antes do mês? | A resposta muda de casa para casa. O quiz gratuito do Mês Inteiro faz as contas com os números de cada um e mostra o que mais pesa. |
| 06 · enquete | Quando o dinheiro costuma acabar? | Primeira semana, metade do mês, última semana ou dia 30? Em 3 minutos, o quiz gratuito mostra em que dia ele acaba e por quê. |
| 07 · quatro potes | Um salário, quatro potes | Contas fixas, parcelas, dia a dia e futuro: dividir o salário no dia em que ele entra é o que faz o mês fechar. O começo é o quiz gratuito, que mostra para onde o dinheiro vai hoje. |
| 08 · valor da semana | O valor por semana | Quando o dia a dia vira um valor por semana, o dinheiro do dia 25 para de ser gasto no dia 5. O primeiro passo é o quiz gratuito: 3 minutos, sem CPF e sem cartão. |
| 09 · tipos de mês | Todo mês tem um tipo | Dinheiro que some, fim de mês no cartão, salário com dono, vazamento miúdo... O quiz gratuito dá nome a cada caso e mostra por onde começar. |
| 10 · a conta | A conta que quase ninguém faz | Salário, menos contas fixas e parcelas, dividido pelo que sai por dia: é assim que se descobre em que dia o dinheiro acaba. O quiz gratuito faz essa conta em 3 minutos. |

## Regras que evitam reprovação na Meta

- **Não afirme nem insinue a situação financeira de quem vê o anúncio.** A
  Meta reprova textos como "Você está endividado?", "Seu salário não dura o
  mês?" ou "Cansado de ficar no vermelho?". Fale do assunto, não da pessoa:
  "Em que dia o salário acaba?", "Quando o dinheiro costuma acabar?". Os
  textos acima seguem essa regra.
- **Nada de promessa de resultado** ("saia do aperto em 30 dias", "sobre
  dinheiro todo mês") nem de ganho ("renda extra", "fique rico").
- **Os números dos criativos são exemplos**: se mudar algum, mantenha a
  indicação "exemplo" ou "caso fictício" na peça.
- Categoria especial de anúncio: o Mês Inteiro não oferece crédito; se a Meta
  pedir, a categoria de **serviços financeiros** pode ser exigida em alguns
  países. Siga o que o gerenciador indicar na hora de publicar.

## Com o pixel ligado

Com `META_PIXEL_ID` no `.env` da VPS, o site manda: `PageView`, `Lead`
(começou o quiz), `CompleteRegistration` (terminou), `InitiateCheckout`
(clicou em comprar) e `Purchase` (o plano saiu, R$ 29,90). Para otimizar a
campanha por venda, escolha o evento `Purchase`; com poucas vendas no começo,
`CompleteRegistration` aprende mais rápido. Se também configurar o pixel na
Kiwify, deixe a compra contada em um lugar só, para não contar duas vezes.
