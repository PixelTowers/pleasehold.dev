# pleasehold.dev

## What This Is

An API-first waitlist and demo-booking SaaS that lets developers offload signup capture from their landing pages. Developers integrate via API key, configure what data to collect (email only, email + name, etc.) and how to get notified (email, Slack, webhook, Discord, Telegram). Includes a management dashboard for browsing entries, tracking status, and exporting data. Open source and self-hostable via Docker.

## Core Value

Developers can add a waitlist or demo-booking form to any landing page in minutes by hitting an API — no backend work, no form infrastructure, just a token and a POST request.

## Requirements

### Validated

- ✓ Developer can create an account and manage projects via web dashboard — v1.0
- ✓ Developer can generate API keys scoped to a project — v1.0
- ✓ Developer can configure a project as "waitlist" mode or "book a demo" mode — v1.0
- ✓ Developer can configure which fields to collect (email, name, company, message, custom fields) — v1.0
- ✓ External users can submit entries via authenticated API (POST with API key) — v1.0
- ✓ Developer can view all collected entries in the dashboard — v1.0
- ✓ Developer can configure notification channels (email, Slack, webhook, Discord, Telegram) when new entries arrive — v1.0
- ✓ Notifications are delivered asynchronously via background jobs — v1.0
- ✓ Developer can export entries (CSV) — v1.0
- ✓ The entire product is self-hostable via a single `docker-compose up` — v1.0
- ✓ API is documented and developer-friendly — v1.0

- ✓ Manual QA of every user flow — signup through notifications, Docker deployment — v1.1
- ✓ Fix integration gaps found in v1.0 audit (worker API_URL, pending_verification filter) — v1.1
- ✓ Fix all 8 tech debt items from v1.0 audit — v1.1
- ✓ Every end-to-end flow works without surprises — v1.1

### Active

<!-- No active milestone — ready for v1.2 feature planning -->

(none)

## Latest Milestone: v1.1 QA & Hardening (Shipped)

**Goal:** Manually QA every user flow, fix all bugs and tech debt from v1.0 — leave the product solid before building new features.

**Delivered:**
- Type-safe TanStack Router navigation replacing all `window.location.href` redirects
- tsup build configs for API and worker enabling local `pnpm build`
- Docker fixes: root tsconfig in builds, Zod v3/v4 conflict resolved, generate-then-migrate flow
- Actionable SMTP missing-config warning with feature list
- Integration test harness with ephemeral PostgreSQL, 8 passing tests (no mocks)
- Full QA walkthrough: 40/40 manual steps passed
- Dead code removal and nginx `/health` proxy

### Out of Scope

- Embeddable widget/UI — developers build their own forms, pleasehold is API-only
- Calendar integration for demo booking — pleasehold captures intent, owner follows up manually
- Payment processing — no billing in v1
- Mobile app — web dashboard only
- Real-time features (WebSocket/SSE) — polling or manual refresh is fine for v1
- Referral / viral loop system — expose data for devs to build their own
- Email marketing / drip campaigns — use webhooks to pipe to existing email tools
- Landing page builder — developers already have their own sites
- AI features — API-first design is already AI-agent friendly

## Context

Shipped v1.1 (QA & Hardening) with 8,335 lines of TypeScript. All 8 tech debt items from v1.0 resolved. 15/15 requirements satisfied, 40/40 manual QA steps passed.

**Tech stack:** TypeScript monorepo (pnpm + Turborepo) — Hono + tRPC (API), Drizzle + PostgreSQL (data), React 19 + Vite (dashboard), BullMQ + Redis (jobs), Better Auth (auth), Biome (quality), Vitest (testing), Docker + nginx (deployment).

**Architecture:** `apps/api` (Hono server with REST + tRPC), `apps/web` (React 19 SPA), `apps/worker` (BullMQ processor), `packages/db` (Drizzle schema), `packages/trpc` (tRPC routers), `packages/auth` (Better Auth config).

**Reference codebase:** GoldenBerry (`/Users/christopher.jimenez/Src/PixelTowers/GoldenBerry`) uses the same stack and monorepo structure.

## Constraints

- **Stack:** TypeScript monorepo (pnpm + Turborepo) — Hono + tRPC (API), Drizzle + PostgreSQL (data), React 19 + Vite (dashboard), BullMQ + Redis (jobs), Better Auth (auth), Biome (quality), Vitest (testing)
- **Self-hosting:** Must run via `docker-compose up` with PostgreSQL + Redis as infrastructure dependencies
- **API design:** All entry submission endpoints must be simple REST (not tRPC) — external developers need a plain HTTP API with API key auth. tRPC is for the internal dashboard ↔ API communication
- **Monorepo structure:** `apps/api`, `apps/web` (dashboard), `apps/worker` (BullMQ), `packages/*` (shared code)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GoldenBerry stack | Proven stack Chris is already productive with — Hono, tRPC, Drizzle, React 19, Turborepo | ✓ Good |
| API-only (no widget) | Frontend forms are cheap to build — pleasehold's value is the backend + dashboard | ✓ Good |
| REST for public API, tRPC for dashboard | External devs need simple HTTP; dashboard benefits from type-safe RPC | ✓ Good |
| Two modes, one entity | Waitlist vs demo-booking is a config flag, not separate product surfaces | ✓ Good |
| Docker for self-hosting | Single `docker-compose up` is the simplest self-hosting story | ✓ Good |
| PostgreSQL + Redis | Postgres for data, Redis for BullMQ job queue and notification delivery | ✓ Good |
| Better Auth with apiKey plugin | Metadata workaround for project scoping (native support pending Issue #4746) | ⚠️ Revisit |
| BullMQ noeviction policy | Redis must use noeviction to prevent silent job loss — validated at worker startup | ✓ Good |
| Path-specific CORS | `origin:*` for public API, restricted for dashboard routes — prevents header collision | ✓ Good |
| Dedup returns 200 (not 409) | Idempotent behavior for duplicate email submissions per ENTR-03 | ✓ Good |
| OpenAPI via @hono/zod-openapi | v0.19.10 for zod v3 compat; schemas are documentation-only, runtime uses dynamic validation | ✓ Good |
| nginx reverse proxy in Docker | Preferred over VITE_API_URL build-time env for API routing | ✓ Good |

---
*Last updated: 2026-02-26 after v1.1 milestone shipped*
