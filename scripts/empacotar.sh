#!/usr/bin/env bash
# Monta o zip que vai para a VPS: mesinteiro-vps.zip
#   npm run empacotar
# O zip leva o site já compilado, o instalador, o serviço e o mesinteiro-admin.
# Nunca leva .env.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
rm -rf pacote mesinteiro-vps.zip
mkdir -p pacote/mesinteiro
cp -a .next/standalone pacote/mesinteiro/app
mkdir -p pacote/mesinteiro/app/.next
cp -a .next/static pacote/mesinteiro/app/.next/static
[ -d public ] && cp -a public pacote/mesinteiro/app/public
find pacote/mesinteiro/app -name '.env*' -prune -exec rm -rf {} +
rm -rf pacote/mesinteiro/app/dados
cp deploy/instalar.sh deploy/mesinteiro.service deploy/env.exemplo deploy/admin.mjs pacote/mesinteiro/
(cd pacote && zip -qr ../mesinteiro-vps.zip mesinteiro -x '*.env' -x '*/.env*')
rm -rf pacote
echo "Pronto: mesinteiro-vps.zip ($(du -h mesinteiro-vps.zip | cut -f1))"
