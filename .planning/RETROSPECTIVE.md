# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-02-26
**Phases:** 5 | **Plans:** 13 | **Sessions:** ~3

### What Was Built
- Full auth system with email/password, project management, and scoped API keys (ph_live_ prefix)
- Public REST API for entry submission with validation, dedup, rate limiting, and queue positioning
- Dashboard with paginated table, search, filters, bulk actions, entry detail, and CSV export
- 5-channel async notification system (email, Slack, Discord, Telegram, webhook with HMAC)
- Double opt-in email verification flow
- OpenAPI 3.0 spec with interactive Scalar docs
- Production Docker Compose stack with nginx, auto-migration, and .env configuration

### What Worked
- GoldenBerry reference codebase accelerated architectural decisions — zero time spent debating stack choices
- Separating REST (public API) from tRPC (dashboard) kept both clean and purpose-appropriate
- BullMQ worker as a separate app kept the API server focused and notification delivery reliable
- TDD approach on dynamic field validation (Phase 2) caught edge cases early
- Phase dependency graph allowed Phase 4 (notifications) to depend only on Phase 2, enabling parallel thinking

### What Was Inefficient
- Better Auth apiKey plugin metadata workaround for project scoping is fragile — native support (Issue #4746) would eliminate middleware complexity
- Integration tests for entry route were skipped due to needing a seeded DB harness — tech debt that should be addressed early in next milestone
- Docker build pipeline not validated locally (tsup config missing) — only discovered during audit
- Drizzle migrations gitignored means Docker migrate service has an implicit dependency on db:generate

### Patterns Established
- `verifyProjectOwnership` helper pattern for multi-tenant data isolation in tRPC procedures
- Path-specific CORS (origin:* for public API, restricted for dashboard)
- Shared Nodemailer transporter singleton for email senders
- Channel sender functions as pure async functions taking (channel, entry, project) args
- Fire-and-forget enqueue pattern — API response never blocks on notification delivery
- Multi-stage Docker builds with turbo prune for monorepo package isolation

### Key Lessons
1. Better Auth's apiKey plugin returns metadata as already-parsed `Record<string,any>`, not a JSON string — testing assumptions about library return types saves debugging time
2. `updateApiKey` with `enabled:false` is the revocation path — not every library has a dedicated revoke method
3. Redis `noeviction` policy is non-negotiable for BullMQ — `allkeys-lru` silently loses queued jobs. Validate at startup.
4. OpenAPI schemas should be documentation-only when runtime validation is dynamic (per-project field config) — mixing static spec with dynamic validation creates conflicts
5. nginx reverse proxy in Docker is simpler than build-time API URL injection for SPA routing

### Cost Observations
- Model mix: 100% opus (quality profile)
- Sessions: ~3 sessions across ~13 hours
- Notable: 13 plans at avg 5 min each = ~1.1 hours of plan execution. Research and planning added ~2 hours. Most time was in Phase 1 (10 min/plan) which front-loaded all the scaffold work.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~3 | 5 | Established monorepo patterns, TDD workflow, GSD tooling |

### Cumulative Quality

| Milestone | Tech Debt Items | Integration Score | Requirements Met |
|-----------|----------------|-------------------|------------------|
| v1.0 | 8 | 32/34 | 34/34 |

### Top Lessons (Verified Across Milestones)

1. Front-loading auth and data isolation in Phase 1 pays compound dividends — every subsequent phase benefits
2. Reference codebases eliminate stack deliberation and let you focus on domain logic
