#!/usr/bin/env bash
# Start Firestore Emulator for local development
#
# Requires: gcloud components install cloud-firestore-emulator
#           (or use the prebuilt Docker image)
#
# Usage: ./scripts/firestore-emulator.sh [start|stop|status]

set -euo pipefail

ACTION="${1:-start}"
EMULATOR_HOST="localhost:8080"
PROJECT_ID="careerveda-local"

case "${ACTION}" in
  start)
    echo "==> Starting Firestore Emulator on ${EMULATOR_HOST}"
    
    # Check if already running
    if curl -sf "http://${EMULATOR_HOST}" >/dev/null 2>&1; then
      echo "    Emulator already running on ${EMULATOR_HOST}"
      exit 0
    fi
    
    # Start emulator in background
    gcloud emulators firestore start \
      --host-port="${EMULATOR_HOST}" \
      --project="${PROJECT_ID}" \
      --rules=firestore.rules 2>/dev/null &
    
    EMULATOR_PID=$!
    echo ${EMULATOR_PID} > /tmp/firestore-emulator.pid
    
    # Wait for emulator to be ready
    echo -n "    Waiting for emulator..."
    for i in {1..30}; do
      if curl -sf "http://${EMULATOR_HOST}" >/dev/null 2>&1; then
        echo " ready!"
        break
      fi
      sleep 1
      echo -n "."
    done
    
    if ! curl -sf "http://${EMULATOR_HOST}" >/dev/null 2>&1; then
      echo " FAILED"
      kill ${EMULATOR_PID} 2>/dev/null || true
      exit 1
    fi
    
    echo "==> Firestore Emulator running at http://${EMULATOR_HOST}"
    echo "    Set FIRESTORE_EMULATOR_HOST=${EMULATOR_HOST} in your environment"
    echo "    PID: ${EMULATOR_PID}"
    ;;
    
  stop)
    echo "==> Stopping Firestore Emulator"
    if [ -f /tmp/firestore-emulator.pid ]; then
      PID=$(cat /tmp/firestore-emulator.pid)
      kill ${PID} 2>/dev/null || true
      rm /tmp/firestore-emulator.pid
      echo "    Stopped (PID: ${PID})"
    else
      echo "    No PID file found, trying to kill by port..."
      lsof -ti:${EMULATOR_HOST%%:*} | xargs kill -9 2>/dev/null || true
    fi
    ;;
    
  status)
    if curl -sf "http://${EMULATOR_HOST}" >/dev/null 2>&1; then
      echo "Firestore Emulator: RUNNING on ${EMULATOR_HOST}"
    else
      echo "Firestore Emulator: STOPPED"
    fi
    ;;
    
  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac