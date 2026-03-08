#!/usr/bin/env bash
# =============================================================================
# BMS Hostel — Status / Health Dashboard (CLI)
# Usage: ./scripts/status.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/.env.production"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              BMS Hostel — System Status                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Container Status ─────────────────────────────────────────────────────
echo -e "${BLUE}Container Status:${NC}"
echo "─────────────────────────────────────────────────────"

SERVICES="nginx api web postgres redis prometheus grafana loki"
for svc in $SERVICES; do
    CONTAINER="bms_$svc"
    STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "not found")
    HEALTH=$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "n/a")

    if [ "$STATUS" = "running" ]; then
        if [ "$HEALTH" = "healthy" ] || [ "$HEALTH" = "n/a" ]; then
            echo -e "  ${GREEN}●${NC} $CONTAINER — running ($HEALTH)"
        else
            echo -e "  ${YELLOW}●${NC} $CONTAINER — running ($HEALTH)"
        fi
    else
        echo -e "  ${RED}●${NC} $CONTAINER — $STATUS"
    fi
done

# ─── API Health ───────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}API Health:${NC}"
echo "─────────────────────────────────────────────────────"
API_HEALTH=$(docker exec bms_api wget -qO- http://localhost:3001/api/v1/health 2>/dev/null || echo '{"status":"unreachable"}')
echo "  $API_HEALTH"

# ─── Database Stats ──────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}Database:${NC}"
echo "─────────────────────────────────────────────────────"
DB_SIZE=$(docker exec bms_postgres psql -U "${DB_USER:-bms_prod}" -d "${DB_NAME:-bms_hostel}" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | xargs || echo "N/A")
DB_CONNS=$(docker exec bms_postgres psql -U "${DB_USER:-bms_prod}" -d "${DB_NAME:-bms_hostel}" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs || echo "N/A")
echo "  Size: $DB_SIZE | Active connections: $DB_CONNS"

# ─── Redis Stats ─────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}Redis:${NC}"
echo "─────────────────────────────────────────────────────"
REDIS_INFO=$(docker exec bms_redis redis-cli -a "${REDIS_PASSWORD:-}" INFO memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r' || echo "N/A")
REDIS_KEYS=$(docker exec bms_redis redis-cli -a "${REDIS_PASSWORD:-}" DBSIZE 2>/dev/null | awk '{print $2}' || echo "N/A")
echo "  Memory: $REDIS_INFO | Keys: $REDIS_KEYS"

# ─── Disk Usage ──────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}Disk Usage:${NC}"
echo "─────────────────────────────────────────────────────"
docker system df 2>/dev/null | head -5

# ─── Recent Logs ─────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}Recent Errors (last 10 min):${NC}"
echo "─────────────────────────────────────────────────────"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --since 10m --tail 5 api 2>/dev/null | grep -iE "error|fatal|exception" | tail -5 || echo "  (no errors)"

# ─── Backup Status ───────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}Backups:${NC}"
echo "─────────────────────────────────────────────────────"
LATEST_BACKUP=$(ls -1t "$PROJECT_DIR/backups/"*.dump 2>/dev/null | head -1 || echo "")
if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" 2>/dev/null || stat -f %Sm "$LATEST_BACKUP" 2>/dev/null || echo "unknown")
    BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
    echo "  Latest: $(basename "$LATEST_BACKUP") ($BACKUP_SIZE, $BACKUP_DATE)"
    echo "  Total: $(ls -1 "$PROJECT_DIR/backups/"*.dump 2>/dev/null | wc -l) backups"
else
    echo "  No backups found"
fi

echo ""
echo -e "${CYAN}─────────────────────────────────────────────────────${NC}"
echo -e "  Grafana:   http://localhost:3002"
echo -e "  API Docs:  http://localhost:3001/api/docs"
echo -e "${CYAN}─────────────────────────────────────────────────────${NC}"
