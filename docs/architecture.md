# BMS Hostel Platform — Architecture

## Overview

The BMS Hostel Platform is an enterprise-grade hostel management system designed for colleges and universities. It covers the full student lifecycle: registration, room allotment, payments, gate management, mess management, visitor/parcel operations, complaints, and reporting.

## Architecture Style

**Modular Monolith** — a single deployable NestJS application with clean domain module boundaries. Each module encapsulates its own controller, service, DTOs, entities, and tests. This provides:

- Simple deployment and operations
- Transactional consistency across modules
- Clear pathway to microservices if needed later
- Low operational overhead for small-to-medium deployments

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    Client Applications                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Next.js Web  │  │  Expo Mobile │  │  External    │    │
│  │  Admin Portal │  │  Student App │  │  Integrations│    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼─────────────┘
          │     HTTPS/REST + WebSocket        │
          ▼                 ▼                 ▼
┌───────────────────────────────────────────────────────────┐
│                      API Gateway Layer                     │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │   Helmet     │  │  CORS    │  │  Rate Limiting     │   │
│  │   Security   │  │  Policy  │  │  (Throttler)       │   │
│  └─────────────┘  └──────────┘  └────────────────────┘   │
└──────────────────────────┬────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────┐
│                  NestJS Application                        │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Auth   │  │  Users   │  │  Hostel  │  │  Finance │ │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Gate   │  │   Mess   │  │ Complaint│  │  Notice  │ │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Cross-cutting Concerns                   │ │
│  │  Audit │ RBAC │ Validation │ Error Handling │ Logging│ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────┬────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────┐
│                    Data & Infrastructure                    │
│  ┌──────────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │  PostgreSQL   │  │  Redis   │  │  S3-Compatible     │  │
│  │  (via Prisma) │  │  Cache + │  │  File Storage      │  │
│  │               │  │  Queues  │  │                    │  │
│  └──────────────┘  └──────────┘  └────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Project Structure

```
bms-hostel/
├── apps/
│   ├── api/              # NestJS backend (REST + WebSocket)
│   │   ├── prisma/       # Schema, migrations, seed
│   │   ├── src/
│   │   │   ├── auth/     # Authentication & authorization
│   │   │   ├── users/    # User management
│   │   │   ├── audit/    # Audit logging
│   │   │   ├── health/   # Health checks
│   │   │   ├── prisma/   # Database service
│   │   │   └── [future modules...]
│   │   └── test/         # E2E tests
│   ├── web/              # Next.js admin/portal (App Router)
│   ├── mobile/           # Expo React Native app
│   └── worker/           # BullMQ background jobs (Phase 2+)
├── packages/
│   ├── config/           # Shared tsconfigs
│   ├── types/            # Shared TypeScript types/enums
│   ├── ui/               # Shared UI components (Phase 2+)
│   └── sdk/              # Generated API client (Phase 2+)
├── docs/                 # Architecture, ERD, specs
├── docker-compose.yml    # Local dev infrastructure
└── turbo.json            # Monorepo task orchestration
```

## Module Design Pattern

Each domain module follows this structure:

```
module-name/
├── module-name.module.ts      # NestJS module definition
├── module-name.controller.ts  # HTTP endpoints
├── module-name.service.ts     # Business logic
├── dto/                       # Request/response DTOs with validation
├── guards/                    # Authorization guards (if module-specific)
├── decorators/                # Custom decorators
├── interfaces/                # TypeScript interfaces
└── *.spec.ts                  # Unit tests
```

## Auth & Security Architecture

- **JWT Access Tokens** (short-lived, 15m) for API authentication
- **JWT Refresh Tokens** (long-lived, 7d) stored as bcrypt hashes in DB
- **Refresh Token Rotation** — each refresh invalidates the old token
- **Token Reuse Detection** — if a revoked token is reused, all tokens for that user are revoked
- **RBAC** — Role-Based Access Control with roles and fine-grained permissions
- **Scoped Roles** — roles can be scoped to a specific hostel (via `hostelId`)
- **Rate Limiting** — per-endpoint throttling (5/min for login, 10/min for refresh)
- **Helmet** — HTTP security headers
- **CORS** — configured for frontend origins only
- **Input Validation** — class-validator on all DTOs, whitelist mode
- **Audit Logging** — all auth events and data mutations logged

## Database

- **PostgreSQL 16** via Prisma ORM
- UUID primary keys
- snake_case column naming (mapped from camelCase models)
- Comprehensive indexing on lookup fields
- Soft deletes where appropriate (status fields)
- Transaction-safe operations for multi-table writes

## Technology Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js 20 LTS | Stable, enterprise-supported |
| Backend | NestJS | Enterprise-grade, modular, TypeScript-native |
| ORM | Prisma | Type-safe, migrations, studio tool |
| Database | PostgreSQL | ACID, JSON support, proven at scale |
| Cache/Queue | Redis + BullMQ | Reliable job processing, caching |
| Frontend | Next.js (App Router) | SSR, ISR, enterprise React framework |
| Mobile | Expo + React Native | Cross-platform, rapid development |
| Validation | class-validator | NestJS ecosystem standard |
| Auth | JWT + Passport | Proven pattern, flexible strategies |
| Monorepo | Turborepo + pnpm | Fast builds, workspace dependency management |
| CI/CD | GitHub Actions | Universal, well-supported |

## Deployment Strategy

1. **Local**: Docker Compose (Postgres + Redis), Node.js apps
2. **Staging/Production**: Docker containers, environment-based config
3. **Database**: Prisma migrations with deploy command
4. **Static assets**: CDN-ready via Next.js output
