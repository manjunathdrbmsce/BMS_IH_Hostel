#!/usr/bin/env bash
# =============================================================================
# BMS Hostel — One-Step Deploy Script
# Usage: ./scripts/deploy.sh [commit-sha]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/.env.production"
DEPLOY_LOG="$PROJECT_DIR/logs/deploy.log"
COMMIT_SHA="${1:-latest}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*" | tee -a "$DEPLOY_LOG"; }
ok()   { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $*" | tee -a "$DEPLOY_LOG"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $*" | tee -a "$DEPLOY_LOG"; }
err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $*" | tee -a "$DEPLOY_LOG"; }

# Ensure log directory exists
mkdir -p "$PROJECT_DIR/logs"

echo "" >> "$DEPLOY_LOG"
log "═══════════════════════════════════════════════════════════════"
log "  BMS Hostel — Deploy Starting"
log "  Commit: $COMMIT_SHA | Timestamp: $TIMESTAMP"
log "═══════════════════════════════════════════════════════════════"

# ─── Preflight Checks ─────────────────────────────────────────────────────
log "Running preflight checks..."

if [ ! -f "$ENV_FILE" ]; then
    err ".env.production not found! Copy from .env.production.example and configure."
    exit 1
fi

if ! command -v docker &>/dev/null; then
    err "Docker is not installed"
    exit 1
fi

if ! docker compose version &>/dev/null; then
    err "Docker Compose V2 is required"
    exit 1
fi

ok "Preflight checks passed"

# ─── Save Current State for Rollback ──────────────────────────────────────
log "Saving rollback state..."
ROLLBACK_DIR="$PROJECT_DIR/rollback/$TIMESTAMP"
mkdir -p "$ROLLBACK_DIR"

# Save current image digests
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    ps --format json 2>/dev/null | tee "$ROLLBACK_DIR/containers.json" > /dev/null || true

# Save current commit
git -C "$PROJECT_DIR" rev-parse HEAD > "$ROLLBACK_DIR/commit" 2>/dev/null || echo "unknown" > "$ROLLBACK_DIR/commit"

# Symlink latest rollback
ln -sfn "$ROLLBACK_DIR" "$PROJECT_DIR/rollback/latest"
ok "Rollback state saved to $ROLLBACK_DIR"

# ─── Pull Latest Code ────────────────────────────────────────────────────
if [ "$COMMIT_SHA" != "latest" ] && [ -d "$PROJECT_DIR/.git" ]; then
    log "Pulling latest code..."
    cd "$PROJECT_DIR"
    git fetch origin
    git checkout "$COMMIT_SHA" 2>/dev/null || git checkout "origin/main"
    ok "Code updated"
fi

# ─── Database Backup ─────────────────────────────────────────────────────
log "Taking pre-deploy database backup..."
"$SCRIPT_DIR/backup.sh" || warn "Backup script failed, continuing deploy..."

# ─── Build & Deploy ──────────────────────────────────────────────────────
log "Building Docker images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel --pull
ok "Images built"

log "Pulling base images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull postgres redis
ok "Base images updated"

log "Starting infrastructure services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis
ok "Infrastructure ready"

# Wait for postgres
log "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_isready -U "$DB_USER" &>/dev/null; then
        break
    fi
    sleep 2
done
ok "PostgreSQL is ready"

# ─── Database Migrations ─────────────────────────────────────────────────
log "Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm \
    -e DATABASE_URL="$(grep DATABASE_URL "$ENV_FILE" | cut -d= -f2-)" \
    api sh -c "npx prisma migrate deploy"
ok "Migrations applied"

# ─── Rolling Deploy (zero-downtime) ──────────────────────────────────────
log "Deploying API (rolling update)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps --build api
ok "API deployed"

log "Deploying Web..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps --build web
ok "Web deployed"

# ─── Start Nginx ─────────────────────────────────────────────────────────
log "Starting/reloading Nginx..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d nginx
# Graceful reload if already running
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T nginx nginx -s reload 2>/dev/null || true
ok "Nginx ready"

# ─── Start Monitoring Stack ──────────────────────────────────────────────
log "Starting monitoring stack..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d \
    prometheus grafana loki promtail cadvisor postgres-exporter redis-exporter db-backup
ok "Monitoring stack ready"

# ─── Health Checks ───────────────────────────────────────────────────────
log "Running post-deploy health checks..."
HEALTH_OK=false
for i in $(seq 1 15); do
    HTTP_CODE=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
        exec -T api wget -qO- -S http://localhost:3001/api/v1/health 2>&1 | grep "HTTP/" | awk '{print $2}' || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        HEALTH_OK=true
        break
    fi
    log "  Health check attempt $i/15: HTTP $HTTP_CODE"
    sleep 5
done

if [ "$HEALTH_OK" = true ]; then
    ok "API health check passed"
else
    err "API health check FAILED — consider rolling back: ./scripts/rollback.sh"
    exit 1
fi

# ─── Cleanup ─────────────────────────────────────────────────────────────
log "Cleaning up old images..."
docker image prune -f --filter "until=168h" > /dev/null 2>&1 || true

# Keep only last 5 rollback states
ls -dt "$PROJECT_DIR/rollback"/20* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true

# ─── Summary ─────────────────────────────────────────────────────────────
log "═══════════════════════════════════════════════════════════════"
ok "  DEPLOY COMPLETE"
log "  Commit:     $COMMIT_SHA"
log "  Time:       $(date)"
log "  Rollback:   ./scripts/rollback.sh"
log "  Monitoring: docker compose -f docker-compose.prod.yml logs -f"
log "═══════════════════════════════════════════════════════════════"
