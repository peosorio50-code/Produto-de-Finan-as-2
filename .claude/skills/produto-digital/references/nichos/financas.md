# Nicho: finanças (dívidas, dinheiro, renda)

**Marca:** **Fôlego Financeiro** (`folegofinanceiro.shop`), com dois produtos em teste lado a lado, os dois entregues como página:

| Produto | Site (Pages) | Módulo / tabelas | Trecho na Kiwify | Remetente | Guia |
|---|---|---|---|---|---|
| **Fôlego**: plano de quitação de dívidas | `folegofinanceiro.shop` (`folego`) | `folego.py` / `folego_*` | `folego` | `FOLEGO_REMETENTE` | `../exemplos/guia-folego-financas.md` |
| **Mês Inteiro**: plano do salário (o dinheiro que acaba antes do mês) | `mesinteiro.folegofinanceiro.shop` (`mesinteiro`) | `mesinteiro.py` / `mesinteiro_*` | `mes inteiro` (bump: `acompanhamento`) | `MESINTEIRO_REMETENTE` (`plano@folegofinanceiro.shop`) | `../exemplos/guia-mesinteiro-financas.md` |

Mesmo preço (R$ 29,90) de propósito: o teste compara o problema, não o preço. O upsell do Mês Inteiro é uma oferta
de R$ 19,90 no produto do Fôlego, só para quem mostrou sinal de dívida no quiz.

## Regras
- **Copy financeira honesta:**
  - não prometa limpar o nome, quitar em X meses, descontos garantidos nem renda;
  - número calculado é sempre "estimativa".
- **O produto orienta. Não é consultoria financeira nem jurídica,** e o texto precisa dizer isso.
- **IA:**
  - usa só os números que vêm do sistema;
  - não inventa taxa, prazo nem percentual de desconto;
  - não recomenda investimento, aposta, agiota nem crédito novo (a não ser para trocar dívida cara por barata);
  - não indica empresas pelo nome, só canais públicos: Registrato, Serasa Limpa Nome, consumidor.gov.br, Procon, Defensoria, CRAS;
  - pode citar a Lei do Superendividamento e as regras do cartão e do cheque especial **só** do jeito que estão no guia do Fôlego.
- **Meta:**
  - "situação financeira vulnerável" é atributo pessoal: nada de "Você está endividado?" ou "Seu nome está sujo?";
  - fale da situação ("Dívida no cartão cresce todo mês…"), sem apontar para o leitor.
- **Acolhimento:**
  - sem sermão nem julgamento;
  - situação muito pesada: CVV 188, uma vez;
  - apostas: autoexclusão e Jogadores Anônimos.
- **E-mail:** o Fôlego e o Mês Inteiro nunca usam o "responder para" do Meu Santo (marca separada).
