#!/usr/bin/env bash
# =============================================================================
# BMS Hostel — Initial Server Setup
# Run once on a fresh server to bootstrap the deployment environment
# Usage: curl -sSL <raw-url>/scripts/setup-server.sh | bash
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
ok()  { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $*"; }

DEPLOY_PATH="/opt/bms-hostel"
DEPLOY_USER="deploy"

log "═══════════════════════════════════════════════════════════════"
log "  BMS Hostel — Server Setup"
log "═══════════════════════════════════════════════════════════════"

# ─── System Dependencies ─────────────────────────────────────────────────
log "Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq curl git wget unzip htop jq

# ─── Docker ──────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    ok "Docker installed"
else
    ok "Docker already installed"
fi

# ─── Create deploy user ─────────────────────────────────────────────────
if ! id "$DEPLOY_USER" &>/dev/null; then
    log "Creating deploy user..."
    useradd -m -s /bin/bash -G docker "$DEPLOY_USER"
    ok "User '$DEPLOY_USER' created"
else
    usermod -aG docker "$DEPLOY_USER"
    ok "User '$DEPLOY_USER' exists, added to docker group"
fi

# ─── Project Directory ──────────────────────────────────────────────────
log "Setting up project directory..."
mkdir -p "$DEPLOY_PATH"/{logs,backups,rollback}
mkdir -p "$DEPLOY_PATH"/infra/nginx/ssl
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"
ok "Directory structure created at $DEPLOY_PATH"

# ─── Firewall ────────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
    log "Configuring firewall..."
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    ufw --force enable
    ok "Firewall configured (22, 80, 443)"
fi

# ─── Swap (for small servers) ───────────────────────────────────────────
TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
if [ "$TOTAL_MEM" -lt 4096 ] && [ ! -f /swapfile ]; then
    log "Creating 2GB swap file (low memory detected: ${TOTAL_MEM}MB)..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ok "Swap enabled"
fi

# ─── System Tuning ──────────────────────────────────────────────────────
log "Applying system tuning..."
cat >> /etc/sysctl.conf <<'EOF'
# BMS Hostel tuning
vm.swappiness=10
vm.overcommit_memory=1
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=65535
fs.file-max=65535
EOF
sysctl -p > /dev/null 2>&1

# ─── Log Rotation ───────────────────────────────────────────────────────
log "Configuring log rotation..."
cat > /etc/logrotate.d/bms-hostel <<EOF
$DEPLOY_PATH/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $DEPLOY_USER $DEPLOY_USER
}
EOF
ok "Log rotation configured"

log "═══════════════════════════════════════════════════════════════"
ok "  Server setup complete!"
log ""
log "  Next steps:"
log "  1. Clone repo:  git clone <repo-url> $DEPLOY_PATH"
log "  2. Configure:   cp .env.production.example .env.production"
log "  3. Edit:        nano $DEPLOY_PATH/.env.production"
log "  4. Deploy:      cd $DEPLOY_PATH && ./scripts/deploy.sh"
log "  5. (Optional)   Add SSL certs to infra/nginx/ssl/"
log "═══════════════════════════════════════════════════════════════"
