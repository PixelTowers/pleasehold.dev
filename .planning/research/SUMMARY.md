# Project Research Summary

**Project:** pleasehold.dev
**Domain:** API-first waitlist and demo-booking SaaS (open source, self-hostable)
**Researched:** 2026-02-25
**Confidence:** HIGH

## Executive Summary

pleasehold is an API-first, open-source waitlist and demo-booking backend. The core insight from competitive research is that every existing competitor (GetWaitlist, Prefinery, LaunchList, Waitlister, QueueForm) is widget-first with API access as an afterthought, closed-source, and not self-hostable. pleasehold occupies a genuine gap: the Cal.com of waitlists — open source, self-hostable via Docker Compose, and designed for developers who want full control over their frontend and data. The stack is not speculative; it mirrors the proven GoldenBerry reference codebase with only three net-new dependencies (`rate-limiter-flexible`, `papaparse`, `@hono/zod-validator`). This dramatically reduces integration risk.

The recommended architecture is a Turborepo monorepo with a single Hono server hosting both a public REST API (for external developer integrations) and an internal tRPC API (for the dashboard). A separate BullMQ worker process handles all async notifications (email via Resend, Slack via native fetch, webhooks with HMAC signing). Domain logic lives in a `packages/core` layer that both APIs call — this prevents the most dangerous dual-API failure mode: business logic drift. Better Auth's API key plugin handles key generation, hashing, and per-key rate limiting. The build order is well-defined: foundation packages first, then auth and core domain logic, then the API server, then the dashboard, then background workers, and finally Docker and the landing page.

The primary risks are security and compliance shaped. The highest-severity pitfall is not designing two API key tiers (publishable vs. secret) from day one — retrofitting this is a breaking change for every integrator. Close behind: cross-tenant data isolation requires a data-access-layer pattern from the first database query, because Drizzle does not inject tenant scoping automatically and one missed `WHERE project_id = ?` clause is a PII data leak. BullMQ requires Redis configured with `noeviction` — the default `allkeys-lru` eviction policy silently loses queued notification jobs under memory pressure. All three of these must be addressed in Phase 1 before any external developer touches the product.

## Key Findings

### Recommended Stack

The core stack is locked and proven in the GoldenBerry reference codebase: TypeScript 5.7, Hono 4.12, tRPC 11, Drizzle ORM 0.45 with postgres.js, BullMQ 5.70, Better Auth 1.4, React 19, Vite 6, Astro 5, Turborepo 2.4, pnpm 10, and Biome 2.4. Version compatibility has been verified against the npm registry as of the research date. Domain-specific additions are minimal and deliberate — `rate-limiter-flexible` for IP-based rate limiting (zero transitive dependencies, native ioredis support), `papaparse` for CSV export (handles Unicode, quoted fields, and newlines safely), and `@hono/zod-validator` for REST route input validation.

Key library decisions to lock in: Better Auth's built-in `apiKey` plugin handles API key generation, secure hashing, and per-key rate limiting — do not build custom key infrastructure. Webhook delivery is BullMQ + native `fetch` + `node:crypto` HMAC — do not add a webhook library. Slack notifications are a plain `fetch` POST to a webhook URL — do not install `@slack/webhook` (it pulls in `axios` for a single HTTP call). Native `crypto.randomUUID()` replaces the `uuid` package. Hono's built-in `secureHeaders` and `cors` middleware replace `helmet` and `cors` npm packages.

**Core technologies:**
- Hono + @hono/node-server: HTTP framework and Node.js adapter — lightweight, fast, proven in GoldenBerry
- tRPC v11 + @hono/trpc-server: Internal type-safe API for the dashboard — eliminates REST boilerplate for authenticated operations
- Drizzle ORM + postgres.js: Type-safe database access — SQL-first, no magic, proven with Better Auth's Drizzle adapter
- BullMQ + ioredis: Job queue for async notifications — retries, backoff, and dead-letter queues built in
- Better Auth (apiKey plugin): Authentication and API key management — handles hashing, verification, rate limiting, rotation
- rate-limiter-flexible: IP-based rate limiting on the public REST API — zero dependencies, native ioredis support
- papaparse: CSV export — handles all edge cases (commas in values, Unicode, BOM for Excel)
- Resend + React Email: Transactional email — TypeScript-first, JSX templates, proven in GoldenBerry

### Expected Features

The competitive landscape confirms that pleasehold's API-first, open-source, self-hostable positioning is genuinely unoccupied. GetWaitlist has no auth on its public API and no webhook support. Prefinery costs $49-499/month and is closed source. No competitor offers both waitlist and demo-booking modes, sandbox/test keys, or a `docker compose up` self-hosting story. The feature list for v1 is well-scoped; the most common failure mode in this space is building referral/viral systems and email marketing — both are explicit anti-features for pleasehold (webhooks handle both use cases for developers who want them).

**Must have (table stakes):**
- Email collection via authenticated REST API — the core product premise; API key auth required from day one
- Project creation with waitlist/demo-booking mode — config flag affecting field defaults and notification framing
- Configurable fields per project — schema-driven JSONB field config, at minimum email/name/company/message
- API key generation (project-scoped) — keys scoped to projects via Better Auth metadata; publishable vs. secret split required at design time
- Rate limiting on public submission endpoint — per-IP and per-key, must exist before external developers integrate
- Duplicate detection — unique constraint on (project_id, email); return existing entry with 200 on re-submission
- Dashboard entry viewer — sortable/filterable table with pagination and search
- Email notifications — async via BullMQ; configurable per-project on/off and recipient list
- Webhook notifications — HMAC-signed delivery with exponential backoff retries; delivery tracking table required
- CSV export — all fields, proper escaping via papaparse
- API documentation — OpenAPI spec auto-generated from Hono routes; curl examples; error response documentation
- Spam/bot protection — email format validation, disposable email blocking, rate limiting as first layer
- Docker Compose self-hosting — `docker compose up` runs the full stack; Redis configured with `noeviction`

**Should have (competitive differentiators):**
- Slack notifications — native, not via Zapier; plain fetch POST to webhook URL; same BullMQ pipeline as email/webhook
- Test/sandbox API keys — `ph_test_` prefix; test entries visible in dashboard with badge; no competitor offers this
- Entry metadata (custom JSON) — JSONB column for UTM params, referral source, A/B variant; GetWaitlist supports this, most others don't
- Double opt-in / email verification — verification token flow; configurable per-project; GDPR best practice
- Bulk status actions on entries — contacted/converted/archived status enum; critical for demo-booking mode follow-up
- Entry position / queue number — auto-incrementing per project; returned in API response; developer renders in their UI

**Defer (v2+):**
- Advanced analytics dashboard — signups over time, conversion funnel, source tracking
- Zapier/Make integration — webhooks cover 90% of automation needs for v1
- Custom email templates — default templates work for v1; add configurability after product-market fit
- GDPR deletion API (programmatic) — design data model to support it from day one, but full API can wait
- Audit log — enterprise-grade, not needed for v1
- Multi-user team access — design for it architecturally; ship single-user first

**Explicit anti-features (do not build):**
- Embeddable widget / JavaScript snippet — dilutes API-first positioning; competitors dominate this space
- Referral/viral loop system — 17 years of Prefinery proves this is a full product, not a feature
- Email marketing / drip campaigns — entire product category; use webhooks to integrate with existing tools
- Landing page builder — competitors do this; developers using pleasehold have their own sites
- Calendar/scheduling integration — Cal.com has raised millions to solve this; pleasehold captures intent, not scheduling
- Real-time updates (WebSocket/SSE) — polling at 30s intervals is fine for v1 dashboard

### Architecture Approach

The architecture follows the GoldenBerry pattern: a single Hono server at `apps/api` serves both the public REST API (`/api/v1/*` with API key auth) and the internal tRPC API (`/trpc/*` with session auth), plus Better Auth at `/api/auth/*`. A separate `apps/worker` process (BullMQ) handles all async notification delivery. Business logic lives in `packages/core`, which both the REST routes and tRPC procedures call — neither API surface contains business logic directly. This thin-adapter pattern is non-negotiable with a dual-API architecture; logic duplication across REST and tRPC handlers is the most common failure mode. Project-scoped API key auth is implemented by storing `projectId` in Better Auth's key metadata field; the auth middleware resolves the project from the key, making one key = one project with no request body manipulation required.

**Major components:**
1. `apps/api` — Single Hono server hosting REST, tRPC, and Better Auth; owns middleware and route definitions; delegates all business logic to packages/core
2. `apps/web` — React 19 SPA dashboard; TanStack Router for routing; tRPC React hooks for all data fetching; Better Auth browser client for session management
3. `apps/worker` — Separate BullMQ worker process; notification-dispatch fan-out to email-send, slack-notify, and webhook-dispatch queues; one shared db and Redis connection created at startup
4. `apps/landing` — Astro static site for marketing and API documentation; no API dependency at build time
5. `packages/core` — Framework-agnostic domain logic; called by both REST routes and tRPC procedures; prevents logic drift
6. `packages/db` — Drizzle schema and client factory; single source of truth for all table definitions; imported by both api and worker
7. `packages/auth` — Better Auth configuration with apiKey plugin; Hono middleware; browser client
8. `packages/trpc` — tRPC router, context, and protected procedure builders; routers per domain (project, entry, apiKey, notification, export, user)
9. `packages/shared` — Zod schemas and TypeScript types; single source of truth for "what is a valid entry"; used by REST validation, tRPC inputs, and dashboard form validation
10. `packages/email` — React Email templates; Resend client factory

### Critical Pitfalls

1. **API keys exposed in client-side code** — Design two key tiers from Phase 1: publishable keys (submission-only, IP-rate-limited, domain-restricted) and secret keys (full CRUD, never in browsers). This is a breaking change to retrofit; every integrator is affected if you get it wrong at launch.

2. **Cross-tenant data isolation failures** — Implement a data-access-layer (DAL) wrapper that automatically injects `project_id` filtering on all entry/project queries. Never query the entries table directly from route handlers. Add cross-tenant integration tests (two projects, assert no data leakage) from Phase 1.

3. **BullMQ Redis misconfiguration causing lost notifications** — Set `maxmemory-policy noeviction` in Redis configuration; validate this at application startup with a fail-fast check. Configure job auto-removal to prevent unbounded growth. Implement graceful shutdown (SIGINT/SIGTERM -> `worker.close()`). This must be correct when BullMQ is first introduced in Phase 2.

4. **Webhook delivery without retries, idempotency, or visibility** — Implement exponential backoff (10s, 30s, 1m, 5m, 30m, 2h), include `X-Webhook-ID` for deduplication, include HMAC signature, store delivery attempts in a `webhook_deliveries` table visible in the dashboard. A 10-second outgoing request timeout is mandatory to prevent worker stalls.

5. **Missing API versioning** — All public endpoints must be under `/v1/` prefix from the first line of code. This is listed in pitfalls because every team says "we'll add versioning later" and it always costs more than doing it first.

6. **GDPR/privacy non-compliance as a data processor** — Design entry schema with hard-delete capability, no PII in application logs, and a `created_at` timestamp for retention policies from Phase 1. The deletion API can come later, but the data model must support it from the start.

## Implications for Roadmap

Based on research, the build order defined in ARCHITECTURE.md maps cleanly to phases. The pitfalls research strongly confirms the ordering: Phase 1 must establish the security and data model foundations before any feature development, because retrofitting key scoping, tenant isolation, and API versioning after external developers integrate is a breaking change.

### Phase 1: Foundation and Core API

**Rationale:** Everything depends on the schema, auth, tenant isolation, and API key design. These cannot be retrofitted after external developers integrate. Three of the six critical pitfalls are Phase 1 concerns (API key exposure, cross-tenant isolation, rate limiting, GDPR data model, API versioning). The public submission endpoint and API key generation are the core value proposition — this is what developers will actually integrate with.
**Delivers:** Working `POST /api/v1/entries` endpoint with API key auth, rate limiting, duplicate detection, and project-scoped field validation. API key generation in the dashboard (publishable vs. secret split). Basic project creation with waitlist/demo-booking mode. Data-access-layer pattern established. All entries queryable in dashboard via tRPC.
**Addresses (from FEATURES.md):** Email collection via REST API, API key generation, configurable fields, two modes (waitlist/demo), rate limiting, duplicate detection, dashboard entry viewer, basic spam protection.
**Avoids (from PITFALLS.md):** API key client-side exposure (publishable/secret split), cross-tenant data leaks (DAL established), no rate limiting (middleware on submission endpoint from day one), no API versioning (`/v1/` prefix locked in), GDPR data model (deletion-capable schema from day one).
**Stack used:** Hono, Better Auth (apiKey plugin), Drizzle ORM, postgres.js, Zod, @hono/zod-validator, rate-limiter-flexible, React 19, tRPC, TanStack Router, Tailwind CSS.

### Phase 2: Notification System

**Rationale:** Notifications are the second most critical feature after entry collection — they are why developers pay for a service like this. BullMQ must be configured correctly before any notification delivery, making this a standalone phase. Webhook delivery architecture with retries, delivery tracking, and HMAC signing requires careful design upfront. The fan-out pattern (dispatch -> delivery) must be established before any individual channel is wired up.
**Delivers:** Email notifications (Resend), webhook delivery with HMAC signing, exponential backoff retries, and delivery status tracking in dashboard. BullMQ worker process with correct Redis configuration (`noeviction`, graceful shutdown, connection pooling). Notification channel configuration per project via tRPC.
**Addresses (from FEATURES.md):** Email notifications, webhook notifications, Slack notifications (low complexity, slot in here).
**Avoids (from PITFALLS.md):** BullMQ Redis misconfiguration (noeviction, job removal config, startup validation), webhook delivery without retries (delivery tracking table, exponential backoff, idempotency headers, HMAC signing, 10s timeout), email deliverability issues (domain verification flow, SPF/DKIM documentation).
**Stack used:** BullMQ, ioredis, Resend, React Email, native fetch (Slack and webhook delivery), node:crypto (HMAC).

### Phase 3: Data Management and Export

**Rationale:** Once entries are flowing and notifications are working, the focus shifts to data utility — getting data out and managing it. CSV export, API documentation, and entry management features (search, filter, bulk actions, status tracking) make the product useful for real workflows, especially for demo-booking mode where sales teams need to track outreach.
**Delivers:** CSV export (papaparse), OpenAPI spec hosted at `/api/openapi.json`, dashboard entry search and filtering, entry status management (contacted/converted/archived), bulk status actions. Entry position returned in API response.
**Addresses (from FEATURES.md):** CSV export, API documentation (OpenAPI), bulk status actions, entry position in API response. Entry metadata (custom JSON) can slot here as a low-complexity addition.
**Avoids (from PITFALLS.md):** Unbounded entry listing (pagination enforced from Phase 1, but search/filter added here), CSV export edge cases (papaparse handles quotes, commas, Unicode, BOM), missing error response documentation in API docs.
**Stack used:** papaparse, @tanstack/react-table (already in stack), OpenAPI generation from Hono routes.

### Phase 4: Developer Experience and Polish

**Rationale:** This phase transforms a working product into a polished one. Test/sandbox keys, double opt-in, onboarding flows, and structured error responses are the differentiators that make developers choose pleasehold over a generic form backend. These are v1.x features in FEATURES.md — add after the core is validated but before growth.
**Delivers:** Test/sandbox API keys (`ph_test_` prefix, test entries with badge), double opt-in / email verification (configurable per-project), structured error responses (`{ error: { code, message, retry_after } }`), dashboard onboarding with project-specific integration code snippets (pre-filled API key and endpoint), dashboard notification for failed deliveries.
**Addresses (from FEATURES.md):** Test mode/sandbox keys, double opt-in/email verification, entry metadata (if not added in Phase 3), multi-user team access (design flag, can defer implementation to v2 but architect for it now).
**Avoids (from PITFALLS.md):** Unclear API error messages, no feedback when notifications fail, API key shown only in flash message, no onboarding flow showing integration code.
**Stack used:** React Email (verification email template), existing BullMQ pipeline (verification email delivery), tRPC (onboarding tRPC procedures).

### Phase 5: Self-Hosting and Distribution

**Rationale:** Docker Compose self-hosting is a project requirement and competitive differentiator, but it requires working applications to containerize. This phase finalizes the production deployment story: Dockerfiles for all services, production docker-compose.yml with correct Redis configuration, nginx reverse proxy for the dashboard SPA, health checks, and environment variable documentation. The Astro landing page with hosted API docs completes the public-facing product.
**Delivers:** `docker compose up` runs the full stack (api, worker, web, postgres, redis). Production-ready Dockerfiles with multi-stage builds. Environment variable configuration guide and `.env.example`. Health checks for all services. Astro landing page with marketing copy and hosted API documentation.
**Addresses (from FEATURES.md):** Docker Compose self-hosting, API documentation (hosted on landing site).
**Avoids (from PITFALLS.md):** Docker Compose networking mistakes (localhost vs. service names), hardcoded secrets in docker-compose.yml (`.env` pattern with `.env.example`), no health checks (all containers fail and restart on unhealthy state), Redis default config (noeviction and persistence configured in compose).
**Stack used:** Docker, docker-compose, nginx, Astro (landing/docs).

### Phase Ordering Rationale

- Phase 1 before everything: The API key model, tenant isolation DAL, and rate limiting middleware must exist before any external developer touches the product. These are impossible to retrofit safely.
- Phase 2 before Phase 3: Notifications are the second core feature. Data management features (export, bulk actions) require entries to be flowing and the notification system to be stable.
- Phase 3 before Phase 4: Export and API docs validate that the data model is complete before adding developer experience polish.
- Phase 4 before Phase 5: Test keys, onboarding, and structured errors should be in the product before it is packaged for distribution. Self-hosters will hit these issues immediately if they are not addressed.
- Phase 5 last: Docker Compose bundles everything. It can be built incrementally during earlier phases but finalized last.
- The Astro landing page (`apps/landing`) is independent and can be developed in parallel with any phase.
- The worker (`apps/worker`) can be developed in parallel with Phase 2 since it is a separate process from the API.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1:** API key publishable/secret split implementation via Better Auth's apiKey plugin and metadata. Better Auth Issue #4746 (project-scoped keys) is open — the metadata workaround is documented but the exact migration path if native support lands needs planning.
- **Phase 1:** Dynamic Zod schema construction from project field config at request time — performance implications of building a Zod schema on every request (caching strategy needed if `fieldConfig` is fetched from DB per request).
- **Phase 2:** Email deliverability for self-hosters — SPF/DKIM setup documentation, domain verification UX flow in the dashboard, and handling the case where the user provides an SMTP config instead of Resend.
- **Phase 2:** Webhook delivery tracking schema — the `webhook_deliveries` table design (what to store, retention policy, how to surface in dashboard) needs a detailed design before implementation.
- **Phase 5:** Docker Compose nginx reverse proxy configuration for the React SPA (TanStack Router client-side routing requires a catch-all to `index.html`; `/trpc/*` and `/api/*` must proxy to the api container).

Phases with standard patterns (skip research-phase):

- **Phase 3:** CSV export with papaparse is a solved problem. OpenAPI generation from Hono routes has established patterns. Standard implementation, no research needed.
- **Phase 4:** Test/sandbox keys are a flag on the key model. Double opt-in is a standard token verification flow. Both are well-documented patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Entire stack is proven in GoldenBerry reference codebase. Only 3 net-new dependencies, all verified against npm registry. Version compatibility matrix verified. |
| Features | MEDIUM-HIGH | Competitor analysis is thorough (8+ competitors analyzed). Table stakes and anti-features are well-validated. Differentiators are directionally correct but not validated by real users yet. |
| Architecture | HIGH | GoldenBerry reference codebase directly implements this architecture. Dual-API thin-adapter pattern, BullMQ worker separation, and monorepo structure are proven. Better Auth project-scoping workaround is the only uncertainty. |
| Pitfalls | HIGH | Pitfalls sourced from official documentation (BullMQ production guide, OWASP, Drizzle docs) plus known patterns in multi-tenant SaaS. All critical pitfalls have verified reproduction scenarios and prevention strategies. |

**Overall confidence:** HIGH

### Gaps to Address

- **Better Auth project-scoped key native support:** Issue #4746 is open. The metadata workaround works today but the migration path if native support lands is undefined. Monitor this during implementation and isolate the key scoping logic to the middleware so it can be swapped.
- **Self-hoster SMTP configuration:** v1 defaults to Resend. The abstraction layer for SMTP fallback (exposing a `createEmailClient` factory) should be designed in Phase 2 even if SMTP transport is not implemented until v1.x.
- **Disposable email domain blocking:** The FEATURES.md notes this as part of spam protection but does not specify a library. Two options: maintain a static list in `packages/shared` or use a lightweight npm package. This needs a decision before Phase 1 implementation.
- **OpenAPI generation from Hono:** Several Hono OpenAPI libraries exist (`@hono/zod-openapi`, `hono-openapi`). The right choice depends on how `@hono/zod-validator` integrates with OpenAPI generation. Needs a quick evaluation before Phase 3.
- **Connection pooling for PostgreSQL:** The architecture notes PgBouncer as a Phase 2+ concern, but the connection pool size for the Drizzle client in `packages/db` should be configured from Phase 1. Default pool sizes need to be set explicitly rather than left as framework defaults.

## Sources

### Primary (HIGH confidence)
- GoldenBerry reference codebase (`/Users/christopher.jimenez/Src/PixelTowers/GoldenBerry`) — stack versions, architectural patterns, package structure, proven implementations of Hono + tRPC + Drizzle + BullMQ + Better Auth
- [Better Auth API Key Plugin](https://www.better-auth.com/docs/plugins/api-key) — key generation, hashing, verification, rate limiting, metadata fields
- [BullMQ Production Guide](https://docs.bullmq.io/guide/going-to-production) — Redis configuration requirements, worker patterns, graceful shutdown
- [BullMQ Architecture Docs](https://docs.bullmq.io/guide/architecture) — worker process separation recommendation
- [Node.js crypto](https://nodejs.org/api/crypto.html) — HMAC-SHA256 signing for webhook payloads
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) — REST API security fundamentals
- [Hono CORS Vary Header Advisory](https://advisories.gitlab.com/pkg/npm/hono/GHSA-q7jf-gf43-6x6p/) — requires Hono >= 4.10.3 (already met by ^4.12.2)
- [Slack Incoming Webhooks](https://api.slack.com/incoming-webhooks) — webhook-only Slack integration pattern
- [Resend docs](https://resend.com/docs) — email delivery SDK
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) — migration management and rollback limitations
- [Docker Compose Secrets Best Practices](https://docs.docker.com/compose/how-tos/use-secrets/) — environment variable and secret management
- npm registry — all version numbers verified via `npm view` on 2026-02-25

### Secondary (MEDIUM confidence)
- [GetWaitlist API Docs](https://getwaitlist.com/docs/api-docs/waitlist) — competitor feature analysis; endpoint details
- [Prefinery Feature Comparison](https://www.prefinery.com/blog/waitlist-software-comparison-how-prefinery-stacks-up-against-the-competition/) — detailed competitor feature matrix
- [rate-limiter-flexible GitHub](https://github.com/animir/node-rate-limiter-flexible) — rate limiting with ioredis, zero dependencies
- [Better Auth Issue #4746](https://github.com/better-auth/better-auth/issues/4746) — project-scoped API key workaround via metadata
- [Webhook Best Practices Guide](https://inventivehq.com/blog/webhook-best-practices-guide) — retry patterns and delivery tracking
- [GDPR Compliance for B2B SaaS](https://complydog.com/blog/gdpr-compliance-checklist-complete-guide-b2b-saas-companies) — data processor obligations
- [WorkOS Multi-Tenant Architecture Guide](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture) — tenant isolation patterns
- [PapaParse](https://www.papaparse.com/) — CSV generation edge case handling

### Tertiary (LOW confidence)
- [GetApp Waitlist Software](https://www.getapp.com/customer-management-software/waitlist/f/api/) — market overview (aggregator, limited detail)
- Various waitlist competitor sites (LaunchList, Waitlister, QueueForm, FormSpark, Waitwhile) — feature comparison only; no API-level detail

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
