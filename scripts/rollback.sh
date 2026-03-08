#!/usr/bin/env bash
# =============================================================================
# BMS Hostel — Rollback Script
# Restores the previous deployment state
# Usage: ./scripts/rollback.sh [rollback-dir]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/.env.production"
ROLLBACK_DIR="${1:-$PROJECT_DIR/rollback/latest}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
ok()   { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $*"; }
err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $*"; }

log "═══════════════════════════════════════════════════════════════"
log "  BMS Hostel — ROLLBACK"
log "═══════════════════════════════════════════════════════════════"

if [ ! -d "$ROLLBACK_DIR" ] || [ ! -f "$ROLLBACK_DIR/commit" ]; then
    err "No rollback state found at: $ROLLBACK_DIR"
    echo ""
    echo "Available rollback points:"
    ls -dt "$PROJECT_DIR/rollback"/20* 2>/dev/null || echo "  (none)"
    exit 1
fi

PREV_COMMIT=$(cat "$ROLLBACK_DIR/commit")
log "Rolling back to commit: $PREV_COMMIT"

# Checkout previous commit
if [ "$PREV_COMMIT" != "unknown" ] && [ -d "$PROJECT_DIR/.git" ]; then
    log "Restoring code to $PREV_COMMIT..."
    cd "$PROJECT_DIR"
    git checkout "$PREV_COMMIT"
    ok "Code restored"
fi

# Rebuild and restart services
log "Rebuilding from rolled-back code..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel api web
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api web

# Health check
log "Checking health after rollback..."
sleep 10
for i in $(seq 1 10); do
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
        exec -T api wget -qO- http://localhost:3001/api/v1/health &>/dev/null; then
        ok "Rollback successful — API is healthy"
        log "═══════════════════════════════════════════════════════════════"
        exit 0
    fi
    sleep 5
done

err "Rollback completed but health check failed — manual intervention required"
exit 1
