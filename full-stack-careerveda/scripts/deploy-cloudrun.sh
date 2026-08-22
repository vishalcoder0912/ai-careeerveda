#!/usr/bin/env bash
# Deploy the three CareerVeda apps to Google Cloud Run as separate services,
# each on its own subdomain:
#
#   example.com        -> careerveda-frontend
#   admin.example.com  -> careerveda-admin
#   api.example.com    -> careerveda-backend
#
# The Vite apps bake the API URL at BUILD time (VITE_* args), so the images are
# built locally and pushed to Artifact Registry, then deployed by image ref.
#
#   1. Fill in the CONFIG block below (or export the vars before running).
#   2. gcloud auth login && gcloud auth configure-docker ${REGION}-docker.pkg.dev
#   3. ./scripts/deploy-cloudrun.sh
#
# One-time, before the first run — the script writes the backend's credentials to
# Secret Manager rather than passing them as env vars (see the note above the
# sync_secret function), so that API has to be on or the deploy stops there:
#
#   gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
#     secretmanager.googleapis.com --project=$PROJECT_ID
#
# Re-runnable: it redeploys new revisions each time.
set -euo pipefail

# ── CONFIG ────────────────────────────────────────────────────────────────────
PROJECT_ID="${PROJECT_ID:?set PROJECT_ID}"           # your GCP project id
REGION="${REGION:-asia-south1}"                        # Mumbai; change if needed
DOMAIN="${DOMAIN:?set DOMAIN e.g. example.com}"        # your root domain
AR_REPO="${AR_REPO:-careerveda}"                       # Artifact Registry repo name
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"

# Backend runtime secrets — DO NOT hardcode real values in this file. Export them
# in your shell, or better, move them to Secret Manager and use --set-secrets.
MONGODB_URI="${MONGODB_URI:?set MONGODB_URI (Atlas connection string)}"
JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:?set JWT_ACCESS_SECRET (>=32 chars)}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:?set JWT_REFRESH_SECRET (>=32 chars)}"

FRONTEND_URL="https://${DOMAIN}"
ADMIN_URL="https://admin.${DOMAIN}"
API_BASE="https://api.${DOMAIN}/api/v1"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"
# ──────────────────────────────────────────────────────────────────────────────

echo "==> Ensuring Artifact Registry repo exists"
gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1 \
  || gcloud artifacts repositories create "$AR_REPO" --repository-format=docker \
       --location="$REGION" --project="$PROJECT_ID"

echo "==> Building backend"
docker build -t "${REGISTRY}/backend:${TAG}" ./backend
docker push "${REGISTRY}/backend:${TAG}"

echo "==> Building frontend (API URL baked in)"
docker build -t "${REGISTRY}/frontend:${TAG}" \
  --build-arg "VITE_PUBLIC_API_BASE_URL=${API_BASE}" \
  -f Dockerfile .
docker push "${REGISTRY}/frontend:${TAG}"

echo "==> Building admin (API + site URL baked in)"
docker build -t "${REGISTRY}/admin:${TAG}" \
  --build-arg "VITE_ADMIN_API_BASE_URL=${API_BASE}" \
  --build-arg "VITE_PUBLIC_SITE_URL=${FRONTEND_URL}" \
  -f admin/Dockerfile .
docker push "${REGISTRY}/admin:${TAG}"

echo "==> Syncing runtime secrets to Secret Manager"
# These three cannot travel in --set-env-vars, and the previous version of this
# script was broken because they did.
#
# gcloud's escaped-list syntax ("^@^K=V@K=V") splits the WHOLE string on the
# chosen separator, with no way to escape one inside a value. Every Atlas URI
# contains an '@' — mongodb+srv://user:pass@cluster0.x.mongodb.net — so the URI
# was being cut in half and the remainder read as another KEY=VALUE pair. The
# comma separator is no better: a replica-set URI lists hosts comma-separated,
# and a generated password can contain any of these characters.
#
# Secret Manager removes the quoting problem instead of moving it, and keeps the
# credential out of `gcloud run services describe`, where an env var is readable
# by anyone with viewer access on the project.
sync_secret() {
  local name="$1" value="$2"
  gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1 \
    || gcloud secrets create "$name" --replication-policy=automatic --project="$PROJECT_ID"
  # --data-file=- with printf, not `echo`: echo appends a newline, and a trailing
  # newline inside a connection string or a signing key is a genuinely nasty
  # failure — it authenticates locally and fails in Cloud Run.
  printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project="$PROJECT_ID" >/dev/null
}

sync_secret careerveda-mongodb-uri "$MONGODB_URI"
sync_secret careerveda-jwt-access-secret "$JWT_ACCESS_SECRET"
sync_secret careerveda-jwt-refresh-secret "$JWT_REFRESH_SECRET"

# The runtime service account must be able to read them. Idempotent, and quiet:
# re-running it on an existing binding is a no-op.
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor >/dev/null

echo "==> Deploying backend"
# The "^@^" prefix changes the separator from comma to @. CORS_ALLOWED_ORIGINS is
# itself a comma-separated list; with the default separator gcloud splits it
# mid-value and then fails trying to read the fragment as another KEY=VALUE pair.
# Everything left in here is a URL or a literal we control, and none of them can
# contain an '@' — the values that could are in --set-secrets below.
# --min-instances=1: at 0 the first request after an idle period waits for Node
# to boot and Mongo to connect. The static frontend and admin services below stay
# at 0 — nginx starts in milliseconds and has nothing to warm.
gcloud run deploy careerveda-backend \
  --image="${REGISTRY}/backend:${TAG}" \
  --region="$REGION" --project="$PROJECT_ID" \
  --allow-unauthenticated --port=8080 \
  --min-instances=1 --max-instances=10 \
  --set-env-vars="^@^NODE_ENV=production@MONGODB_DB_NAME=careerveda\
@FRONTEND_URL=${FRONTEND_URL}@ADMIN_URL=${ADMIN_URL}\
@CORS_ALLOWED_ORIGINS=${FRONTEND_URL},${ADMIN_URL}\
@COOKIE_SECURE=true@COOKIE_DOMAIN=.${DOMAIN}" \
  --set-secrets="MONGODB_URI=careerveda-mongodb-uri:latest,\
JWT_ACCESS_SECRET=careerveda-jwt-access-secret:latest,\
JWT_REFRESH_SECRET=careerveda-jwt-refresh-secret:latest"

echo "==> Deploying frontend"
gcloud run deploy careerveda-frontend \
  --image="${REGISTRY}/frontend:${TAG}" \
  --region="$REGION" --project="$PROJECT_ID" \
  --allow-unauthenticated --port=8080

echo "==> Deploying admin"
gcloud run deploy careerveda-admin \
  --image="${REGISTRY}/admin:${TAG}" \
  --region="$REGION" --project="$PROJECT_ID" \
  --allow-unauthenticated --port=8080

echo "==> Mapping subdomains (needs a verified domain in Search Console first)"
gcloud beta run domain-mappings create --service=careerveda-frontend --domain="${DOMAIN}"       --region="$REGION" --project="$PROJECT_ID" || true
gcloud beta run domain-mappings create --service=careerveda-admin    --domain="admin.${DOMAIN}" --region="$REGION" --project="$PROJECT_ID" || true
gcloud beta run domain-mappings create --service=careerveda-backend  --domain="api.${DOMAIN}"   --region="$REGION" --project="$PROJECT_ID" || true

# www is mapped to the SAME frontend service, which 301s it to the apex — see the
# regex server block at the top of nginx.conf. Without this mapping www does not
# resolve to Cloud Run at all, and anyone who types it (or any link that includes
# it) gets a dead host rather than the site.
gcloud beta run domain-mappings create --service=careerveda-frontend --domain="www.${DOMAIN}"   --region="$REGION" --project="$PROJECT_ID" || true

echo
echo "Done. Add the DNS records that the domain-mappings command printed"
echo "(CNAME -> ghs.googlehosted.com for each subdomain). Certs auto-provision."
echo
echo "REMAINING MANUAL STEP — MongoDB Atlas will refuse the backend's connection"
echo "until its egress is a fixed address Atlas can allowlist. Cloud Run egress"
echo "IPs are dynamic, so there is nothing to add to Atlas without this:"
echo
echo "  gcloud compute networks vpc-access connectors create careerveda-conn \\"
echo "    --region=$REGION --network=default --range=10.8.0.0/28"
echo "  gcloud compute addresses create careerveda-nat-ip --region=$REGION"
echo "  gcloud compute routers create careerveda-router --region=$REGION --network=default"
echo "  gcloud compute routers nats create careerveda-nat --router=careerveda-router \\"
echo "    --region=$REGION --nat-external-ip-pool=careerveda-nat-ip \\"
echo "    --nat-all-subnet-ip-ranges"
echo "  gcloud run services update careerveda-backend --region=$REGION \\"
echo "    --vpc-connector=careerveda-conn --vpc-egress=all-traffic"
echo
echo "Then allowlist the careerveda-nat-ip address in Atlas > Network Access."
echo "Opening Atlas to 0.0.0.0/0 instead works and is a bad trade: it exposes the"
echo "cluster to the whole internet to save one afternoon of setup."
