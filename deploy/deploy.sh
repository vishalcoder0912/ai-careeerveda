#!/usr/bin/env bash
# CareerVeda pull-deploy. Runs ON the Compute Engine VM, as root. No Docker.
#
#   sudo /opt/careerveda/deploy/deploy.sh           # deploy if origin/main moved
#   sudo FORCE=1 /opt/careerveda/deploy/deploy.sh   # rebuild + restart regardless
#
# Invoked by careerveda-autodeploy.timer (every 2 min) and, optionally, by the
# GitHub Actions workflow over SSH. A lock stops the two overlapping.
#
# Order matters, so a failed step never breaks what is live:
#   1. build the site and the admin panel in the checkout
#   2. only then install backend deps and restart the API
#   3. only then copy the new static files to /var/www, which nginx serves
# A build that fails exits before 2 and 3: the previous release keeps running,
# and because "deployed" is the last SUCCESSFUL commit (not git HEAD), the next
# poll tries again instead of believing it is up to date.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/careerveda}"
WEB_ROOT="${WEB_ROOT:-/var/www/careerveda}"
BRANCH="${BRANCH:-main}"
BACKEND_SERVICE="${BACKEND_SERVICE:-careerveda-backend}"
BUILD_ENV="${BUILD_ENV:-/etc/careerveda/build.env}"
STATE_DIR=/var/lib/careerveda
LOG_TAG="careerveda-deploy"

log() { echo "[$(date '+%F %T')] $*" | systemd-cat -t "$LOG_TAG" -p info 2>/dev/null || echo "[$(date '+%F %T')] $*"; }
fail() { echo "[$(date '+%F %T')] ERROR: $*" | systemd-cat -t "$LOG_TAG" -p err 2>/dev/null || echo "ERROR: $*" >&2; exit 1; }

mkdir -p "$STATE_DIR"
exec 9>"$STATE_DIR/deploy.lock"
flock -n 9 || { log "Another deploy is running; skipping"; exit 0; }

cd "$APP_DIR"
git fetch origin "$BRANCH" --quiet
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
DEPLOYED_SHA="$(cat "$STATE_DIR/deployed-sha" 2>/dev/null || true)"

if [ "$REMOTE_SHA" = "$DEPLOYED_SHA" ] && [ "${FORCE:-0}" != "1" ]; then
  exit 0
fi

log "Deploying ${REMOTE_SHA:0:12} (live: ${DEPLOYED_SHA:0:12})"
git reset --hard "origin/$BRANCH" --quiet

# Build-time settings: Vite bakes VITE_* into the bundles, so they must be set
# here, not on the server process. Kept outside the repo so `git reset` never
# touches them. See deploy/build.env.example.
[ -f "$BUILD_ENV" ] || fail "$BUILD_ENV is missing — copy deploy/build.env.example there and fill it in"
set -a
# shellcheck disable=SC1090
. "$BUILD_ENV"
set +a
[ -n "${VITE_PUBLIC_API_BASE_URL:-}" ] || fail "VITE_PUBLIC_API_BASE_URL is empty in $BUILD_ENV — the forms would refuse every submission"

export NODE_OPTIONS="--max-old-space-size=1536"

# ── 1. Site ───────────────────────────────────────────────────────────────────
# `npm run build`, not `vite build`: prebuild writes sitemap.xml + llms.txt,
# postbuild prerenders every route's <head> and snapshots its rendered <body>
# so crawlers that never run JavaScript still read the page.
log "Building site"
npm ci --no-audit --no-fund
npx playwright install chromium >/dev/null
npm run build
[ -s dist/index.html ] && [ -s dist/sitemap.xml ] || fail "site build produced no index.html/sitemap.xml"

# ── 2. Admin panel ────────────────────────────────────────────────────────────
log "Building admin panel"
npm ci --prefix admin --no-audit --no-fund
npm --prefix admin run build
[ -s admin/dist/index.html ] || fail "admin build produced no index.html"

# ── 3. Backend ────────────────────────────────────────────────────────────────
# Production deps only; node runs src/ directly, there is no build step.
log "Installing backend dependencies"
npm ci --prefix backend --omit=dev --no-audit --no-fund
chown -R root:careerveda backend
log "Restarting API"
systemctl restart "$BACKEND_SERVICE"

ok=0
for _ in $(seq 1 15); do
  if curl -fsS --max-time 5 http://127.0.0.1:8080/health >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
[ "$ok" = 1 ] || fail "API did not answer /health in 30s — static files NOT switched. Check: journalctl -u $BACKEND_SERVICE -n 50"

# ── 4. Publish the static files ───────────────────────────────────────────────
# Hashed assets accumulate rather than being deleted: a tab opened before this
# deploy still asks for the old chunk names when it lazy-loads a route, and a
# 404 there is a blank page. Everything else (HTML, sitemap) is replaced.
publish() {
  local src="$1" dest="$2"
  mkdir -p "$dest/assets"
  rsync -a "$src/assets/" "$dest/assets/"
  rsync -a --delete --exclude /assets/ "$src/" "$dest/"
  find "$dest/assets" -type f -mtime +14 -delete
}
log "Publishing static files"
publish dist "$WEB_ROOT/site"
publish admin/dist "$WEB_ROOT/admin"
nginx -t -q && systemctl reload nginx

echo "$REMOTE_SHA" > "$STATE_DIR/deployed-sha"
log "Deploy complete: ${REMOTE_SHA:0:12} is live"
