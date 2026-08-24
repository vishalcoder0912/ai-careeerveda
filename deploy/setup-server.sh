#!/usr/bin/env bash
# CareerVeda one-time Compute Engine bootstrap. Run ON the VM, once, as root:
#
#   sudo REPO_URL=https://github.com/vishalcoder0912/ai-careeerveda.git \
#        MONGODB_URI="mongodb+srv://user:pass@cluster..." \
#        bash setup-server.sh
#
# What it does:
#   1. Installs nginx, git and Node.js 22
#   2. Clones the repo to /opt/careerveda (branch: main)
#   3. Writes backend/.env — JWT secrets are generated; MongoDB URI comes from
#      $MONGODB_URI or an interactive prompt
#   4. Installs systemd units:
#        careerveda-backend       the Node API on 127.0.0.1:8080
#        careerveda-autodeploy    pulls origin/main every 2 min and deploys on change
#   5. Installs the nginx config (site :80, admin panel :8081)
#   6. Runs the first deploy so the site is live before this script exits
#
# After it finishes, open http://<VM_EXTERNAL_IP>/ — that is the whole CD system.
# The VM now tracks main on its own: every push to main goes live within ~2 minutes,
# no GitHub secrets required. (Optional instant deploys via Actions SSH are in
# .github/workflows/deploy-compute-engine.yml.)

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/vishalcoder0912/ai-careeerveda.git}"
APP_DIR="${APP_DIR:-/opt/careerveda}"
BRANCH="${BRANCH:-main}"
MONGODB_URI="${MONGODB_URI:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

echo "==> Installing system packages (nginx, git, curl)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx >/dev/null

echo "==> Installing Node.js 22"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "    node $(node -v), npm $(npm -v)"

echo "==> Cloning ${REPO_URL} into ${APP_DIR}"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" remote set-url origin "$REPO_URL"
  git -C "$APP_DIR" fetch origin "$BRANCH" --quiet
  git -C "$APP_DIR" reset --hard "origin/$BRANCH" --quiet
else
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$APP_DIR"
fi

# ── backend/.env ───────────────────────────────────────────────────────────────
ENV_FILE="$APP_DIR/backend/.env"
if [ -f "$ENV_FILE" ]; then
  echo "==> backend/.env already exists — keeping it"
else
  if [ -z "$MONGODB_URI" ] && [ -t 0 ]; then
    read -r -p "MongoDB URI (Atlas mongodb+srv://...): " MONGODB_URI
  fi
  if [ -z "$MONGODB_URI" ]; then
    # Valid enough for env validation; the API boots, and only DB-backed routes
    # will fail until a real URI is set. The site renders from static data.
    MONGODB_URI="mongodb://127.0.0.1:27017/careerveda"
    echo "    WARNING: no MONGODB_URI given — wrote a local placeholder. Edit $ENV_FILE later."
  fi

  VM_IP="$(curl -fsS -H 'Metadata-Flavor: Google' \
    'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip' \
    2>/dev/null || echo 'localhost')"

  JWT_ACCESS="$(openssl rand -base64 48 | tr -d '\n')"
  JWT_REFRESH="$(openssl rand -base64 48 | tr -d '\n')"

  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=8080

MONGODB_URI=${MONGODB_URI}
MONGODB_DB_NAME=careerveda

FRONTEND_URL=http://${VM_IP}
ADMIN_URL=http://${VM_IP}:8081
CORS_ALLOWED_ORIGINS=http://${VM_IP},http://${VM_IP}:8081

JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}

COOKIE_DOMAIN=
COOKIE_SECURE=false

LOG_LEVEL=info
EOF
  chmod 600 "$ENV_FILE"
  echo "==> Wrote $ENV_FILE (JWT secrets generated, CORS set to http://${VM_IP})"
fi

# ── systemd units ──────────────────────────────────────────────────────────────
echo "==> Installing systemd units"
install -m 644 "$APP_DIR/deploy/careerveda-backend.service" /etc/systemd/system/
install -m 644 "$APP_DIR/deploy/careerveda-autodeploy.service" /etc/systemd/system/
install -m 644 "$APP_DIR/deploy/careerveda-autodeploy.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now careerveda-backend.service
systemctl enable --now careerveda-autodeploy.timer

# ── nginx ──────────────────────────────────────────────────────────────────────
echo "==> Installing nginx config"
rm -f /etc/nginx/sites-enabled/default
install -m 644 "$APP_DIR/deploy/nginx-careerveda.conf" /etc/nginx/sites-available/careerveda
ln -sf /etc/nginx/sites-available/careerveda /etc/nginx/sites-enabled/careerveda
nginx -t
systemctl reload nginx

# ── First deploy ───────────────────────────────────────────────────────────────
echo "==> Running first deploy (build + start) — this takes a few minutes"
FORCE=1 "$APP_DIR/deploy/deploy.sh"

VM_IP="$(curl -fsS -H 'Metadata-Flavor: Google' \
  'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip' \
  2>/dev/null || echo '<VM_EXTERNAL_IP>')"

cat <<EOF

============================================================
 Setup complete.

  Site   : http://${VM_IP}/
  Admin  : http://${VM_IP}:8081/
  API    : http://${VM_IP}/api/v1/...   (health: http://${VM_IP}/health)

 The autodeploy timer now watches origin/main every 2 minutes:
 push to main → live within ~2 minutes, automatically.

 Useful commands:
   journalctl -u careerveda-backend -f          # API logs
   journalctl -u careerveda-autodeploy -n 50    # last deploy log
   sudo systemctl list-timers careerveda-*      # next pull time

 If the page does not load yet, open the firewall once:
   gcloud compute firewall-rules create careerveda-allow-http \\
     --allow=tcp:80,tcp:8081 --source-ranges=0.0.0.0/0
============================================================
EOF
