#!/usr/bin/env bash
# CareerVeda one-time Compute Engine bootstrap. No Docker. Run ON the VM, once:
#
#   sudo REPO_URL=https://github.com/vishalcoder0912/ai-careeerveda.git \
#        MONGODB_URI="mongodb+srv://user:pass@cluster..." \
#        bash deploy/setup-server.sh
#
# Installs nginx + Node 22 + git, clones the repo to /opt/careerveda, writes
# backend/.env (JWT secrets generated) and /etc/careerveda/build.env, installs
# the systemd units and the nginx config, and runs the first deploy. Safe to
# re-run: existing .env / build.env files are kept.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/vishalcoder0912/ai-careeerveda.git}"
APP_DIR="${APP_DIR:-/opt/careerveda}"
BRANCH="${BRANCH:-main}"
MONGODB_URI="${MONGODB_URI:-}"

[ "$(id -u)" -eq 0 ] || { echo "Run as root: sudo bash $0" >&2; exit 1; }

VM_IP="$(curl -fsS -H 'Metadata-Flavor: Google' \
  'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip' \
  2>/dev/null || echo 'localhost')"

echo "==> System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx fail2ban rsync openssl >/dev/null

echo "==> Node.js 22"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "    node $(node -v), npm $(npm -v)"

# The build runs Vite twice and a headless Chromium over every route; on a
# 2 GB e2-small that needs swap to stay clear of the OOM killer.
if ! swapon --show | grep -q .; then
  echo "==> 2 GB swap file"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Service user"
id careerveda >/dev/null 2>&1 || useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin careerveda

echo "==> Repository -> $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" remote set-url origin "$REPO_URL"
  git -C "$APP_DIR" fetch origin "$BRANCH" --quiet
  git -C "$APP_DIR" reset --hard "origin/$BRANCH" --quiet
else
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$APP_DIR"
fi

echo "==> Chromium for the prerender snapshot (and its system libraries)"
(cd "$APP_DIR" && npm ci --no-audit --no-fund >/dev/null && npx playwright install --with-deps chromium >/dev/null)

# ── backend/.env (secrets; never in git) ─────────────────────────────────────
ENV_FILE="$APP_DIR/backend/.env"
if [ -f "$ENV_FILE" ]; then
  echo "==> backend/.env exists — keeping it"
else
  if [ -z "$MONGODB_URI" ] && [ -t 0 ]; then
    read -r -p "MongoDB URI (mongodb+srv://...): " MONGODB_URI
  fi
  [ -n "$MONGODB_URI" ] || { echo "MONGODB_URI is required" >&2; exit 1; }
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=8080

MONGODB_URI=${MONGODB_URI}
MONGODB_DB_NAME=careerveda

FRONTEND_URL=http://${VM_IP}
ADMIN_URL=http://${VM_IP}:8081
CORS_ALLOWED_ORIGINS=

JWT_ACCESS_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')

# Plain http while testing on the IP. At cutover to https: COOKIE_SECURE=true
# and set TURNSTILE_SECRET_KEY (the API refuses to boot without it then).
COOKIE_DOMAIN=
COOKIE_SECURE=false
TURNSTILE_SECRET_KEY=

# nginx is the one proxy hop in front of the API.
TRUST_PROXY=1
LOG_LEVEL=info
EOF
  echo "==> Wrote $ENV_FILE (JWT secrets generated)"
fi
chown root:careerveda "$ENV_FILE"
chmod 640 "$ENV_FILE"

# ── /etc/careerveda/build.env (public, baked into the bundles) ───────────────
mkdir -p /etc/careerveda
if [ ! -f /etc/careerveda/build.env ]; then
  sed -e "s#^VITE_PUBLIC_API_BASE_URL=.*#VITE_PUBLIC_API_BASE_URL=http://${VM_IP}/api/v1#" \
      -e "s#^VITE_ADMIN_API_BASE_URL=.*#VITE_ADMIN_API_BASE_URL=http://${VM_IP}/api/v1#" \
      -e "s#^VITE_PUBLIC_SITE_URL=.*#VITE_PUBLIC_SITE_URL=http://${VM_IP}#" \
      "$APP_DIR/deploy/build.env.example" > /etc/careerveda/build.env
  echo "==> Wrote /etc/careerveda/build.env (API at http://${VM_IP}/api/v1)"
fi

echo "==> systemd units"
install -m 644 "$APP_DIR/deploy/careerveda-backend.service"    /etc/systemd/system/
install -m 644 "$APP_DIR/deploy/careerveda-autodeploy.service" /etc/systemd/system/
install -m 644 "$APP_DIR/deploy/careerveda-autodeploy.timer"   /etc/systemd/system/
systemctl daemon-reload
# Enabled, not started: there is nothing to run until the first deploy below
# installs dependencies, and deploy.sh starts it.
systemctl enable careerveda-backend.service >/dev/null
systemctl enable --now careerveda-autodeploy.timer >/dev/null

echo "==> nginx"
mkdir -p /var/www/careerveda/site /var/www/careerveda/admin
rm -f /etc/nginx/sites-enabled/default
install -m 644 "$APP_DIR/deploy/nginx-careerveda.conf" /etc/nginx/sites-available/careerveda
ln -sf /etc/nginx/sites-available/careerveda /etc/nginx/sites-enabled/careerveda
nginx -t -q
systemctl reload nginx

echo "==> fail2ban (SSH brute force + repeated API rate-limit hits)"
cat > /etc/fail2ban/jail.local <<'JAIL'
[sshd]
enabled  = true
maxretry = 3
bantime  = 2h

[nginx-limit-req]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 10
findtime = 10m
bantime  = 1h
JAIL
systemctl enable --now fail2ban >/dev/null
fail2ban-client reload >/dev/null 2>&1 || true

echo "==> First deploy (several minutes on an e2-small)"
FORCE=1 bash "$APP_DIR/deploy/deploy.sh"

cat <<EOF

============================================================
 Setup complete.

  Site   : http://${VM_IP}/
  Admin  : http://${VM_IP}:8081/
  Health : http://${VM_IP}/health

 Next:
  1. Create the first admin:
       cd $APP_DIR/backend && sudo -u careerveda node scripts/seed-admin.js
  2. Before real traffic: domain + HTTPS + Turnstile — see DEPLOYMENT.md
     "Production cutover".

 Push to main → live within ~2 minutes (careerveda-autodeploy.timer).
   journalctl -u careerveda-backend -f        API logs
   journalctl -t careerveda-deploy -n 50      last deploy
============================================================
EOF
