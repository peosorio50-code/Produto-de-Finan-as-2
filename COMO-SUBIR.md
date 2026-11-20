# Como subir o Mês Inteiro

O Mês Inteiro roda **ao lado do Fôlego**: mesma VPS, mesmo Cloudflare Tunnel,
mesmo domínio (`folegofinanceiro.shop`), mesma conta Kiwify. Cada um tem o seu
serviço, a sua porta, o seu banco e o seu webhook, e um não enxerga as vendas
do outro.

| | Fôlego | Mês Inteiro |
| --- | --- | --- |
| Endereço | `folegofinanceiro.shop` | `mesinteiro.folegofinanceiro.shop` |
| Serviço / porta | `folego` / 8020 | `mesinteiro` / 8021 |
| Pasta na VPS | `/opt/folego` | `/opt/mesinteiro` |
| Comando de administração | `folego-admin` | `mesinteiro-admin` |
| Referência dos pedidos | `fl-...` | `mi-...` |
| Produto na Kiwify reconhecido por | `folego` | `mes inteiro` |

Ordem: **subdomínio → servidor (VPS) → Kiwify → IA → e-mail → testes**. Cada
comando diz em qual terminal rodar:

- **Seu computador**: onde está o `mesinteiro-vps.zip`.
- **VPS**: `root@srv2014776` (a mesma do Fôlego e do Meu Santo Protetor).

Regras da VPS (do manual do Carlos): nunca reiniciar o Docker, nunca reiniciar
a máquina, nunca rodar `do-release-upgrade`. O instalador segue isso: ele só
mexe em `/opt/mesinteiro` e no serviço `mesinteiro`. Não toca no Fôlego.

Chaves (Anthropic, Kiwify, Resend) **nunca** vão para o chat, para o WhatsApp
ou para documento: são coladas direto no `/opt/mesinteiro/.env`, na VPS.

---

## 1. Subdomínio

O domínio `folegofinanceiro.shop` já está no Cloudflare (foi colocado lá para
o Fôlego). Falta só apontar o subdomínio para a porta do Mês Inteiro.

1. No Cloudflare: **Zero Trust → Networks → Tunnels → `mapadaalma-vps` →
   Public Hostname → Add a public hostname**.
   - Subdomain: `mesinteiro` · Domain: `folegofinanceiro.shop`
   - Service: `HTTP` e `localhost:8021`
2. O Cloudflare cria o DNS do subdomínio sozinho. Não precisa mexer em
   nameservers.
3. Se o túnel **não** aparecer como editável no painel (ele usa um arquivo
   `config.yml` na VPS), quem configurou o túnel precisa acrescentar a regra
   abaixo **antes** da última linha (a do `http_status:404`) e reiniciar o
   `cloudflared`. Isso derruba por alguns segundos os outros sites do túnel:
   faça num horário calmo.

   ```yaml
   - hostname: mesinteiro.folegofinanceiro.shop
     service: http://localhost:8021
   ```

> Quer outro nome de subdomínio? Troque aqui, em `SITE_URL` no `.env` e na
> página de obrigado da Kiwify. O código não depende do nome.

---

## 2. Servidor (VPS)

**Seu computador** (na pasta do projeto):

```bash
npm run empacotar
```

```bash
scp -o ServerAliveInterval=20 mesinteiro-vps.zip root@2.25.252.204:/root/
```

**VPS:**

```bash
cd /root && rm -rf mesinteiro && unzip -q mesinteiro-vps.zip && bash mesinteiro/instalar.sh
```

Na primeira vez, ele cria o usuário `mesinteiro`, o `/opt/mesinteiro/.env` com
um segredo novo para o webhook, e termina mostrando `{"ok":true,...}`. Se a
porta 8021 estiver ocupada por outro programa, ele para sem iniciar nada e
avisa o que trocar.

Agora preencha a configuração:

**VPS:**

```bash
nano /opt/mesinteiro/.env
```

Preencha por enquanto: `CONTATO_EMAIL` e `ANTHROPIC_API_KEY` (passo 4).
`KIWIFY_CHECKOUT` e `KIWIFY_TOKEN` vêm no passo 3. O `SITE_URL` já vem
preenchido com `https://mesinteiro.folegofinanceiro.shop`. Salve (Ctrl+O,
Enter, Ctrl+X) e reinicie:

**VPS:**

```bash
systemctl restart mesinteiro && sleep 4 && curl -s localhost:8021/api/saude
```

Abra `https://mesinteiro.folegofinanceiro.shop` no celular: o quiz tem que
aparecer. Confira também que o Fôlego continua no ar em
`https://folegofinanceiro.shop`.

---

## 3. Kiwify (quem tem acesso: Carlos)

**3.1 Produto**

- Nome do produto com **"Mês Inteiro"** e **sem a palavra "Fôlego"** (ex.:
  "Mês Inteiro: plano do salário"). O servidor do Mês Inteiro só reconhece
  avisos de produtos com "mes inteiro" no nome, e o servidor do Fôlego
  reconhece os dele pela palavra "folego": se o nome tiver "Fôlego", o Fôlego
  pode achar que a venda é dele.
- Preço **R$ 29,90**, pagamento único, Pix e cartão. Garantia de 7 dias.
  (Mesmo preço do Fôlego, de propósito: assim o teste compara só o produto.)
- Checkout com as cores do Mês Inteiro: fundo `#FFFFFF`, botão `#0E7A4E`.
- **Página de obrigado** (URL externa): `https://mesinteiro.folegofinanceiro.shop/plano`.
- Confira o nome da loja que aparece no checkout (o mesmo cuidado do Fôlego).

- **Imagens**: use `kit/kiwify/produto-1000x1000.png` como imagem do produto e
  os dois banners de `kit/kiwify/` no checkout (computador e celular).

O código do checkout é o trecho depois de `pay.kiwify.com.br/`. Vai em
`KIWIFY_CHECKOUT` no `.env`.

**3.2 Webhook**

O endereço do webhook tem o segredo dentro. Para não passar por chat, gere na
VPS e cole direto na Kiwify:

**VPS:**

```bash
echo "$(grep ^SITE_URL= /opt/mesinteiro/.env | cut -d= -f2-)/api/kiwify/$(grep ^KIWIFY_WEBHOOK_SEGREDO= /opt/mesinteiro/.env | cut -d= -f2-)"
```

Na Kiwify, em **Apps → Webhooks → Criar webhook** (um webhook novo, separado
do Fôlego):

- URL: o endereço que o comando mostrou.
- Produto: **só o do Mês Inteiro**.
- Eventos: compra aprovada, compra recusada, Pix gerado, boleto gerado,
  carrinho abandonado, compra reembolsada e chargeback.
- Copie o **token** que a Kiwify mostra e cole em `KIWIFY_TOKEN` no `.env`.

**3.3 Os outros webhooks da conta**

- O webhook do **Fôlego** deve continuar marcado só para o produto do Fôlego.
  Se ele estiver para todos os produtos, nada quebra (o Fôlego ignora o
  Mês Inteiro pelo nome), mas é mais limpo separar.
- O webhook do **Meu Santo Protetor** está marcado para todos os produtos:
  vale a mesma decisão tomada no Fôlego (trocar para só os produtos católicos,
  ou confirmar que o `servidor.py` ignora produto desconhecido sem mandar
  e-mail nenhum).

**3.4 Reiniciar com tudo preenchido**

**VPS:**

```bash
systemctl restart mesinteiro && sleep 4 && curl -s localhost:8021/api/saude
```

Tem que aparecer `"pagamento":"kiwify"`, `"webhookKiwify":true`,
`"assinaturaKiwify":true`, `"ia":true` e `"siteUrl":true`.

---

## 4. IA (créditos da Anthropic)

1. Em **platform.claude.com → API keys**, crie uma chave só para o Mês Inteiro
   (ex.: "mesinteiro-vps"), na mesma conta do Fôlego. Chave separada mostra o
   gasto de cada produto à parte.
2. Cole em `ANTHROPIC_API_KEY` no `/opt/mesinteiro/.env` e reinicie o serviço.
3. A **recarga automática** da conta (configurada para o Fôlego) vale para as
   duas chaves. Confira que ela continua ligada.
4. Custo esperado: de US$ 0,10 a 0,25 por plano.

Se o crédito acabar, o comprador ainda recebe o plano (na versão escrita por
regras), e o `mesinteiro-admin status` avisa.

---

## 5. E-mail: link do plano e recuperação de venda (recomendado)

Se o domínio `folegofinanceiro.shop` já foi verificado na Resend para o
Fôlego, não precisa verificar de novo: o mesmo domínio manda e-mail com outro
nome de remetente.

1. Use a chave da Resend do Fôlego ou crie uma nova, e cole no `.env`:
   - `RESEND_API_KEY=` a chave
   - `EMAIL_REMETENTE=Mês Inteiro <plano@folegofinanceiro.shop>`
2. Reinicie o serviço. O `/api/saude` passa a mostrar `"email":true` e
   `"recuperacao":true`.

Com isso, liga também a **recuperação de venda**: quem faz o quiz e não compra
recebe até 3 e-mails (1 h, 24 h e 72 h depois), mandados pelo cron de hora em
hora que o instalador já deixou pronto. Para testar na hora, depois de fazer o
quiz com o seu e-mail e esperar 1 hora:

**VPS:**

```bash
mesinteiro-admin recuperar
```

Tem que responder `"enviados":1`. O link do e-mail abre o resultado em
qualquer aparelho, e o "não quero mais receber" tira o e-mail da lista.

Se o domínio ainda não foi verificado, siga o passo 5 do `COMO-SUBIR.md` do
Fôlego (SPF, DKIM e DMARC no Cloudflare) e volte aqui.

---

## 6. Pixel da Meta (opcional)

1. No Gerenciador de Eventos da Meta, copie o número do pixel (só dígitos).
2. Cole em `META_PIXEL_ID` no `/opt/mesinteiro/.env` e reinicie o serviço.
3. Abra o site, faça o quiz e confira no Gerenciador de Eventos: `PageView`,
   `Lead`, `CompleteRegistration`, `InitiateCheckout` e, depois de uma compra,
   `Purchase`.

Textos e regras dos anúncios: [kit/ANUNCIOS.md](kit/ANUNCIOS.md).

---

## 7. Testes antes de anunciar

1. No celular, faça o quiz até o fim com o seu e-mail.
2. Clique em comprar e pague de verdade com Pix (dá para pedir reembolso depois).
3. A página de obrigado tem que mostrar "Montando seu plano" e, em cerca de um
   minuto, o plano.
4. **VPS:**

   ```bash
   mesinteiro-admin buscar SEU-EMAIL
   ```

   A compra tem que estar `pago` e ligada a um pedido (`mi-...`).
5. **VPS** (a compra do Mês Inteiro não pode aparecer no Fôlego):

   ```bash
   folego-admin buscar SEU-EMAIL
   ```

6. Ao vivo, enquanto testa:

   **VPS:**

   ```bash
   journalctl -u mesinteiro -f | grep --line-buffered "kiwify\|\[ia\]\|\[plano\]"
   ```

7. Peça o reembolso na Kiwify e confira se a compra vira `reembolsado`.

Se aparecer `assinatura não confere` no log, o token está errado. Confira o
`KIWIFY_TOKEN`. Para destravar na hora, deixe o `KIWIFY_TOKEN` vazio e reinicie:
o segredo do endereço continua protegendo o webhook.

---

## 8. Comparar os dois produtos

Os dois funis gravam os mesmos eventos, com os mesmos nomes. Para comparar:

1. Anuncie os dois com orçamento parecido e marque os links com UTM, por
   exemplo `?utm_source=meta&utm_campaign=folego-teste` e
   `?utm_source=meta&utm_campaign=mesinteiro-teste`.
2. Depois de alguns dias, na **VPS**:

   ```bash
   folego-admin status
   ```

   ```bash
   mesinteiro-admin status
   ```

3. Compare, para cada um: custo por lead (do gerenciador de anúncios),
   `quiz_concluido ÷ quiz_iniciado`, `checkout_iniciado ÷ quiz_concluido` e
   `compra_aprovada ÷ quiz_concluido`. O preço é o mesmo, então a venda por
   lead já diz qual produto rende mais.
4. Atenção: o Mês Inteiro tem recuperação por e-mail, pixel e simulador no
   resultado, e o Fôlego (ainda) não. Para comparar só o problema que cada um
   resolve, leve essas melhorias para o Fôlego também, ou compare olhando só
   as vendas de quem comprou sem passar pelos e-mails (`utm_source` diferente
   de `email`).

---

## Dia a dia

Todos na **VPS**:

```bash
mesinteiro-admin status
```

```bash
mesinteiro-admin buscar EMAIL
```

```bash
mesinteiro-admin leads 30 > /root/leads-mesinteiro.csv
```

O CSV tem dados pessoais (LGPD): baixe, use e apague com
`rm /root/leads-mesinteiro.csv`.

Para liberar à mão um pedido que não chegou pelo webhook (depois de conferir o
pagamento na Kiwify), use a referência `mi-...` que o `buscar` mostra:

```bash
mesinteiro-admin liberar mi-XXXXXXXXXXXX-XXXXXXXXXXXXXXXX
```

O backup do banco roda todo dia às 4h37 em `/opt/mesinteiro/backups` (guarda
14). O do Fôlego roda às 4h17, para os dois não rodarem juntos.

## Atualizar

Mesmo caminho do passo 2: `npm run empacotar`, `scp` do zip novo e
`bash mesinteiro/instalar.sh`. O `.env` e o banco ficam como estão.

Para voltar à versão anterior:

**VPS:**

```bash
cd /opt/mesinteiro && mv app app.quebrado && mv app.anterior app && systemctl restart mesinteiro
```
