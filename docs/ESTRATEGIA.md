# Mês Inteiro: estratégia

Segundo produto do **Fôlego Financeiro** (`folegofinanceiro.shop`), feito para testar lado a lado com o
**Fôlego** (plano de quitação de dívidas). Mesmo funil, mesmo preço, mesma infraestrutura; muda o problema.

| | Fôlego | Mês Inteiro |
|---|---|---|
| Problema | "Tenho dívidas e não sei por onde começar" | "O salário acaba antes do mês" |
| Público | Quem já tem dívida, muitas vezes atrasada | Quem vive no aperto todo mês, com ou sem dívida |
| Gancho do quiz | A situação das dívidas | Em que dia o salário acaba |
| Entrega paga | Fila das dívidas e mensagens para credores | Salário em quatro potes, valor por semana, calendário do mês |
| Site | `folegofinanceiro.shop` (Pages `folego`) | `mesinteiro.folegofinanceiro.shop` (Pages `mesinteiro`) |
| Servidor | `folego.py` em `/opt/mapadaalma` | `mesinteiro.py` em `/opt/mapadaalma` |

**Por que este problema:** o público é maior que o de endividados e com menos vergonha de clicar; a dor tem
um dia ("acaba no dia 20"), o que rende um gancho visual forte; o resultado grátis tem números que impressionam
(o gasto invisível, os vazamentos no ano); e o quiz não pede dados que a pessoa não sabe (saldo e juros de cada
dívida), então é mais fácil de terminar.

## Funil

```
Anúncio (Meta) → quiz (contato primeiro, uma pergunta por tela, prévia da conta no meio)
  → resultado grátis (tipo de mês, calendário, vazamentos, primeiro passo, simulador "E se?")
  → oferta R$ 29,90 → Kiwify (?sck=<pedido>&name&email&utm_*) → bump R$ 12,90 (acompanhamento)
  → /plano = obrigado: upsell de 1 clique (plano do Fôlego, R$ 19,90, só para quem tem sinal de dívida)
  → plano montado na tela (IA + regras), PDF pela impressão, lembretes no calendário, link por e-mail
```

Recuperação própria (servidor): quiz sem compra (1 h, 24 h, 72 h), Pix pendente (60 min), cartão recusado
(15 min), carrinho abandonado (90 min), compra sem quiz (logo depois, ~20 h, ~68 h) e upsell do Fôlego sem o
quiz do Fôlego (~10 min, ~20 h, ~68 h). No máximo um e-mail de venda a cada 12 h por pessoa, e todos com
descadastro de um clique.

## Ofertas

| Oferta | Preço | Onde | Entrega |
|---|---|---|---|
| **Mês Inteiro: plano do salário** | R$ 29,90 | Checkout | Plano na página `/plano`, link por e-mail |
| **Acompanhamento do Mês Inteiro: 4 semanas por e-mail** (bump) | R$ 12,90 | Checkout | 4 e-mails às segundas, 8 h (valor da semana + foco do desafio) e o fechamento do mês |
| **Plano do Fôlego** (upsell, oferta nova no produto do Fôlego) | R$ 19,90 (normal R$ 29,90) | Página de obrigado, 1 clique | O Fôlego entrega depois do quiz dele com o mesmo e-mail |

O upsell é um produto que já existe e já é entregue pelo servidor (o `folego.py`): nada novo para manter.
Ele só aparece para quem respondeu no quiz que fecha o mês no crédito, paga o mínimo da fatura, atrasa a fatura
ou tem parcelas acima de 20% da renda.

## Conta da venda (Kiwify: ~8,99% + R$ 2,49 por venda)

| Situação | Cliente paga | Taxa Kiwify | Fica |
|---|---|---|---|
| Só o plano | R$ 29,90 | R$ 5,18 | **R$ 24,72** |
| Plano + bump (mesmo pedido) | R$ 42,80 | R$ 6,34 | **R$ 36,46** |
| Upsell do Fôlego (outro pedido) | R$ 19,90 | R$ 4,28 | **R$ 15,62** |

- **Empate sem bump nem upsell:** cada venda pode custar até ~**R$ 24,70** em anúncio. ROAS de empate (o que o
  Meta mostra, se ele contar só o plano) ≈ **1,21**.
- **Com 30% de bump e 10% de upsell**, a venda média deixa ~R$ 24,72 + 0,3 × 11,74 + 0,1 × 15,62 ≈ **R$ 29,80**:
  o CPA de empate sobe para ~R$ 29,80.
- Custo da IA por plano: veja no console da Anthropic depois das primeiras vendas. Para gastar menos,
  `MESINTEIRO_MODELO=claude-sonnet-5-5` no `.env`.

## Como comparar com o Fôlego

1. Mesmo orçamento, mesmo público, mesmas datas. Links com `utm_campaign=mesinteiro-teste` e `folego-teste`,
   e `utm_content` com o nome do criativo.
2. Na VPS (`root@srv2014776`), depois de alguns dias:
   ```
   cd /opt/mapadaalma && ./venv/bin/python mesinteiro.py status && ./venv/bin/python mesinteiro.py funil 7
   ```
   ```
   cd /opt/mapadaalma && ./venv/bin/python folego.py status
   ```
3. Compare, para cada um: custo por lead (Meta), quiz concluído ÷ iniciado, checkout ÷ quiz concluído e
   compras ÷ quiz concluído. Como o preço é o mesmo, a venda por lead já diz qual rende mais.
4. O Mês Inteiro tem recuperação por e-mail, simulador e bump; o Fôlego, não. Para comparar só o problema,
   olhe também as vendas que **não** vieram dos e-mails (`status` mostra quantas vieram).

## O que testar depois (uma coisa por vez)

1. Criativos: conjunto A (curiosidade) × conjunto B (produto e preço). Deixe o vencedor e troque um por vez.
2. Preço: se o Mês Inteiro ganhar, R$ 29,90 × R$ 37.
3. Bump: R$ 12,90 × R$ 9,90 (a taxa de aceite costuma pesar mais que o preço).
4. Upsell: mostrar para todos × só para quem tem sinal de dívida (hoje).

Em queda de vendas, confira checkout e rastreamento (`mesinteiro.py status`, compras pagas e erros da IA) antes
de mexer em criativo.

## O que só dá para confirmar em produção

- Como a Kiwify manda o bump: no mesmo aviso (lista `order_bumps`) ou em aviso separado. O servidor trata os dois.
- O código do upsell de 1 clique (o `<script>` e o ID). Confira com o que o "Gerador de upsell" gerar.
- Se o aviso do upsell traz o `sck` do pedido original (o servidor não depende disso: liga pelo e-mail).
- A primeira geração real da IA com a chave da VPS (`mesinteiro.py teste SEU_EMAIL ia`).
