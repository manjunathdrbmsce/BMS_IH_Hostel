# =============================================================================
# BMS Hostel — Makefile (One-Step Commands)
# =============================================================================
.PHONY: help dev build deploy rollback backup restore status logs clean setup

# Default
help: ## Show this help
	@echo "╔═══════════════════════════════════════════════════════════════╗"
	@echo "║              BMS Hostel — Command Reference                  ║"
	@echo "╚═══════════════════════════════════════════════════════════════╝"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Development ──────────────────────────────────────────────────────────
dev: ## Start local development (postgres + redis + api + web)
	docker compose up -d
	pnpm install
	pnpm --filter api run db:generate
	pnpm --filter api run db:migrate
	pnpm turbo dev

seed: ## Seed database with sample data
	pnpm --filter api run db:seed

studio: ## Open Prisma Studio
	pnpm --filter api run db:studio

# ─── Build & Test ─────────────────────────────────────────────────────────
build: ## Build all apps
	pnpm turbo build

test: ## Run all tests
	pnpm turbo test -- --passWithNoTests

test-e2e: ## Run E2E tests
	pnpm --filter api run test:e2e

lint: ## Lint all code
	pnpm turbo lint

typecheck: ## TypeScript type checking
	pnpm --filter api exec tsc --noEmit
	pnpm --filter web exec tsc --noEmit

ci: lint typecheck test build ## Run full CI pipeline locally

# ─── Production ───────────────────────────────────────────────────────────
deploy: ## One-step deploy to production
	@chmod +x scripts/*.sh
	./scripts/deploy.sh

deploy-sha: ## Deploy specific commit: make deploy-sha SHA=abc123
	@chmod +x scripts/*.sh
	./scripts/deploy.sh $(SHA)

rollback: ## Rollback to previous deployment
	@chmod +x scripts/*.sh
	./scripts/rollback.sh

backup: ## Create database backup
	@chmod +x scripts/*.sh
	./scripts/backup.sh

restore: ## Restore from backup: make restore FILE=backup_20260308.dump
	@chmod +x scripts/*.sh
	./scripts/restore.sh $(FILE)

status: ## Show system health status
	@chmod +x scripts/*.sh
	./scripts/status.sh

# ─── Docker ───────────────────────────────────────────────────────────────
up: ## Start production stack
	docker compose -f docker-compose.prod.yml --env-file .env.production up -d

down: ## Stop production stack
	docker compose -f docker-compose.prod.yml --env-file .env.production down

logs: ## Tail production logs
	docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail 100

logs-api: ## Tail API logs only
	docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail 100 api

logs-web: ## Tail web logs only
	docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail 100 web

ps: ## Show running containers
	docker compose -f docker-compose.prod.yml --env-file .env.production ps

# ─── Mobile ───────────────────────────────────────────────────────────────
mobile-dev: ## Start Expo dev server
	pnpm --filter mobile run dev

mobile-android: ## Build Android APK
	pnpm --filter mobile run android:release

# ─── Maintenance ──────────────────────────────────────────────────────────
clean: ## Clean build artifacts and node_modules
	pnpm turbo clean
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	docker system prune -f

setup-server: ## Bootstrap a fresh production server (run as root)
	@chmod +x scripts/setup-server.sh
	sudo ./scripts/setup-server.sh

migrate-prod: ## Run production database migrations
	docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
		npx prisma migrate deploy
