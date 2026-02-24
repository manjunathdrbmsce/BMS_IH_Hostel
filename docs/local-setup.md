# BMS Hostel Platform — Local Development Setup

## Prerequisites

- **Node.js** >= 20.x (LTS)
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)
- **Git**

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> bms-hostel
cd bms-hostel
pnpm install
```

### 2. Environment setup

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and set a secure JWT_SECRET (minimum 32 characters)
# The default values work for local development
```

### 3. Start infrastructure

```bash
# Start PostgreSQL and Redis via Docker
pnpm docker:up

# Verify containers are running
docker compose ps
```

### 4. Database setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations (creates tables)
pnpm db:migrate

# Seed roles, permissions, and super admin user
pnpm db:seed
```

### 5. Start the API

```bash
# Start NestJS in watch mode
pnpm --filter api dev
```

The API will be available at:
- **API**: http://localhost:3001/api/v1
- **Swagger docs**: http://localhost:3001/api/docs
- **Health check**: http://localhost:3001/api/v1/health

### 6. Start the web app (optional)

```bash
# In a separate terminal
pnpm --filter web dev
```

Web app at http://localhost:3000

### 7. Start the mobile app (optional)

```bash
# In a separate terminal
pnpm --filter mobile dev
```

## Default Credentials

After seeding, a super admin account is available:

| Field | Value |
|-------|-------|
| Email | admin@bms.local |
| Password | Admin@123456 |

**Change this immediately in production.**

## Testing

### Unit tests

```bash
pnpm --filter api test
```

### Unit tests with coverage

```bash
pnpm --filter api test:cov
```

### E2E / Integration tests

Requires a running database with seed data:

```bash
pnpm --filter api test:e2e
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm docker:up` | Start Postgres & Redis |
| `pnpm docker:down` | Stop Postgres & Redis |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:seed` | Seed roles + admin |
| `pnpm db:studio` | Open Prisma Studio GUI |
| `pnpm db:reset` | Reset DB (drop + migrate + seed) |
| `pnpm dev` | Start all apps (turbo) |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all apps |
| `pnpm test` | Run all unit tests |
| `pnpm format` | Format all code |

## API Quick Test

```bash
# Health check
curl http://localhost:3001/api/v1/health

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier": "admin@bms.local", "password": "Admin@123456"}'

# Get profile (use token from login response)
curl http://localhost:3001/api/v1/auth/me \
  -H 'Authorization: Bearer <access_token>'
```

## Troubleshooting

### Database connection errors
- Ensure Docker containers are running: `docker compose ps`
- Check DATABASE_URL in .env matches Docker ports
- Run `pnpm db:generate` after any schema changes

### Port conflicts
- API default: 3001 (change via APP_PORT in .env)
- Web default: 3000
- Postgres: 5432
- Redis: 6379

### Prisma issues
- After pulling schema changes: `pnpm db:generate && pnpm db:migrate`
- To reset everything: `pnpm db:reset`
