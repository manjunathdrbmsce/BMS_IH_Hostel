#!/usr/bin/env bash
# =============================================================================
# BMS Hostel — Database Backup Script
# Creates timestamped PostgreSQL backups with rotation
# Usage: ./scripts/backup.sh [backup-name]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/.env.production"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup_$TIMESTAMP}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
ok()  { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $*"; }

mkdir -p "$BACKUP_DIR"

# Source env vars
if [ -f "$ENV_FILE" ]; then
    export $(grep -E '^(DB_USER|DB_NAME|DB_PASSWORD)=' "$ENV_FILE" | xargs)
fi

DB_USER="${DB_USER:-bms_prod}"
DB_NAME="${DB_NAME:-bms_hostel}"

log "Starting database backup: $BACKUP_NAME"

# Create compressed backup
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom --compress=9 \
    > "$BACKUP_DIR/${BACKUP_NAME}.dump"

BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.dump" | cut -f1)
ok "Backup created: ${BACKUP_NAME}.dump ($BACKUP_SIZE)"

# Rotate: keep last 14 daily + 4 weekly
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.dump 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 20 ]; then
    log "Rotating old backups (keeping last 20)..."
    ls -1t "$BACKUP_DIR"/*.dump | tail -n +21 | xargs rm -f
    ok "Old backups removed"
fi

log "Total backups: $(ls -1 "$BACKUP_DIR"/*.dump 2>/dev/null | wc -l)"
