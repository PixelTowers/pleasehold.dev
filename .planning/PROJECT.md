# pleasehold.dev

## What This Is

An API-first waitlist and demo-booking SaaS that lets developers offload signup capture from their landing pages. Developers integrate via API key, configure what data to collect (email only, email + name, etc.) and how to get notified (email, Slack, webhook). Open source and self-hostable via Docker.

## Core Value

Developers can add a waitlist or demo-booking form to any landing page in minutes by hitting an API — no backend work, no form infrastructure, just a token and a POST request.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Developer can create an account and manage projects via web dashboard
- [ ] Developer can generate API keys scoped to a project
- [ ] Developer can configure a project as "waitlist" mode or "book a demo" mode
- [ ] Developer can configure which fields to collect (email, name, company, message, custom fields)
- [ ] External users can submit entries via authenticated API (POST with API key)
- [ ] Developer can view all collected entries in the dashboard
- [ ] Developer can configure notification channels (email, Slack, webhook) when new entries arrive
- [ ] Notifications are delivered asynchronously via background jobs
- [ ] Developer can export entries (CSV)
- [ ] The entire product is self-hostable via a single `docker-compose up`
- [ ] API is documented and developer-friendly

### Out of Scope

- Embeddable widget/UI — developers build their own forms, pleasehold is API-only
- Calendar integration for demo booking — pleasehold captures intent, owner follows up manually
- Payment processing — no billing in v1
- Mobile app — web dashboard only
- Real-time features (WebSocket/SSE) — polling or manual refresh is fine for v1

## Context

- **Reference codebase:** GoldenBerry (`/Users/christopher.jimenez/Src/PixelTowers/GoldenBerry`) uses the same stack and monorepo structure — use as architectural reference
- **Two modes, one product:** Waitlist and demo-booking are configuration modes on the same project entity, not separate features. The difference is which fields are required and how the notification is framed
- **API-first philosophy:** The UI (forms on developer sites) is "cheap" — pleasehold provides the backend infrastructure and management dashboard, not the frontend widget
- **Open source:** The product is fully open source and designed to be self-hosted. The hosted version at pleasehold.dev is the convenience/managed offering

## Constraints

- **Stack:** TypeScript monorepo (pnpm + Turborepo) — Hono + tRPC (API), Drizzle + PostgreSQL (data), React 19 + Vite (dashboard), Astro (landing), BullMQ + Redis (jobs), Better Auth (auth), Biome (quality), Vitest (testing)
- **Self-hosting:** Must run via `docker-compose up` with PostgreSQL + Redis as infrastructure dependencies
- **API design:** All entry submission endpoints must be simple REST (not tRPC) — external developers need a plain HTTP API with API key auth. tRPC is for the internal dashboard ↔ API communication
- **Monorepo structure:** `apps/api`, `apps/web` (dashboard), `apps/landing` (marketing site), `packages/*` (shared code)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GoldenBerry stack | Proven stack Chris is already productive with — Hono, tRPC, Drizzle, React 19, Turborepo | — Pending |
| API-only (no widget) | Frontend forms are cheap to build — pleasehold's value is the backend + dashboard | — Pending |
| REST for public API, tRPC for dashboard | External devs need simple HTTP; dashboard benefits from type-safe RPC | — Pending |
| Two modes, one entity | Waitlist vs demo-booking is a config flag, not separate product surfaces | — Pending |
| Docker for self-hosting | Single `docker-compose up` is the simplest self-hosting story | — Pending |
| PostgreSQL + Redis | Postgres for data, Redis for BullMQ job queue and notification delivery | — Pending |

---
*Last updated: 2025-02-25 after initialization*
