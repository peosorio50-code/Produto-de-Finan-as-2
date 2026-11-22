# Mês Inteiro: como subir

Funciona igual aos outros produtos: **site no Cloudflare Pages + rotas no servidor do Meu Santo** (`/opt/mapadaalma`).
Não existe mais app Node na VPS, porta 8021, serviço `mesinteiro` nem túnel novo.

> **Não instale o `mesinteiro-vps.zip` antigo** (aquele com Next na porta 8021, `/opt/mesinteiro` e um hostname
> no túnel). Ele foi substituído por este kit. Se você chegou a instalar, veja a Parte 0.

Ordem: **Kiwify → servidor → e-mail → site → teste → anúncios.** Cada comando diz em qual terminal rodar:

- **Mac** = `carlosaugusto@macbook`, na pasta onde você baixou os arquivos de `entregas/`.
- **VPS** = `root@srv2014776`.

Regras da VPS: ela é compartilhada. **Nunca** reinicie o Docker nem a máquina e nunca rode `do-release-upgrade`
(ignore "System restart required"). Reinicie só com `systemctl restart mapadaalma`.
Chaves e tokens (Anthropic, Kiwify, Resend, o segredo do webhook) **nunca** vão para o chat, WhatsApp ou
documento: são colados direto no `/opt/mapadaalma/.env`.

Arquivos (`entregas/`):

| Arquivo | O que é |
|---|---|
| `atualizacao-servidor-21-mesinteiro.zip` | `servidor.py` v21 (= v20 + 4 ganchos do Mês Inteiro), `mesinteiro.py` e `mesinteiro_exemplo.json`. Sem `.env`. |
| `site-mesinteiro.zip` | O site pronto para o Cloudflare Pages (com o `config.js` para editar) |
| `kit-mesinteiro.zip` | Imagens da Kiwify, 12 criativos 4:5, 3 vídeos 9:16 e os textos |

---

## Parte 0: só se você instalou a versão antiga (porta 8021)

Pule esta parte se nunca instalou o `mesinteiro-vps.zip`.

1. **VPS:** desligue o serviço antigo (não mexe em mais nada):
   ```
   systemctl disable --now mesinteiro 2>/dev/null; systemctl status mesinteiro --no-pager | head -3
   ```
   Tem que aparecer `inactive` ou `could not be found`. A pasta `/opt/mesinteiro` pode ficar (é só backup) ou ser
   apagada depois que tudo estiver funcionando.
2. **Cloudflare → Zero Trust → Networks → Tunnels** → o túnel do Fôlego → **Public Hostname**: se existir
   `mesinteiro.folegofinanceiro.shop`, apague **só essa linha**. Sem isso, o Pages não consegue usar o subdomínio.
3. **Kiwify:** se você criou um webhook apontando para `mesinteiro.folegofinanceiro.shop/api/kiwify/...`, apague-o.
   O webhook certo é o da Parte 1.

---

## Parte 1: Kiwify

1. **Produto principal** (textos exatos em `TEXTOS-KIWIFY-E-ANUNCIOS.md`):
   - Nome: **`Mês Inteiro: plano do salário`**. O servidor reconhece a venda pelo trecho **"mes inteiro"**.
     Não use "Fôlego", "acompanhamento" nem nomes de produtos do Meu Santo no nome.
   - R$ 29,90, pagamento único, Pix e cartão, garantia de 7 dias.
   - Página de obrigado (redirecionamento depois da compra): `https://mesinteiro.folegofinanceiro.shop/plano`
   - Imagem e banners: `kit/kiwify/`.
2. **Order bump:** crie o produto **`Acompanhamento do Mês Inteiro: 4 semanas por e-mail`** (R$ 12,90) e adicione
   como order bump no checkout do principal. O servidor separa o bump pelo trecho **"acompanhamento"**.
3. **Webhook** (o mesmo endereço do Meu Santo e do Fôlego). Para não colar o segredo em lugar nenhum, gere o endereço
   na VPS e copie de lá. **VPS:**
   ```
   echo "https://api.mapadaalma.online/webhook/kiwify/$(grep ^WEBHOOK_SEGREDO= /opt/mapadaalma/.env | cut -d= -f2-)"
   ```
   - **Jeito mais simples:** na Kiwify, abra o webhook que já usa esse endereço para o Fôlego e marque também os
     dois produtos do Mês Inteiro (todos os eventos). O token continua o mesmo.
   - **Ou** crie um webhook novo com esse endereço, só com os 2 produtos do Mês Inteiro e todos os eventos
     (compra aprovada, recusada, Pix gerado, carrinho abandonado, reembolso, chargeback). **Anote o token**: ele
     vai no `KIWIFY_TOKEN` (passo 6).
4. **Anote o código do checkout:** o trecho depois de `pay.kiwify.com.br/`. E o **link completo** do checkout
   (vai no `config.js` do site como reserva).
5. *(Opcional, pode ser depois)* **Upsell de 1 clique:** no produto do **Fôlego**, crie uma oferta de **R$ 19,90**
   (nome sugerido: "Upsell Mês Inteiro") e use o **Gerador de upsell**:
   - "Ao aceitar" e "Ao recusar": deixe em área de membros (a página define o destino).
   - Do código gerado, anote o trecho depois de `kiwify-upsell-trigger-` (o **ID**) e confira o `<script src="...">`.
   - Anote também o link do checkout dessa oferta (reserva para quem pagou no Pix).
   O nome do produto do Fôlego já tem "Fôlego": a venda vai para o `folego.py`, como sempre.

## Parte 2: servidor (VPS)

6. **Mac:**
   ```
   scp -o ServerAliveInterval=20 atualizacao-servidor-21-mesinteiro.zip root@2.25.252.204:/root/
   ```
7. **VPS.** Confira se o `servidor.py` de lá é o v20, o mesmo em que este pacote foi montado:
   ```
   cd /opt/mapadaalma && md5sum servidor.py
   ```
   - Tem que aparecer **`0cfbd62f7cc1b87e308623185cba50d8`**.
   - Se aparecer outro número, **pare aqui**: o `servidor.py` mudou depois do v20. Peça ao Claude para aplicar só os
     4 ganchos do Mês Inteiro (seção 5 do `GUIA-CLAUDE-MESINTEIRO.md`) no arquivo da VPS, sem trocar o arquivo inteiro.

   Se bateu, faça o backup e descompacte. **VPS:**
   ```
   cd /opt/mapadaalma && cp servidor.py /root/servidor-antes-21.py && unzip -o /root/atualizacao-servidor-21-mesinteiro.zip -d /opt/mapadaalma && (chown mapa:mapa servidor.py mesinteiro.py mesinteiro_exemplo.json 2>/dev/null; true) && md5sum servidor.py
   ```
   O último número tem que ser **`dd62de70bf3c471d6af7cea035a19ad5`** (o v21).
8. **VPS:** abra o `.env`:
   ```
   nano /opt/mapadaalma/.env
   ```
   Acrescente no fim (troque `CODIGO_DO_CHECKOUT` pelo código do passo 4 e o e-mail de atendimento pelo de vocês):
   ```
   MESINTEIRO_CHECKOUT=CODIGO_DO_CHECKOUT
   MESINTEIRO_REMETENTE=plano@folegofinanceiro.shop
   MESINTEIRO_CONTATO=EMAIL_DE_ATENDIMENTO
   ```
   - Só se você criou um webhook novo no passo 3: na linha `KIWIFY_TOKEN=...`, acrescente no fim uma vírgula e o
     token novo, sem espaço.
   - Salve: Ctrl+O, Enter, Ctrl+X.

   Opcionais (podem ficar de fora):
   - `MESINTEIRO_ANTHROPIC_API_KEY=` chave só do Mês Inteiro (vazio = usa a do Meu Santo). Se criar, deixe sem
     validade ("Never"), senão o plano para de sair com texto da IA quando ela vencer.
   - `MESINTEIRO_MODELO=claude-sonnet-5-5` para gastar menos (padrão: `claude-opus-5-5`).
   - `MESINTEIRO_RECUPERACAO=0` desliga os e-mails de recuperação.
9. **VPS:** reinicie só o serviço do Meu Santo e confira:
   ```
   systemctl restart mapadaalma && sleep 4 && curl -s localhost:8010/health && cd /opt/mapadaalma && ./venv/bin/python mesinteiro.py diagnostico
   ```
   Tem que aparecer `{"ok":true...}` e uma lista começando com `OK`. Os que importam: `MESINTEIRO_CHECKOUT`,
   `MESINTEIRO_REMETENTE` e a chave da Anthropic. `RESEND_API_KEY` já é a do Meu Santo.
   Confira também que os outros produtos continuam de pé:
   ```
   cd /opt/mapadaalma && ./venv/bin/python folego.py status | head -3 && journalctl -u mapadaalma -n 30 --no-pager | grep -i "erro\|exception" | tail -5
   ```
   A segunda parte não deve mostrar nada novo.

## Parte 3: e-mail (Resend)

10. O remetente é `plano@folegofinanceiro.shop`. Se o domínio `folegofinanceiro.shop` já está verificado na Resend
    (para o Fôlego), não há nada a fazer. Se não estiver: Resend → Domains → Add domain → `folegofinanceiro.shop` →
    copie os registros (SPF, DKIM) para o DNS do domínio no Cloudflare → Verify. Até verificar, o site funciona,
    mas os e-mails (link do plano, recuperação, acompanhamento) não saem.
    Os e-mails do Mês Inteiro nunca usam o "responder para" do Meu Santo: respondem para o `MESINTEIRO_CONTATO`.

## Parte 4: site (Cloudflare Pages)

11. **Mac:** descompacte o `site-mesinteiro.zip` (vira a pasta `site-mesinteiro`) e abra o arquivo **`config.js`**
    dela no TextEdit. Preencha entre as aspas:
    - `CONTATO_EMAIL`: o e-mail de atendimento (o mesmo do `MESINTEIRO_CONTATO`);
    - `CHECKOUT_RESERVA`: o link completo do checkout (passo 4);
    - `REENVIO: true` depois que o e-mail estiver funcionando (Parte 3);
    - `META_PIXEL_ID`: o número do pixel (só dígitos), se for usar;
    - `UPSELL_ID` e `CHECKOUT_UPSELL`, se fez o passo 5 (vazio = sem upsell).

    Salve (formato texto simples). Nada desse arquivo é segredo.
12. **Cloudflare → Workers e Pages → Criar → aba Pages → Fazer upload de ativos.** Nome do projeto: **`mesinteiro`**
    → Criar projeto → arraste a **pasta** `site-mesinteiro` → Implantar.
13. No projeto: **Domínios personalizados → Configurar domínio → `mesinteiro.folegofinanceiro.shop`** → Ativar.
    (Se der "registro já existe", volte à Parte 0, passo 2.)
14. Espere uns minutos e abra `https://mesinteiro.folegofinanceiro.shop`: a página inicial tem que aparecer.

Para mudar o `config.js` depois: edite o arquivo na pasta e, no projeto `mesinteiro`, **Criar implantação** →
arraste a pasta de novo.

## Parte 5: teste

15. **VPS:** mande para o seu e-mail os 11 e-mails de exemplo e um plano de teste com a IA de verdade:
    ```
    cd /opt/mapadaalma && ./venv/bin/python mesinteiro.py teste SEU_EMAIL ia
    ```
    Tem que aparecer "plano de teste: texto da IA em N s" e "11 de 11 enviados". Abra o link do plano que ele mostra.
16. Faça o quiz em `https://mesinteiro.folegofinanceiro.shop` até o resultado e clique em **Liberar meu plano**: tem
    que abrir o checkout da Kiwify com nome e e-mail preenchidos.
17. Compre (ou peça para alguém comprar), com e sem o bump. Depois do pagamento a Kiwify manda para `/plano`: a tela
    mostra "Montando seu plano" por cerca de 1 minuto (e o upsell, se configurado e se o quiz teve sinal de dívida)
    e depois o plano. O link também chega por e-mail.
18. **VPS:**
    ```
    cd /opt/mapadaalma && ./venv/bin/python mesinteiro.py status
    ```
    Deve mostrar `compras {'pago': 1}` e "planos com IA 1". Se aparecer "versão padrão (IA falhou)", rode
    `./venv/bin/python mesinteiro.py buscar EMAIL_DA_COMPRA`: a linha do pedido mostra o erro da IA. O plano já saiu
    com o texto padrão e a IA tenta de novo sozinha a cada 30 minutos.
19. Reembolse a compra de teste na Kiwify: o `buscar` passa a mostrar `reembolsado` e o link do plano para de abrir.

## Parte 6: anúncios

20. Textos, legenda única, link com UTM e a tabela dos criativos: `TEXTOS-KIWIFY-E-ANUNCIOS.md`.
21. Comece com os dois conjuntos (A: curiosidade, B: produto) com o mesmo orçamento do teste do Fôlego.

---

## Dia a dia (VPS)

```
cd /opt/mapadaalma && ./venv/bin/python mesinteiro.py status
```
```
cd /opt/mapadaalma && ./venv/bin/python mesinteiro.py funil 7
```
```
cd /opt/mapadaalma && ./venv/bin/python mesinteiro.py buscar EMAIL
```
- `refazer mi-...`: escreve de novo o texto da IA de um pedido.
- `liberar mi-...`: libera à mão um pedido que não chegou pelo webhook (depois de conferir o pagamento na Kiwify).
- `leads 30 > /root/leads-mesinteiro.csv`: tem dados pessoais (LGPD). Baixe, use e apague com
  `rm /root/leads-mesinteiro.csv`.
- Erros: `journalctl -u mapadaalma -n 100 --no-pager | grep mesinteiro`.
- A VPS não tem `sqlite3`: para consultas, use `python3`.

## Voltar à versão anterior (VPS)

```
cd /opt/mapadaalma && cp /root/servidor-antes-21.py servidor.py && systemctl restart mapadaalma && sleep 4 && curl -s localhost:8010/health
```
O `mesinteiro.py` pode ficar na pasta: sem os ganchos do v21, ninguém chama ele. As tabelas `mesinteiro_*` ficam no
banco e não atrapalham os outros produtos.
