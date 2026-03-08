# BMS Hostel — CI/CD Complete Automation Setup Guide

> Step-by-step guide to set up fully automated CI/CD from zero to production.

---

## Table of Contents

1. [What You're Setting Up](#1-what-youre-setting-up)
2. [Prerequisites](#2-prerequisites)
3. [Step 1 — Push Code to GitHub](#step-1--push-code-to-github)
4. [Step 2 — Configure GitHub Secrets](#step-2--configure-github-secrets)
5. [Step 3 — Configure GitHub Variables](#step-3--configure-github-variables)
6. [Step 4 — Create GitHub Environments](#step-4--create-github-environments)
7. [Step 5 — Provision a Production Server](#step-5--provision-a-production-server)
8. [Step 6 — Generate & Deploy SSH Keys](#step-6--generate--deploy-ssh-keys)
9. [Step 7 — Bootstrap the Server](#step-7--bootstrap-the-server)
10. [Step 8 — Create the Production Environment File](#step-8--create-the-production-environment-file)
11. [Step 9 — First Deploy (Manual)](#step-9--first-deploy-manual)
12. [Step 10 — Verify Everything Works](#step-10--verify-everything-works)
13. [Step 11 — Configure DNS & SSL (Optional)](#step-11--configure-dns--ssl-optional)
14. [Step 12 — Test the Full Pipeline](#step-12--test-the-full-pipeline)
15. [How the Automation Works](#how-the-automation-works)
16. [Day-to-Day Workflow](#day-to-day-workflow)
17. [Make Commands Reference](#make-commands-reference)
18. [Monitoring Access](#monitoring-access)
19. [Troubleshooting](#troubleshooting)

---

## 1. What You're Setting Up

```
  Developer pushes code
          │
          ▼
  ┌───────────────────────────────────────────────────────────┐
  │                    CI PIPELINE (Automatic)                │
  │                                                           │
  │  ┌──────────┐  ┌──────────┐  ┌─────┐  ┌────────┐  ┌───┐ │
  │  │ Quality  │→ │   Test   │→ │ E2E │→ │Security│→ │Build│ │
  │  │ lint     │  │ unit     │  │ full│  │ audit  │  │Docker│ │
  │  │ types    │  │ tests    │  │ DB  │  │ trivy  │  │push │ │
  │  │ format   │  │ coverage │  │seed │  │ scan   │  │GHCR │ │
  │  └──────────┘  └──────────┘  └─────┘  └────────┘  └───┘ │
  └───────────────────────────┬───────────────────────────────┘
                              │ All pass on main branch
                              ▼
  ┌───────────────────────────────────────────────────────────┐
  │                    CD PIPELINE (Automatic)                │
  │                                                           │
  │  ┌──────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────┐ │
  │  │ Gate │→ │ Backup │→ │ Deploy │→ │ Verify │→ │Rollback│ │
  │  │CI OK?│  │ DB dump│  │ SSH    │  │ health │  │(auto  │ │
  │  │      │  │        │  │ deploy │  │ smoke  │  │if fail)│ │
  │  └──────┘  └────────┘  └────────┘  └────────┘  └──────┘ │
  └───────────────────────────────────────────────────────────┘
```

**End result:** Every `git push origin main` automatically tests, builds, deploys, verifies, and rolls back if anything fails. Zero manual intervention.

---

## 2. Prerequisites

On your **local development machine:**

| Tool | Minimum Version | Check with |
|------|----------------|------------|
| Node.js | 20+ | `node --version` |
| pnpm | 9.15+ | `pnpm --version` |
| Docker Desktop | Latest | `docker --version` |
| Git | 2.30+ | `git --version` |
| Make | GNU Make | `make --version` |

For your **production server:**

| Requirement | Specification |
|------------|---------------|
| OS | Ubuntu 22.04+ or Debian 12+ |
| CPU | 2+ cores |
| RAM | 4GB minimum (2GB for small deployments) |
| Disk | 40GB+ SSD |
| Network | Public IP address |
| Domain | (Optional) for HTTPS/SSL |

**Server providers that work:** AWS EC2, DigitalOcean, Hetzner, Linode, Railway, any VPS.

---

## Step 1 — Push Code to GitHub

If your code is not on GitHub yet:

```bash
# 1. Create a new repository on GitHub (https://github.com/new)
#    Name: BMS_hostel (or whatever you prefer)
#    Visibility: Private (recommended)

# 2. Connect and push
cd D:\Apps\hostel\BMS_hostel
git remote add origin https://github.com/YOUR_USERNAME/BMS_hostel.git
git push -u origin main
```

If already pushed (you've done this), skip to Step 2.

**Verify:** Go to `https://github.com/YOUR_USERNAME/BMS_hostel` and confirm you see your code.

---

## Step 2 — Configure GitHub Secrets

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → Secrets tab → "New repository secret"**

Create each of these secrets one by one:

### Secret 1: `DEPLOY_HOST`
```
YOUR_SERVER_IP
```
Example: `203.0.113.50` or `bms.yourdomain.com`

### Secret 2: `DEPLOY_USER`
```
deploy
```
This is the Linux user that the setup script creates. Use `deploy` unless you changed it.

### Secret 3: `DEPLOY_SSH_KEY`
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5...
...entire private key content...
-----END OPENSSH PRIVATE KEY-----
```
You'll generate this in Step 6. Paste the **entire** private key including the BEGIN/END lines.

### Secret 4: `DEPLOY_SSH_PORT`
```
22
```
Change only if your server uses a non-standard SSH port.

### Screenshot reference for where to find this:
```
GitHub Repo
  └→ Settings (top tab)
      └→ Secrets and variables (left sidebar)
          └→ Actions
              └→ Secrets tab
                  └→ "New repository secret" (green button)
```

---

## Step 3 — Configure GitHub Variables

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → Variables tab → "New repository variable"**

### Variable 1: `DEPLOY_PATH`
```
/opt/bms-hostel
```

### Variable 2: `API_URL`
```
http://YOUR_SERVER_IP
```
Or `https://api.yourdomain.com` once DNS is configured.

### Variable 3: `APP_URL`
```
http://YOUR_SERVER_IP
```
Or `https://yourdomain.com` once DNS is configured.

### Variable 4: `TURBO_TEAM` (Optional)
```
your-turbo-team-name
```
Only needed if you use Turborepo remote caching. Skip otherwise.

---

## Step 4 — Create GitHub Environments

Go to: **GitHub Repo → Settings → Environments → "New environment"**

### Environment 1: `staging`
1. Click "New environment"
2. Name: `staging`
3. Click "Configure environment"
4. No protection rules needed — just save

### Environment 2: `production`
1. Click "New environment"
2. Name: `production`
3. Click "Configure environment"
4. **Enable "Required reviewers"** — add yourself (recommended)
   - This means production deploys need manual approval
   - Remove this if you want fully unattended deploys
5. Save protection rules

---

## Step 5 — Provision a Production Server

Choose a cloud provider and create a server:

### DigitalOcean (example)
1. Go to https://cloud.digitalocean.com → Create → Droplets
2. Choose **Ubuntu 22.04 LTS**
3. Plan: **Regular $12/mo** (2 vCPU, 2GB RAM) or larger
4. Region: closest to your users (e.g., Bangalore/Mumbai for India)
5. Authentication: **SSH keys** (add your public key)
6. Create Droplet
7. Note the **IP address** — this is your `DEPLOY_HOST`

### AWS EC2 (example)
1. Launch instance → Ubuntu 22.04 → t3.small or larger
2. Create/download a key pair (.pem file)
3. Security group: Open ports 22, 80, 443
4. Allocate Elastic IP → Associate with instance
5. Note the **Elastic IP** — this is your `DEPLOY_HOST`

### Any other VPS
- Just make sure it runs Ubuntu 22.04+ and you have root SSH access.

---

## Step 6 — Generate & Deploy SSH Keys

On your **local machine** (PowerShell or Git Bash):

```bash
# Generate a dedicated deploy key
ssh-keygen -t ed25519 -C "bms-deploy" -f ~/.ssh/bms_deploy
```

When prompted:
- Passphrase: Leave empty (press Enter twice) — needed for automated deploys

This creates two files:
- `~/.ssh/bms_deploy` — **private key** (never share this)
- `~/.ssh/bms_deploy.pub` — **public key** (goes on server)

### Copy public key to server

```bash
# Option A: Using ssh-copy-id (Linux/Mac/Git Bash)
ssh-copy-id -i ~/.ssh/bms_deploy.pub root@YOUR_SERVER_IP

# Option B: Manual (if ssh-copy-id unavailable)
# 1. Display the public key
cat ~/.ssh/bms_deploy.pub
# 2. SSH into server
ssh root@YOUR_SERVER_IP
# 3. Add to authorized_keys
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
```

### Copy private key to GitHub Secret

```bash
# Display the PRIVATE key — copy the entire output
cat ~/.ssh/bms_deploy
```

Go back to GitHub → Secrets → edit `DEPLOY_SSH_KEY` → paste the **entire private key** output including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`.

### Test SSH connection

```bash
ssh -i ~/.ssh/bms_deploy root@YOUR_SERVER_IP "echo 'SSH works!'"
```

You should see: `SSH works!`

---

## Step 7 — Bootstrap the Server

SSH into your server:

```bash
ssh -i ~/.ssh/bms_deploy root@YOUR_SERVER_IP
```

Then run:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/BMS_hostel.git /opt/bms-hostel
cd /opt/bms-hostel

# Run the automated setup script
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

**What this does automatically:**
- ✅ Installs Docker & Docker Compose
- ✅ Creates a `deploy` user with Docker access
- ✅ Configures UFW firewall (ports 22, 80, 443 only)
- ✅ Sets up swap file on low-memory servers
- ✅ Applies kernel tuning (sysctl optimizations)
- ✅ Configures log rotation

### Set up SSH key for the deploy user

```bash
# Copy root's authorized keys to deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### Verify deploy user SSH access

```bash
# From your LOCAL machine
ssh -i ~/.ssh/bms_deploy deploy@YOUR_SERVER_IP "docker ps"
```

Should show an empty container list (no errors).

---

## Step 8 — Create the Production Environment File

Still on the server:

```bash
cd /opt/bms-hostel
cp .env.production.example .env.production
nano .env.production   # or vim, use whatever editor you prefer
```

### Generate secure passwords first

Run these commands to generate random secrets:

```bash
# Generate JWT secret (64 chars)
echo "JWT_SECRET: $(openssl rand -hex 32)"

# Generate database password
echo "DB_PASSWORD: $(openssl rand -hex 16)"

# Generate Redis password
echo "REDIS_PASSWORD: $(openssl rand -hex 16)"

# Generate Grafana admin password
echo "GRAFANA_PASSWORD: $(openssl rand -hex 16)"

# Generate admin seed password
echo "ADMIN_PASSWORD: $(openssl rand -base64 16)@1"
```

### Fill in .env.production

Replace every `CHANGE_ME_*` placeholder. The critical ones:

```env
# Database — use the generated password
DB_PASSWORD=<paste-generated-db-password>
DATABASE_URL=postgresql://bms_prod:<paste-generated-db-password>@postgres:5432/bms_hostel?schema=public

# Redis — use the generated password
REDIS_PASSWORD=<paste-generated-redis-password>

# JWT — use the generated secret
JWT_SECRET=<paste-generated-jwt-secret>

# URLs — use your server IP for now (or domain if DNS is set up)
FRONTEND_URL=http://YOUR_SERVER_IP
API_PUBLIC_URL=http://YOUR_SERVER_IP

# Grafana
GRAFANA_PASSWORD=<paste-generated-grafana-password>

# Admin account
SEED_ADMIN_PASSWORD=<paste-generated-admin-password>
```

Save and exit (`Ctrl+X` → `Y` → `Enter` in nano).

### Verify no CHANGE_ME values remain

```bash
grep "CHANGE_ME" .env.production
# Should output NOTHING. If it shows results, edit the file again.
```

---

## Step 9 — First Deploy (Manual)

This first deploy is done manually on the server to verify everything works before enabling automated deploys.

```bash
cd /opt/bms-hostel

# Make all scripts executable
chmod +x scripts/*.sh

# Run the deployment
./scripts/deploy.sh
```

### What happens during deploy:

```
[14:30:01] ═══════════════════════════════════════════════════
[14:30:01]   BMS Hostel — Deploy Starting
[14:30:01] ═══════════════════════════════════════════════════
[14:30:01] Running preflight checks...
[14:30:01] ✓ Preflight checks passed
[14:30:02] Saving rollback state...
[14:30:02] ✓ Rollback state saved
[14:30:03] Building Docker images...               ← Takes 3-5 minutes first time
[14:33:15] ✓ Docker images built
[14:33:16] Starting infrastructure (postgres, redis)...
[14:33:20] Waiting for PostgreSQL...
[14:33:30] ✓ PostgreSQL is ready
[14:33:31] Running database migrations...
[14:33:35] ✓ Migrations applied
[14:33:36] Starting API service...
[14:33:40] Starting Web service...
[14:33:42] Starting Nginx...
[14:33:43] Starting monitoring stack...
[14:33:50] Running health checks...
[14:34:00] ✓ API health check passed
[14:34:01] ✓ Deploy complete!
```

If you see `✓ Deploy complete!` — your server is running.

---

## Step 10 — Verify Everything Works

### From the server:

```bash
# CLI health dashboard
./scripts/status.sh

# Manual checks
curl http://localhost/api/v1/health          # Should return {"status":"ok"}
curl http://localhost                         # Should return HTML (Next.js dashboard)
```

### From your browser:

| URL | What you should see |
|-----|-------------------|
| `http://YOUR_SERVER_IP` | BMS Web Dashboard login page |
| `http://YOUR_SERVER_IP/api/v1/health` | `{"status":"ok"}` JSON |
| `http://YOUR_SERVER_IP:3100` | Grafana login page |

### Grafana login:
- Username: `admin`
- Password: the `GRAFANA_PASSWORD` you set in `.env.production`
- Pre-loaded dashboard: **BMS Overview** (API health, DB stats, container metrics)

### If something fails:

```bash
# Check container status
docker ps -a

# Check specific container logs
docker logs bms_api --tail 50
docker logs bms_web --tail 50
docker logs bms_nginx --tail 50
docker logs bms_postgres --tail 50
```

Common issues:
- **API won't start:** Check `DATABASE_URL` in `.env.production` matches `DB_PASSWORD`
- **Nginx 502:** API or Web container not healthy yet — wait 30 seconds
- **Database connection refused:** PostgreSQL still starting — wait and retry

---

## Step 11 — Configure DNS & SSL (Optional)

### DNS Setup

Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add these A records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` (or `bms.yourdomain.com`) | `YOUR_SERVER_IP` | 300 |
| A | `api` (or `api.bms.yourdomain.com`) | `YOUR_SERVER_IP` | 300 |
| A | `monitor` (or `monitor.bms.yourdomain.com`) | `YOUR_SERVER_IP` | 300 |

Wait 5-10 minutes for DNS propagation. Verify:

```bash
ping yourdomain.com     # Should resolve to your server IP
```

### SSL with Let's Encrypt

On your server:

```bash
# Install certbot
apt install -y certbot

# Get certificates (server must be accessible on port 80)
# Stop nginx temporarily
docker stop bms_nginx

certbot certonly --standalone \
  -d yourdomain.com \
  -d api.yourdomain.com \
  -d monitor.yourdomain.com

# Copy certs
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/bms-hostel/infra/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/bms-hostel/infra/nginx/ssl/

# Restart nginx
docker start bms_nginx
```

Then uncomment the SSL server blocks in `/opt/bms-hostel/infra/nginx/conf.d/default.conf` and restart:

```bash
docker restart bms_nginx
```

### SSL Auto-Renewal

```bash
# Add cron job for automatic renewal
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --pre-hook 'docker stop bms_nginx' --post-hook 'docker start bms_nginx'") | crontab -
```

### Update environment variables

After DNS is configured, update:

1. **`.env.production` on the server:**
   ```env
   FRONTEND_URL=https://yourdomain.com
   API_PUBLIC_URL=https://api.yourdomain.com
   GRAFANA_URL=https://monitor.yourdomain.com
   ```

2. **GitHub Variables:**
   - `API_URL` → `https://api.yourdomain.com`
   - `APP_URL` → `https://yourdomain.com`

3. Redeploy: `./scripts/deploy.sh`

---

## Step 12 — Test the Full Pipeline

Now test that the full automation works end-to-end.

### On your local machine:

```bash
cd D:\Apps\hostel\BMS_hostel

# Make a trivial change
echo "# CI/CD test" >> README.md

# Commit and push
git add README.md
git commit -m "ci: test automated pipeline"
git push origin main
```

### Watch the pipeline:

1. Go to **GitHub → Your Repo → Actions tab**
2. You should see the **CI** workflow start automatically
3. Watch the jobs execute in order:
   - ✅ Quality Checks (lint, typecheck, format)
   - ✅ Unit Tests (with real Postgres + Redis)
   - ✅ E2E Tests (with seeded database)
   - ✅ Security Scan (audit + Trivy)
   - ✅ Build (Docker images pushed to GHCR)
4. After CI passes, **Deploy** workflow triggers automatically:
   - ✅ Gate (confirms CI passed)
   - ✅ Backup (pre-deploy database dump)
   - ✅ Deploy (SSH into server, runs deploy.sh)
   - ✅ Verify (health checks + smoke test)
5. If verify fails → automatic Rollback runs

### If production environment has "Required reviewers":

After CI passes, the Deploy workflow will **pause** waiting for approval:
1. You'll get a GitHub notification/email
2. Go to **Actions → Deploy workflow run → Review deployments**
3. Select "production" → click **"Approve and deploy"**
4. Deploy continues from there

### Verify the deploy reached your server:

```bash
ssh -i ~/.ssh/bms_deploy deploy@YOUR_SERVER_IP
cd /opt/bms-hostel
./scripts/status.sh
git log --oneline -1   # Should show your test commit
```

**If all of the above works — your CI/CD is fully automated. You're done.**

---

## How the Automation Works

### What triggers what:

| Event | What runs | What happens |
|-------|----------|-------------|
| Push to `main` | CI → CD | Full test + auto deploy |
| Push to `develop` | CI only | Tests, no deploy |
| Push to `release/**` | CI → Build | Tests + Docker build |
| PR to `main` or `develop` | CI only | Tests (no build, no deploy) |
| Manual trigger | CD only | Deploy to chosen environment |

### CI Pipeline breakdown:

```
┌─────────────────────────────────────────────────────────────┐
│ quality (10 min timeout)                                     │
│   ├── pnpm install --frozen-lockfile                        │
│   ├── prisma generate                                       │
│   ├── turbo lint             (ESLint across all apps)       │
│   ├── tsc --noEmit (api)     (TypeScript check)             │
│   ├── tsc --noEmit (web)     (TypeScript check)             │
│   └── format:check           (Prettier check)               │
│                                                              │
│ test (15 min timeout) ← runs after quality passes            │
│   ├── Starts: PostgreSQL 16 + Redis 7 containers           │
│   ├── prisma migrate deploy  (apply migrations)             │
│   ├── jest --coverage        (unit tests with coverage)     │
│   └── Upload coverage artifact (7-day retention)            │
│                                                              │
│ e2e (20 min timeout) ← runs after quality passes             │
│   ├── Starts: PostgreSQL 16 + Redis 7 containers           │
│   ├── prisma migrate deploy                                 │
│   ├── prisma db seed         (seed test data)               │
│   └── test:e2e               (end-to-end tests)            │
│                                                              │
│ security (10 min timeout) ← runs after quality passes        │
│   ├── pnpm audit --prod      (dependency vulnerabilities)   │
│   └── Trivy filesystem scan  (CRITICAL + HIGH severity)     │
│                                                              │
│ build (20 min timeout) ← runs after test + e2e + security    │
│   ├── Only on push to main or release/** branches           │
│   ├── Docker Buildx (multi-layer caching)                   │
│   ├── Build apps/api/Dockerfile → ghcr.io/*/bms-api         │
│   ├── Build apps/web/Dockerfile → ghcr.io/*/bms-web         │
│   ├── Tags: sha, branch, semver, latest                     │
│   └── Push to GitHub Container Registry (GHCR)             │
└─────────────────────────────────────────────────────────────┘
```

### CD Pipeline breakdown:

```
┌─────────────────────────────────────────────────────────────┐
│ gate                                                         │
│   └── Check: CI passed? If not, stop.                       │
│                                                              │
│ backup ← after gate                                          │
│   └── SSH → server → ./scripts/backup.sh                    │
│       (pg_dump with rotation, keep last 20)                 │
│                                                              │
│ deploy ← after gate + backup                                 │
│   └── SSH → server → ./scripts/deploy.sh $COMMIT_SHA        │
│       ├── Save rollback state                               │
│       ├── git pull                                           │
│       ├── docker compose build                              │
│       ├── prisma migrate deploy                             │
│       ├── Rolling restart (zero-downtime)                   │
│       └── Health check loop                                 │
│                                                              │
│ verify ← after deploy succeeds                               │
│   ├── Wait 30s for services to stabilize                    │
│   ├── API health: GET /api/v1/health (10 retries)           │
│   ├── Web health: GET / (expect 200)                        │
│   └── Smoke test: POST /api/v1/auth/login (expect 401)     │
│                                                              │
│ rollback ← only if verify FAILS                              │
│   └── SSH → server → ./scripts/rollback.sh                  │
│       ├── Restore previous git commit                       │
│       ├── Rebuild & restart                                 │
│       └── GitHub warning annotation                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Day-to-Day Workflow

After setup is complete, this is your entire deployment process:

```bash
# 1. Write code, make changes
# 2. Commit
git add .
git commit -m "feat: add room swap feature"

# 3. Push — everything else is automatic
git push origin main

# 4. (Optional) Watch progress
#    GitHub → Actions tab
```

That's it. The pipeline handles lint, test, build, deploy, verify, rollback.

### Manual deploy (when needed):

**From GitHub:**
1. Go to **Actions → Deploy → Run workflow**
2. Choose environment: `staging` or `production`
3. Click **Run workflow**

**From server:**
```bash
cd /opt/bms-hostel
make deploy       # or: ./scripts/deploy.sh
```

---

## Make Commands Reference

Run from the project root (locally or on server):

| Command | Description |
|---------|-------------|
| **Development** | |
| `make dev` | Start local dev (postgres + redis + api + web) |
| `make seed` | Seed database with sample data |
| `make studio` | Open Prisma Studio (visual DB editor) |
| **Build & Test** | |
| `make build` | Build all apps |
| `make test` | Run all unit tests |
| `make test-e2e` | Run E2E tests |
| `make lint` | Lint all code |
| `make typecheck` | TypeScript type checking |
| `make ci` | Run full CI locally (lint → types → test → build) |
| **Production** | |
| `make deploy` | **One-step deploy to production** |
| `make deploy-sha SHA=abc123` | Deploy a specific git commit |
| `make rollback` | Rollback to previous deployment |
| `make backup` | Create database backup |
| `make restore FILE=path.dump` | Restore from a backup file |
| `make status` | Show system health dashboard |
| **Docker** | |
| `make up` | Start production stack |
| `make down` | Stop production stack |
| `make logs` | Tail all production logs |
| `make logs-api` | Tail API logs only |
| `make logs-web` | Tail Web logs only |
| `make ps` | Show running containers |
| **Maintenance** | |
| `make clean` | Clean builds + node_modules + docker prune |
| `make setup-server` | Bootstrap a fresh server (run as root) |
| `make migrate-prod` | Run pending DB migrations in production |

---

## Monitoring Access

| Service | URL | Credentials |
|---------|-----|-------------|
| Web Dashboard | `http://YOUR_SERVER_IP` | Admin login from seed |
| API Health | `http://YOUR_SERVER_IP/api/v1/health` | None |
| Grafana | `http://YOUR_SERVER_IP:3100` | `admin` / GRAFANA_PASSWORD |
| Prometheus | `http://YOUR_SERVER_IP:9090` (internal) | None |

### Grafana pre-loaded dashboard: "BMS Overview"

Panels:
- API / PostgreSQL / Redis health gauges
- Active Prometheus alerts
- Container CPU & memory usage
- API request rate (req/s)
- API p95 response time
- PostgreSQL connections & database size
- Redis memory usage & operations/sec
- Nginx request rate by HTTP status code
- Recent application logs (via Loki)

### Alert rules (12 rules, 4 groups):

| Group | Alert | Trigger |
|-------|-------|---------|
| API | Instance down | API unreachable for 1m |
| API | High response time | p95 > 2 seconds for 5m |
| API | High error rate | 5xx rate > 5% for 5m |
| Database | Instance down | PostgreSQL unreachable for 1m |
| Database | High connections | > 80% max connections for 5m |
| Database | Slow queries | Detected for 10m |
| Database | Disk space | > 85% used |
| Redis | Instance down | Redis unreachable for 1m |
| Redis | High memory | > 80% max memory |
| Infrastructure | High CPU | > 80% for 10m |
| Infrastructure | High memory | > 85% for 5m |
| Infrastructure | Container restarting | > 3 restarts in 15m |

---

## Troubleshooting

### CI pipeline fails

**Quality job fails:**
```
# Run locally to see the same errors
make lint          # Fix ESLint errors
make typecheck     # Fix TypeScript errors  
pnpm format:check  # Fix formatting: pnpm format:write
```

**Test job fails:**
```bash
# Run tests locally with real DB
docker compose up -d          # Start local postgres + redis
make test                     # See which tests fail
```

**Security job fails:**
```bash
pnpm audit --prod             # See vulnerable packages
pnpm update <package>         # Update the vulnerable one
```

### CD pipeline fails

**Backup fails:**
- SSH connection issue → check `DEPLOY_HOST`, `DEPLOY_SSH_KEY` secrets
- Script not executable → `ssh deploy@server "chmod +x /opt/bms-hostel/scripts/*.sh"`

**Deploy fails:**
- Check server logs: `ssh deploy@server "docker logs bms_api --tail 100"`
- Check deploy log: `ssh deploy@server "tail -50 /opt/bms-hostel/logs/deploy.log"`

**Verify fails (auto-rollback triggers):**
- API didn't start in time → check migration or env var issues
- Investigate then re-push or manually deploy

### Server issues

```bash
# SSH into server
ssh -i ~/.ssh/bms_deploy deploy@YOUR_SERVER_IP

# Check everything
cd /opt/bms-hostel
./scripts/status.sh                    # Full health dashboard

# Check individual service
docker logs bms_api --tail 50          # API logs
docker logs bms_web --tail 50          # Web logs
docker logs bms_nginx --tail 50        # Nginx logs
docker logs bms_postgres --tail 50     # Database logs

# Restart a service
docker restart bms_api

# Full redeploy
./scripts/deploy.sh

# Emergency rollback
./scripts/rollback.sh

# Database backup
./scripts/backup.sh

# Check disk space
df -h
docker system df                       # Docker disk usage
```

---

## Setup Checklist

Use this to track your progress:

- [ ] **Step 1:** Code pushed to GitHub
- [ ] **Step 2:** GitHub Secrets configured (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_SSH_PORT`)
- [ ] **Step 3:** GitHub Variables configured (`DEPLOY_PATH`, `API_URL`, `APP_URL`)
- [ ] **Step 4:** GitHub Environments created (`staging`, `production`)
- [ ] **Step 5:** Production server provisioned (Ubuntu 22.04+, 2+ CPU, 4GB+ RAM)
- [ ] **Step 6:** SSH keys generated and deployed (private → GitHub, public → server)
- [ ] **Step 7:** Server bootstrapped (`scripts/setup-server.sh`)
- [ ] **Step 7b:** Deploy user SSH access verified
- [ ] **Step 8:** `.env.production` created with real passwords (no CHANGE_ME remaining)
- [ ] **Step 9:** First manual deploy successful (`scripts/deploy.sh`)
- [ ] **Step 10:** All health checks pass (API, Web, Grafana)
- [ ] **Step 11:** DNS configured (optional)
- [ ] **Step 11b:** SSL certificates installed (optional)
- [ ] **Step 12:** Test push triggered full CI → CD pipeline successfully
- [ ] **Step 12b:** Verified new commit reached the server

**Once all boxes are checked — your CI/CD is fully automated.**
Every `git push origin main` = automatic test + build + deploy + verify + rollback-on-failure.
