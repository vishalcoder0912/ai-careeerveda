#!/usr/bin/env bash
# CareerVeda — Automated backup script for GCP Compute Engine.
#
# Creates:
#   1. GCP disk snapshot (VM state)
#   2. MongoDB database export (structured data)
#   3. Backend configuration (.env)
#
# Configure this to run on a schedule:
#   - Snapshot disk: daily, retain 7 (cron)
#   - Database export: daily, retain 30 (cron)
#
# Usage:
#   sudo bash deploy/backup.sh [database|disk|all]
#
# Prerequisites:
#   - gcloud CLI on the VM
#   - mongodump installed (mongodb-database-tools)
#   - MONGODB_URI in backend/.env

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
ZONE="${ZONE:-asia-south1-a}"
INSTANCE_NAME="$(hostname)"
APP_DIR="${APP_DIR:-/opt/careerveda}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/careerveda}"
# GCS bucket for off-site backups (optional but recommended)
GCS_BUCKET="${GCS_BUCKET:-gs://careerveda-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DB_RETENTION_DAYS="${DB_RETENTION_DAYS:-30}"

MODE="${1:-all}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$BACKUP_DIR/backup.log"; }

mkdir -p "$BACKUP_DIR"

# ── Disk snapshot ─────────────────────────────────────────────────────────────
backup_disk() {
  log "==> Creating disk snapshot..."
  gcloud compute disks snapshot "$INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    --zone="$ZONE" \
    --snapshot-names="careerveda-disk-${TIMESTAMP}" \
    --description="CareerVeda automated backup" \
    --storage-location=asia-south1

  log "    Snapshot careerveda-disk-${TIMESTAMP} created"

  # Cleanup old snapshots (keep RETENTION_DAYS)
  log "==> Cleaning up old snapshots (keeping $RETENTION_DAYS days)..."
  gcloud compute snapshots list \
    --project="$PROJECT_ID" \
    --filter="name~careerveda-disk-" \
    --format="value(name,creationTimestamp)" | while read -r name created; do
    days_old=$(( ( $(date +%s) - $(date -d "$created" +%s) ) / 86400 ))
    if [ "$days_old" -gt "$RETENTION_DAYS" ]; then
      log "    Deleting old snapshot: $name ($days_old days old)"
      gcloud compute snapshots delete "$name" --project="$PROJECT_ID" --quiet
    fi
  done
}

# ── Database export ───────────────────────────────────────────────────────────
backup_database() {
  log "==> Exporting MongoDB database..."

  # Get MONGODB_URI from backend/.env
  MONGODB_URI="$(grep '^MONGODB_URI=' "$APP_DIR/backend/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")"

  if [ -z "$MONGODB_URI" ]; then
    log "ERROR: MONGODB_URI not found in $APP_DIR/backend/.env"
    return 1
  fi

  # Export all collections
  mkdir -p "$BACKUP_DIR/db/$TIMESTAMP"
  mongodump \
    --uri="$MONGODB_URI" \
    --out="$BACKUP_DIR/db/$TIMESTAMP" \
    --gzip \
    --archive="$BACKUP_DIR/db/$TIMESTAMP/archive.gz"

  # Upload to GCS (off-site backup)
  if command -v gsutil >/dev/null 2>&1; then
    log "    Uploading to $GCS_BUCKET/db/$TIMESTAMP..."
    gsutil -m rsync -d -r "$BACKUP_DIR/db/$TIMESTAMP" "$GCS_BUCKET/db/$TIMESTAMP"
    log "    Upload complete"
  else
    log "    WARNING: gsutil not found, skipping GCS upload"
  fi

  # Cleanup old backups (DB_RETENTION_DAYS)
  log "==> Cleaning up old database backups (keeping $DB_RETENTION_DAYS days)..."
  find "$BACKUP_DIR/db" -maxdepth 1 -type d -name '20*' -mtime "+$DB_RETENTION_DAYS" -exec rm -rf {} \;
  log "    Database backup complete"
}

# ── Configuration backup ──────────────────────────────────────────────────────
backup_config() {
  log "==> Backing up configuration..."
  mkdir -p "$BACKUP_DIR/config"
  cp "$APP_DIR/backend/.env" "$BACKUP_DIR/config/backend.env.${TIMESTAMP}"
  cp "$APP_DIR/deploy/nginx-careerveda.conf" "$BACKUP_DIR/config/nginx-careerveda.conf.${TIMESTAMP}"
  tar -czf "$BACKUP_DIR/config/config.${TIMESTAMP}.tar.gz" -C "$BACKUP_DIR/config" \
    "backend.env.${TIMESTAMP}" "nginx-careerveda.conf.${TIMESTAMP}"
  rm -f "$BACKUP_DIR/config/backend.env.${TIMESTAMP}" "$BACKUP_DIR/config/nginx-careerveda.conf.${TIMESTAMP}"
  log "    Config backup complete"
}

# ── Main ─────────────────────────────────────────────────────────────────────
case "$MODE" in
  disk)     backup_disk ;;
  database) backup_database ;;
  config)   backup_config ;;
  all)      backup_disk; backup_config; backup_database ;;
  *)        echo "Usage: $0 [database|disk|config|all]"; exit 1 ;;
esac

log "============================================"
log " Backup complete: $TIMESTAMP"
log "============================================"
