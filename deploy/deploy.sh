#!/usr/bin/env bash
# CareerVeda pull-deploy. Runs ON the Compute Engine VM.
#
# Fetches origin/main, and if the branch moved, checks out the new commit,
# rebuilds the frontend + admin bundles, and restarts the API service.
#
# Invoked by two things:
#   1. careerveda-autodeploy.timer  (polls every 2 minutes — no GitHub config needed)
#   2. GitHub Actions over SSH      (instant deploy right after a push, optional)
#
# Usage:
#   sudo /opt/careerveda/deploy/deploy.sh           # deploy only if origin/main moved
#   sudo FORCE=1 /opt/careerveda/deploy/deploy.sh   # rebuild + restart unconditionally

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/careerveda}"
BRANCH="${BRANCH:-main}"
BACKEND_SERVICE="${BACKEND_SERVICE:-careerveda-backend}"
LOG_TAG="careerveda-deploy"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | systemd-cat -t "$LOG_TAG" -p info 2>/dev/null || echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

cd "$APP_DIR"

git fetch origin "$BRANCH" --quiet

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ] && [ "${FORCE:-0}" != "1" ]; then
  log "Already at origin/$BRANCH ($LOCAL_SHA); nothing to do"
  exit 0
fi

log "Deploying ${REMOTE_SHA:0:12} (was ${LOCAL_SHA:0:12})"
git reset --hard "origin/$BRANCH"

# ── Backend ───────────────────────────────────────────────────────────────────
# Production deps only; src/ is served straight by node, there is no build step.
log "Installing backend dependencies"
npm ci --prefix backend --omit=dev --no-audit --no-fund

# ── Frontend ──────────────────────────────────────────────────────────────────
# `npx vite build` directly rather than `npm run build`: the package.json wraps
# the real build in prebuild/postbuild hooks whose snapshot/prerender steps need
# a Playwright Chromium install. Fine in CI, dead weight on a small test VM —
# and the site falls back to its static data files either way.
log "Building frontend"
npm ci --no-audit --no-fund
NODE_OPTIONS="--max-old-space-size=1536" npx vite build

# ── Admin panel ───────────────────────────────────────────────────────────────
log "Building admin panel"
npm ci --prefix admin --no-audit --no-fund
npm --prefix admin run build

# ── Restart services ──────────────────────────────────────────────────────────
log "Restarting backend API"
systemctl restart "$BACKEND_SERVICE"

log "Reloading nginx"
systemctl reload nginx 2>/dev/null || systemctl restart nginx

# ── Self-check ────────────────────────────────────────────────────────────────
sleep 3
for i in $(seq 1 10); do
  if curl -fsS --max-time 5 http://127.0.0.1:8080/health >/dev/null 2>&1; then
    log "Deploy complete: ${REMOTE_SHA:0:12} is live"
    exit 0
  fi
  sleep 3
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: API did not answer /health within 30s — check: journalctl -u $BACKEND_SERVICE -n 50" \
  | systemd-cat -t "$LOG_TAG" -p err 2>/dev/null || true
exit 1
