#!/usr/bin/env bash
# Monta a pasta entregas/ (zips sempre sem .env):
#   site-mesinteiro.zip                    o site estático (out/) para o Cloudflare Pages, projeto mesinteiro
#   atualizacao-servidor-21-mesinteiro.zip servidor.py v21 + mesinteiro.py + mesinteiro_exemplo.json, para /opt/mapadaalma
#   kit-mesinteiro.zip                     imagens da Kiwify, criativos, vídeos e os textos
set -euo pipefail
cd "$(dirname "$0")/.."

npm test --silent

# Build de produção: nenhuma variável NEXT_PUBLIC_* da máquina entra (a configuração fica no config.js).
for v in $(env | grep -o '^NEXT_PUBLIC_[A-Z_]*' || true); do unset "$v"; done
rm -rf out
npx next build > /dev/null
test -f out/config.js && test -f out/plano.html

mkdir -p entregas
rm -f entregas/site-mesinteiro.zip entregas/atualizacao-servidor-21-mesinteiro.zip entregas/kit-mesinteiro.zip
(cd out && zip -qr -X ../entregas/site-mesinteiro.zip . -x '.env*' '*.DS_Store')
(cd servidor && zip -qj -X ../entregas/atualizacao-servidor-21-mesinteiro.zip servidor.py mesinteiro.py mesinteiro_exemplo.json)
zip -qr -X entregas/kit-mesinteiro.zip kit/kiwify kit/criativos docs/TEXTOS-KIWIFY-E-ANUNCIOS.md -x '*.DS_Store'

# Conferência: nenhum .env nem chave dentro dos zips.
for z in entregas/*.zip; do
  if unzip -l "$z" | grep -qE '(^|/)\.env'; then echo "ERRO: $z tem .env" >&2; exit 1; fi
done
if unzip -p entregas/atualizacao-servidor-21-mesinteiro.zip | grep -qE 'sk-ant-[A-Za-z0-9]|re_[A-Za-z0-9]{20,}'; then echo "ERRO: chave no zip do servidor" >&2; exit 1; fi

echo "md5 do servidor.py v21: $(md5sum servidor/servidor.py | cut -d' ' -f1)"
ls -lh entregas/*.zip
