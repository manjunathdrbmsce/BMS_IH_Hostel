# BMS Hostel — Deployment & Operations Guide

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Server Setup](#server-setup)
- [First Deployment](#first-deployment)
- [Day-to-Day Operations](#day-to-day-operations)
- [Monitoring](#monitoring)
- [Backup & Restore](#backup--restore)
- [Rollback](#rollback)
- [SSL / HTTPS Setup](#ssl--https-setup)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │              Internet                    │
                    └────────────────┬────────────────────────┘
                                     │ :80 / :443
                    ┌────────────────▼────────────────────────┐
                    │         Nginx  (reverse proxy)          │
                    │  rate limiting · gzip · security headers │
                    └────┬───────────┬───────────┬────────────┘
                         │           │           │
              ┌──────────▼──┐ ┌──────▼──────┐ ┌──▼───────────┐
              │  NestJS API │ │  Next.js Web │ │   Grafana    │
              │   :3001     │ │    :3000     │ │    :3100     │
              └──────┬──────┘ └─────────────┘ └──────────────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
   ┌──────▼───┐ ┌───▼────┐ ┌──▼──────────┐
   │PostgreSQL│ │ Redis  │ │  Prometheus  │
   │  :5432   │ │ :6379  │ │   + Loki     │
   └──────────┘ └────────┘ └─────────────┘
```

**Services** (14 total in production compose):

| Service            | Purpose                        | Port (internal) |
|--------------------|--------------------------------|-----------------|
| nginx              | Reverse proxy, TLS termination | 80 / 443        |
| api                | NestJS REST API                | 3001            |
| web                | Next.js dashboard              | 3000            |
| postgres           | Primary database               | 5432            |
| redis              | Caching, queues (BullMQ)       | 6379            |
| db-backup          | Scheduled PostgreSQL backups   | —               |
| prometheus         | Metrics collection             | 9090            |
| grafana            | Dashboards & alerts            | 3100            |
| loki               | Log aggregation                | 3200            |
| promtail           | Log shipping                   | —               |
| cadvisor           | Container metrics              | 8080            |
| postgres-exporter  | PostgreSQL metrics             | 9187            |
| redis-exporter     | Redis metrics                  | 9121            |

---

## Prerequisites

### Development Machine

- Node.js >= 20
- pnpm 9.15+
- Docker & Docker Compose V2
- Git
- Make (GNU Make)

### Production Server

- Ubuntu 22.04+ or Debian 12+
- 2+ CPU cores, 4GB+ RAM (minimum)
- 40GB+ SSD storage
- Docker & Docker Compose V2
- Domain name pointing to server IP

---

## Server Setup

### Automated Setup

Run on a **fresh Ubuntu/Debian server** as root:

```bash
# Clone the repository
git clone <REPO_URL> /opt/bms-hostel
cd /opt/bms-hostel

# Run the automated setup
chmod +x scripts/setup-server.sh
sudo ./scripts/setup-server.sh
```

This will:
- Install Docker & Docker Compose
- Create a `deploy` user with Docker access
- Configure UFW firewall (22, 80, 443)
- Set up swap on low-memory servers
- Apply kernel tuning (sysctl)
- Configure log rotation

### Environment Configuration

```bash
# Copy the example and fill in production values
cp .env.production.example .env.production
nano .env.production
```

**Critical variables to set:**

```env
DATABASE_URL=postgresql://bms_user:<STRONG_PASSWORD>@postgres:5432/bms_hostel
POSTGRES_PASSWORD=<STRONG_PASSWORD>
JWT_SECRET=<RANDOM_64_CHAR_STRING>
JWT_REFRESH_SECRET=<RANDOM_64_CHAR_STRING>
DOMAIN=yourdomain.com
GRAFANA_ADMIN_PASSWORD=<STRONG_PASSWORD>
```

Generate secure secrets:

```bash
openssl rand -hex 32   # For JWT secrets
openssl rand -hex 16   # For passwords
```

---

## First Deployment

### Option A: One Command (Makefile)

```bash
make deploy
```

### Option B: Manual Steps

```bash
# 1. Build images
docker compose -f docker-compose.prod.yml --env-file .env.production build

# 2. Start infrastructure (DB, Redis)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

# 3. Wait for DB, then run migrations
sleep 10
docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
  npx prisma migrate deploy

# 4. Seed the database
docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
  npx prisma db seed

# 5. Start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Verify Deployment

```bash
make status                # CLI health dashboard
curl http://localhost/api/v1/health   # API health check
```

---

## Day-to-Day Operations

### Quick Reference

| Command               | What it does                          |
|----------------------|---------------------------------------|
| `make deploy`        | One-step production deploy            |
| `make status`        | Health dashboard                      |
| `make logs`          | Tail all logs                         |
| `make logs-api`      | Tail API logs only                    |
| `make logs-web`      | Tail web logs only                    |
| `make backup`        | Create database backup                |
| `make rollback`      | Rollback to previous deployment       |
| `make up`            | Start production stack                |
| `make down`          | Stop production stack                 |
| `make ps`            | Show running containers               |
| `make migrate-prod`  | Run pending DB migrations             |

### Deploying Updates

```bash
# Pull latest code
git pull origin main

# Deploy (handles build, migrate, restart, health check)
make deploy
```

### Viewing Logs

```bash
# All services
make logs

# Specific service
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f web
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f nginx
```

---

## Monitoring

### Grafana Dashboard

Access at `http://monitor.yourdomain.com` (or `http://<server-ip>:3100` if DNS not configured).

**Default credentials:** Set via `GRAFANA_ADMIN_PASSWORD` in `.env.production`.

**Pre-configured dashboards:**
- **BMS Overview** — API health, DB stats, Redis memory, container metrics, request rates, recent logs

### Prometheus

Internal access at `http://<server-ip>:9090`.

**Alert Rules** (12 rules, 4 groups):
- **API**: Instance down, high response time (>2s), high error rate (>5%)
- **Database**: Instance down, high connections (>80%), slow queries, disk >85%
- **Redis**: Instance down, high memory (>80%)
- **Infrastructure**: High CPU (>80%), high memory (>85%), container restarts

### Log Aggregation

Logs from all containers are shipped via Promtail → Loki → Grafana.

Query logs in Grafana → Explore → Loki:

```logql
{container_name=~"bms_api.*"} |= "error"
{container_name=~"bms_nginx.*"} | json | status >= 500
```

---

## Backup & Restore

### Automated Backups

The `db-backup` service runs daily at 2:00 AM UTC (configurable in `docker-compose.prod.yml`).

Backups are stored in `./backups/` with 30-day retention.

### Manual Backup

```bash
make backup
# Creates: backups/bms_hostel_YYYYMMDD_HHMMSS.dump
```

### Restore

```bash
# List available backups
ls -la backups/

# Restore a specific backup
make restore FILE=backups/bms_hostel_20260308_020000.dump
```

**Warning:** Restore stops the API, replaces the database, then restarts. A safety backup is created before restoring.

---

## Rollback

If a deployment causes issues:

```bash
make rollback
```

This will:
1. Read the saved rollback state (`rollback/last-deploy.state`)
2. Check out the previous Git commit
3. Rebuild Docker images
4. Restart services
5. Verify health

**Automatic rollback** is also triggered in the CD pipeline if post-deploy health checks fail.

---

## SSL / HTTPS Setup

### Option A: Let's Encrypt with Certbot

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificates
certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com -d monitor.yourdomain.com

# Copy certs to infra/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem infra/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem infra/nginx/ssl/
```

Then uncomment the SSL sections in `infra/nginx/conf.d/default.conf` and restart Nginx:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart nginx
```

### Auto-Renewal

```bash
# Add cron job
echo "0 3 * * * certbot renew --quiet && docker compose -f /opt/bms-hostel/docker-compose.prod.yml restart nginx" | crontab -
```

---

## Scaling

### Horizontal API Scaling

Scale the API service:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --scale api=3
```

Nginx upstream will automatically load-balance across instances.

### Database Scaling

For read-heavy workloads:
1. Set up PostgreSQL streaming replication
2. Configure Prisma to use read replicas
3. Update connection strings in `.env.production`

### Resource Tuning

Edit `docker-compose.prod.yml` resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'       # Increase CPU limit
      memory: 1024M     # Increase memory limit
```

PostgreSQL tuning: Edit `infra/postgres/postgresql.conf` — values are tuned for 2 CPU / 2GB RAM by default.

---

## Troubleshooting

### Container won't start

```bash
# Check container logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs <service>

# Check container details
docker inspect bms_<service>
```

### Database connection issues

```bash
# Verify PostgreSQL is accepting connections
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres \
  pg_isready -U bms_user -d bms_hostel

# Check active connections
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres \
  psql -U bms_user -d bms_hostel -c "SELECT count(*) FROM pg_stat_activity;"
```

### API health check failing

```bash
# Direct container check
docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
  wget -qO- http://localhost:3001/api/v1/health

# Check environment
docker compose -f docker-compose.prod.yml --env-file .env.production exec api env | grep DATABASE
```

### Disk space issues

```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a --volumes

# Remove old backups (keep last 5)
ls -t backups/*.dump | tail -n +6 | xargs rm -f
```

### Reset everything

```bash
# Stop all containers, remove volumes (DESTRUCTIVE)
docker compose -f docker-compose.prod.yml --env-file .env.production down -v

# Redeploy from scratch
make deploy
```

---

## CI/CD Pipeline

### Continuous Integration (`.github/workflows/ci.yml`)

Triggered on every push and PR:

```
quality → test → e2e → security → build
  │         │      │       │         │
  │         │      │       │         └─ Docker build + push to GHCR
  │         │      │       └─ pnpm audit + Trivy scan
  │         │      └─ E2E tests with real DB
  │         └─ Unit tests with coverage
  └─ Lint + TypeCheck + Format
```

### Continuous Deployment (`.github/workflows/deploy.yml`)

Triggered automatically when CI passes on `main`, or manually via workflow dispatch:

```
gate → backup → deploy → verify → rollback (if verify fails)
```

### GitHub Secrets Required

| Secret                    | Description                         |
|--------------------------|-------------------------------------|
| `DEPLOY_HOST`            | Production server IP/hostname       |
| `DEPLOY_SSH_KEY`         | SSH private key for deploy user     |
| `DEPLOY_USER`            | SSH username (default: `deploy`)    |
| `DEPLOY_PATH`            | App path (default: `/opt/bms-hostel`)|
| `PRODUCTION_ENV`         | Full `.env.production` contents     |

Set these in GitHub → Settings → Secrets → Actions.

---

## File Structure

```
├── .dockerignore                         # Docker build exclusions
├── .env.production.example               # Production env template
├── .github/workflows/
│   ├── ci.yml                            # CI pipeline
│   └── deploy.yml                        # CD pipeline
├── apps/
│   ├── api/Dockerfile                    # API Docker image
│   └── web/Dockerfile                    # Web Docker image
├── docker-compose.prod.yml               # Production stack (14 services)
├── infra/
│   ├── monitoring/
│   │   ├── alert-rules.yml               # Prometheus alert rules
│   │   ├── grafana/                      # Dashboards + provisioning
│   │   ├── loki.yml                      # Log aggregation config
│   │   ├── prometheus.yml                # Metrics scrape config
│   │   └── promtail.yml                  # Log shipping config
│   ├── nginx/
│   │   ├── conf.d/default.conf           # Virtual hosts
│   │   └── nginx.conf                    # Main Nginx config
│   └── postgres/
│       └── postgresql.conf               # DB production tuning
├── Makefile                              # One-step commands
└── scripts/
    ├── backup.sh                         # Database backup
    ├── deploy.sh                         # One-step deploy
    ├── restore.sh                        # Database restore
    ├── rollback.sh                       # Deployment rollback
    ├── setup-server.sh                   # Server bootstrap
    └── status.sh                         # Health dashboard
```
