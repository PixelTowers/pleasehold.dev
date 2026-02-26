# Milestones

## v1.0 MVP (Shipped: 2026-02-26)

**Phases completed:** 5 phases, 13 plans
**Commits:** 65 | **Files modified:** 144 | **Lines of TypeScript:** 8,008
**Timeline:** ~13 hours (2026-02-25 → 2026-02-26)
**Git range:** `62e659a..fd04af7`

**Key accomplishments:**
- Full auth system with Better Auth (email/password, sessions, protected routes) and project-scoped API keys with `ph_live_` prefix
- Public REST API for entry submission with dynamic field validation, deduplication, rate limiting (60 req/min), and queue positioning
- Dashboard with paginated entry table, search, status filters, bulk actions, entry detail view, and CSV export
- Async notification system via BullMQ delivering to 5 channels (email, Slack, Discord, Telegram, webhook with HMAC-SHA256)
- Double opt-in email verification flow with token-based confirmation
- OpenAPI 3.0 spec auto-generated from route definitions with interactive Scalar docs UI
- Production Docker Compose stack with multi-stage builds, nginx reverse proxy, and automatic database migration

**Archives:** `milestones/v1.0-ROADMAP.md`, `milestones/v1.0-REQUIREMENTS.md`, `milestones/v1.0-MILESTONE-AUDIT.md`

---

## v1.1 QA & Hardening (Shipped: 2026-02-26)

**Phases completed:** 4 phases, 8 plans
**Commits:** 31 | **Files modified:** 49 | **Lines of TypeScript:** 8,335
**Timeline:** ~24 hours (2026-02-25 → 2026-02-26)
**Requirements:** 15/15 satisfied

**Key accomplishments:**
- Type-safe TanStack Router navigation replacing all window.location.href auth guards and template string URLs
- tsup build configs for API and worker services enabling local `pnpm build` with workspace package bundling
- Docker self-hosting fixes: root tsconfig in builds, Zod v3/v4 conflict resolved, generate-then-migrate flow
- Actionable SMTP missing-config warning with feature list and all required env vars
- Integration test harness with ephemeral PostgreSQL databases, Better Auth API key seeding, 8 passing tests (no mocks)
- Full QA walkthrough: 40/40 manual steps passed across developer flow, Docker hosting, 5-channel notifications, and double opt-in
- Dead code removal (auth exports) and nginx /health proxy for monitoring

**Archives:** `milestones/v1.1-ROADMAP.md`, `milestones/v1.1-REQUIREMENTS.md`, `milestones/v1.1-MILESTONE-AUDIT.md`

---

