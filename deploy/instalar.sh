#!/usr/bin/env bash
# Instala ou atualiza o Mês Inteiro na VPS. Rode como root, de dentro da pasta do zip:
#
#   bash instalar.sh
#
# O que faz (e o que NÃO faz):
# - Cria o usuário de sistema "mesinteiro" e a pasta /opt/mesinteiro.
# - Baixa o Node 24 para /opt/mesinteiro/node (só para o Mês Inteiro; não mexe
#   no Node nem em nada do sistema, do Docker ou dos outros serviços, nem no
#   Fôlego, que roda ao lado em /opt/folego).
# - Troca o site em /opt/mesinteiro/app e guarda a versão anterior em app.anterior.
# - Mantém /opt/mesinteiro/.env e /opt/mesinteiro/dados (banco) intactos.
# - Reinicia SÓ o serviço "mesinteiro". Nunca reinicia o Docker nem a máquina.
set -euo pipefail

BASE=/opt/mesinteiro
PORTA=8021
AQUI="$(cd "$(dirname "$0")" && pwd)"

[ "$(id -u)" = 0 ] || { echo "Rode como root."; exit 1; }
[ -f "$AQUI/app/server.js" ] || { echo "Não achei app/server.js: rode de dentro da pasta do zip."; exit 1; }

echo "== 1. Usuário e pastas"
id mesinteiro >/dev/null 2>&1 || useradd --system --home-dir "$BASE" --shell /usr/sbin/nologin mesinteiro
mkdir -p "$BASE/dados" "$BASE/backups"
chown mesinteiro:mesinteiro "$BASE/dados" "$BASE/backups"
chmod 700 "$BASE/dados" "$BASE/backups"

echo "== 2. Node (só do Mês Inteiro, em $BASE/node)"
precisa_node=1
if [ -x "$BASE/node/bin/node" ]; then
  maior=$("$BASE/node/bin/node" -p 'process.versions.node.split(".")[0]')
  [ "$maior" -ge 22 ] && precisa_node=0
fi
if [ "$precisa_node" = 1 ]; then
  case "$(uname -m)" in
    x86_64) arq=x64 ;;
    aarch64) arq=arm64 ;;
    *) echo "Processador $(uname -m) não previsto."; exit 1 ;;
  esac
  fonte=https://nodejs.org/dist/latest-v24.x
  tmp=$(mktemp -d)
  arquivo=$(curl -fsSL "$fonte/SHASUMS256.txt" | awk -v a="linux-$arq.tar.xz" '$2 ~ a"$" {print $2}')
  curl -fsSL "$fonte/$arquivo" -o "$tmp/$arquivo"
  (cd "$tmp" && curl -fsSL "$fonte/SHASUMS256.txt" | grep " $arquivo\$" | sha256sum -c -)
  tar -xJf "$tmp/$arquivo" -C "$tmp"
  rm -rf "$BASE/node"
  mv "$tmp/${arquivo%.tar.xz}" "$BASE/node"
  rm -rf "$tmp"
fi
echo "   Node $("$BASE/node/bin/node" -v)"

echo "== 3. Configuração ($BASE/.env)"
primeira_vez=0
if [ ! -f "$BASE/.env" ]; then
  primeira_vez=1
  cp "$AQUI/env.exemplo" "$BASE/.env"
  segredo=$(openssl rand -hex 24)
  sed -i "s/^KIWIFY_WEBHOOK_SEGREDO=.*/KIWIFY_WEBHOOK_SEGREDO=$segredo/" "$BASE/.env"
  echo "   Criei $BASE/.env com um segredo novo para o webhook."
else
  echo "   $BASE/.env já existe e não foi alterado."
fi
chown root:root "$BASE/.env"
chmod 600 "$BASE/.env"

echo "== 4. Site"
rm -rf "$BASE/app.novo"
cp -a "$AQUI/app" "$BASE/app.novo"
find "$BASE/app.novo" -maxdepth 2 -name '.env*' -delete
mkdir -p "$BASE/app.novo/.next/cache"
chown -R root:root "$BASE/app.novo"
chown -R mesinteiro:mesinteiro "$BASE/app.novo/.next/cache"
if [ -d "$BASE/app" ]; then
  rm -rf "$BASE/app.anterior"
  mv "$BASE/app" "$BASE/app.anterior"
fi
mv "$BASE/app.novo" "$BASE/app"

echo "== 5. Comando mesinteiro-admin e backup diário"
install -m 755 "$AQUI/admin.mjs" "$BASE/admin.mjs"
cat > /usr/local/bin/mesinteiro-admin <<'SCRIPT'
#!/usr/bin/env bash
# Roda como o usuário mesinteiro, para o banco continuar sendo dele.
SITE_URL=$(grep -E '^SITE_URL=' /opt/mesinteiro/.env | cut -d= -f2- || true)
exec runuser -u mesinteiro -- env SITE_URL="$SITE_URL" MESINTEIRO_DB=/opt/mesinteiro/dados/mesinteiro.db \
  /opt/mesinteiro/node/bin/node --disable-warning=ExperimentalWarning /opt/mesinteiro/admin.mjs "$@"
SCRIPT
chmod 755 /usr/local/bin/mesinteiro-admin
# Minuto diferente do backup do Fôlego (4h17), para os dois não rodarem juntos.
echo "37 4 * * * root /usr/local/bin/mesinteiro-admin backup >/dev/null 2>&1" > /etc/cron.d/mesinteiro

echo "== 6. Serviço"
if ! systemctl is-active --quiet mesinteiro && command -v ss >/dev/null && ss -ltn "sport = :$PORTA" | grep -q LISTEN; then
  echo "A porta $PORTA já está em uso por outro programa. Nada foi iniciado."
  echo "Troque PORT=8021 em $AQUI/mesinteiro.service e na linha PORTA deste script."
  exit 1
fi
install -m 644 "$AQUI/mesinteiro.service" /etc/systemd/system/mesinteiro.service
systemctl daemon-reload
systemctl enable mesinteiro >/dev/null 2>&1
systemctl restart mesinteiro
sleep 4
echo
curl -s "localhost:$PORTA/api/saude" && echo || { echo "O site não respondeu. Veja: journalctl -u mesinteiro -n 50"; exit 1; }

echo
if [ "$primeira_vez" = 1 ]; then
  echo "Primeira instalação: agora edite $BASE/.env (nano $BASE/.env) e rode: systemctl restart mesinteiro"
fi
if [ -d "$BASE/app.anterior" ]; then
  echo "Pronto. Versão anterior guardada em $BASE/app.anterior."
else
  echo "Pronto."
fi
