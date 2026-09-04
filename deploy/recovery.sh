#!/usr/bin/env bash
# CareerVeda — Disaster recovery script.
#
# Automates the recovery steps documented in disaster-recovery.md.
#
# Usage:
#   sudo bash deploy/recovery.sh [restore-disk|restore-db|diagnose|all]

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/careerveda}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/careerveda}"
ZONE="${ZONE:-asia-south1-a}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$BACKUP_DIR/recovery.log"; }
mkdir -p "$BACKUP_DIR"

# ── Diagnose the problem ──────────────────────────────────────────────────────
diagnose() {
  log "==> Running diagnosis..."

  echo ""
  echo "── System status ──"
  uptime
  free -h
  df -h /
  echo ""
  echo "── Backend service status ──"
  systemctl status careerveda-backend --no-pager -l 2>/dev/null || echo "FAILED"
  echo ""
  echo "── Backend health check ──"
  curl -fsS --max-time 5 http://127.0.0.1:8080/health 2>/dev/null && echo " OK" || echo " FAILED"
  echo ""
  echo "── Database readiness ──"
  curl -fsS --max-time 5 http://127.0.0.1:8080/ready 2>/dev/null && echo " OK" || echo " FAILED"
  echo ""
  echo "── Nginx status ──"
  systemctl status nginx --no-pager 2>/dev/null | head -5 || echo "FAILED"
  echo ""
  echo "── Recent backend errors ──"
  journalctl -u careerveda-backend -n 20 --no-pager -p err 2>/dev/null || echo "No errors found"
  echo ""
  echo "── Recent nginx errors ──"
  tail -20 /var/log/nginx/error.log 2>/dev/null || echo "No nginx errors"
  echo ""
  echo "── MongoDB process ──"
  ps aux | grep -i mongod | grep -v grep || echo "No local mongod process (using Atlas)"
}

# ── Restore disk from snapshot ───────────────────────────────────────────────
restore_disk() {
  log "==> Listing available snapshots..."
  gcloud compute snapshots list \
    --project="$PROJECT_ID" \
    --filter="name~careerveda-disk-" \
    --format="table(name,creationTimestamp,diskSizeGb)" \
    2>/dev/null || {
    log "No snapshots found. Have backups been scheduled?"
    return 1
  }

  echo ""
  PARAM1="${2:-}"
  if [ -z "$PARAM1" ]; then
    read -rp "Enter snapshot name to restore: " SNAPSHOT
  else
    SNAPSHOT="$PARAM1"
  fi

  log "==> Creating disk from snapshot $SNAPSHOT..."
  gcloud compute disks create "careerveda-restored-$(date +%s)" \
    --project="$PROJECT_ID" \
    --source-snapshot="$SNAPSHOT" \
    --zone="$ZONE"

  log "Restore requires manual steps:"
  log "  1. Detach the old disk from the VM"
  log "  2. Attach the restored disk"
  log "  3. Restart services"
  log "See disaster-recovery.md for full instructions."
}

# ── Restore database from backup ─────────────────────────────────────────────
restore_database() {
  log "==> Listing available database backups..."
  ls -1 "$BACKUP_DIR/db/" 2>/dev/null || {
    log "No local database backups found."
    # Try GCS
    if command -v gsutil >/dev/null 2>&1; then
      log "Checking GCS for backups..."
      gsutil ls "${GCS_BUCKET:-gs://careerveda-backups}/db/" 2>/dev/null || log "No GCS backups found"
    fi
    return 1
  }

  echo ""
  PARAM1="${2:-}"
  if [ -z "$PARAM1" ]; then
    read -rp "Enter backup timestamp to restore: " BACKUP_TIME
  else
    BACKUP_TIME="$PARAM1"
  fi

  BACKUP_PATH="$BACKUP_DIR/db/$BACKUP_TIME/archive.gz"
  if [ ! -f "$BACKUP_PATH" ]; then
    log "ERROR: Backup not found at $BACKUP_PATH"
    return 1
  fi

  MONGODB_URI="$(grep '^MONGODB_URI=' "$APP_DIR/backend/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")"

  log "==> Restoring database from $BACKUP_TIME..."

  # WARNING: This drops all existing data before restoring.
  # Uncomment to auto-confirm, or keep interactive.
  # read -rp "This will REPLACE the production database. Continue? (yes/no): " CONFIRM
  # [ "$CONFIRM" = "yes" ] || { log "Aborted."; return 1; }

  mongorestore \
    --uri="$MONGODB_URI" \
    --drop \
    --gzip \
    --archive="$BACKUP_PATH"

  log "Database restore complete."
}

# ── Main ─────────────────────────────────────────────────────────────────────
MODE="${1:-diagnose}"

case "$MODE" in
  diagnose)   diagnose ;;
  restore-disk) restore_disk ;;
  restore-db) restore_database ;;
  all) diagnose; restore_database; restore_disk ;;
  *) echo "Usage: $0 [diagnose|restore-disk|restore-db|all]"; exit 1 ;;
esac

log "============================================"
log " Recovery complete"
log "============================================"
