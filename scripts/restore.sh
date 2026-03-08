#!/usr/bin/env bash
# =============================================================================
# BMS Hostel — Database Restore Script
# Usage: ./scripts/restore.sh <backup-file.dump>
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/.env.production"
BACKUP_FILE="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
ok()   { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $*"; }
err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $*"; }

if [ -z "$BACKUP_FILE" ]; then
    err "Usage: $0 <backup-file.dump>"
    echo ""
    echo "Available backups:"
    ls -lh "$PROJECT_DIR/backups/"*.dump 2>/dev/null || echo "  (none)"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    # Try relative to backups dir
    BACKUP_FILE="$PROJECT_DIR/backups/$BACKUP_FILE"
    if [ ! -f "$BACKUP_FILE" ]; then
        err "Backup file not found: $1"
        exit 1
    fi
fi

# Source env
if [ -f "$ENV_FILE" ]; then
    export $(grep -E '^(DB_USER|DB_NAME|DB_PASSWORD)=' "$ENV_FILE" | xargs)
fi

DB_USER="${DB_USER:-bms_prod}"
DB_NAME="${DB_NAME:-bms_hostel}"

warn "This will REPLACE the current database with the backup!"
warn "Database: $DB_NAME | Backup: $(basename "$BACKUP_FILE")"
read -p "Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled"
    exit 0
fi

# Take a safety backup first
log "Creating safety backup before restore..."
"$SCRIPT_DIR/backup.sh" "pre_restore_$( date +%Y%m%d_%H%M%S)"

# Stop API to prevent connections during restore
log "Stopping API..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop api web

# Restore
log "Restoring database from $(basename "$BACKUP_FILE")..."
cat "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges

ok "Database restored"

# Restart services
log "Restarting services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api web

ok "Restore complete — services restarted"
