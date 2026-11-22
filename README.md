# Mês Inteiro

Quiz gratuito sobre o salário, que mostra em que dia o dinheiro acaba e para onde ele vai, e oferece um plano do mês
personalizado (R$ 29,90), com texto escrito por IA em cima de números calculados por regras.

É o segundo produto do **Fôlego Financeiro**, feito para testar lado a lado com o
[Fôlego](https://github.com/peosorio50-code/Produto-de-Finan-as) (plano de quitação de dívidas): mesmo funil, mesmo
preço, mesma infraestrutura; muda o problema. Segue a skill **produto-digital** (cópia em `.claude/skills/`).

```
Anúncio → quiz (contato primeiro) → resultado grátis → oferta → Kiwify (+ bump R$ 12,90)
       → /plano = obrigado (upsell de 1 clique) → plano na tela, PDF, lembretes no celular, link por e-mail
```

| Parte | Onde | O que faz |
|---|---|---|
| **Site** (`app/`, `components/`, `lib/`) | Next.js estático (`out/`) no Cloudflare Pages, projeto `mesinteiro`, `mesinteiro.folegofinanceiro.shop` | Quiz, resultado, checkout, obrigado e o plano montado no navegador. Configuração em `public/config.js`. |
| **Servidor** (`servidor/mesinteiro.py`) | Módulo do servidor do Meu Santo Protetor (`/opt/mapadaalma`, `api.mapadaalma.online/api/mesinteiro`) | Pedidos, Kiwify, IA, e-mails, recuperação de vendas, lembretes e acompanhamento. Tabelas `mesinteiro_*`. |
| **`servidor/servidor.py`** | v21 = v20 + 4 ganchos | CORS, rotas, startup e o desvio do webhook da Kiwify. |
| **Kit** (`kit/`) | Kiwify e Meta | Imagens do produto e do bump, banners, 12 criativos 4:5 e 3 vídeos 9:16. |

## Documentos

- [docs/COMO-SUBIR.md](docs/COMO-SUBIR.md): Kiwify → servidor → e-mail → site → teste → anúncios, com o terminal de
  cada comando e o `md5sum` antes de substituir o `servidor.py`.
- [docs/ESTRATEGIA.md](docs/ESTRATEGIA.md): por que este produto, funil, ofertas, conta da venda e como comparar
  com o Fôlego.
- [docs/TEXTOS-KIWIFY-E-ANUNCIOS.md](docs/TEXTOS-KIWIFY-E-ANUNCIOS.md): nomes exatos, descrições, legenda única e
  a tabela dos criativos.
- [docs/GUIA-CLAUDE-MESINTEIRO.md](docs/GUIA-CLAUDE-MESINTEIRO.md): o guia para o Claude (arquitetura, ganchos,
  comandos, regras).
- [CONTEXTO.md](CONTEXTO.md): regras do cálculo, tipos de mês, IA e decisões que não estão óbvias no código.

## Comandos

```bash
npm ci
npm run dev                          # site em http://localhost:3000 (a API padrão é a de produção)
npm test                             # motor do quiz, ia-dados e o exemplo do servidor
npm run typecheck
python3 testes/teste_mesinteiro.py   # servidor.py v21 de verdade + TestClient (pip install fastapi httpx anthropic)
npm run kit                          # estáticos e imagens da Kiwify
npm run build && npm run kit:videos  # vídeos 9:16 (usa o plano de exemplo do site em out/)
npm run entregas                     # entregas/: site, atualização do servidor e kit (zips sem .env)
```

## Regras

- Chaves e tokens ficam só no `/opt/mapadaalma/.env` da VPS, nunca no chat nem em arquivo. Zips sempre sem `.env`.
- Nada de servidor Node, Docker, porta nova ou túnel novo: o Mês Inteiro é um módulo do servidor que já existe.
- No `servidor.py`, só os 4 ganchos. Os produtos que já vendem não podem quebrar (o teste em Python confere).
- Compra paga nunca fica sem entrega: se a IA falhar, o plano sai na versão padrão.
- Material educativo: sem promessa de resultado, e os valores são estimativas.
