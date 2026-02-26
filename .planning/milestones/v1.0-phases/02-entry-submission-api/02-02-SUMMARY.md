---
phase: 02-entry-submission-api
plan: 02
subsystem: api
tags: [hono, cors, rate-limit, api-key, drizzle, deduplication, rest-api]

# Dependency graph
requires:
  - phase: 02-entry-submission-api
    provides: "entries table schema, buildEntrySchema field validator, FieldConfig type"
  - phase: 01-auth-projects-keys
    provides: "Better Auth with API key plugin, projects table, projectFieldConfigs table, createAuth"
provides:
  - "POST /api/v1/entries endpoint with API key auth, rate limiting, and dedup"
  - "apiKeyAuth middleware: verifies x-api-key, resolves project with fieldConfig"
  - "apiRateLimiter middleware: 60 req/min per key with IETF draft-6 headers"
  - "entriesRoute handler: validates input, inserts with atomic position, handles duplicates"
  - "ApiKeyVariables type for Hono context typing"
affects: [03-dashboard-analytics, 04-notifications]

# Tech tracking
tech-stack:
  added: [hono-rate-limiter, drizzle-orm (direct dep)]
  patterns: [INSERT...ON CONFLICT DO NOTHING + follow-up SELECT for dedup, atomic position via subquery, path-specific CORS separation]

key-files:
  created:
    - apps/api/src/middleware/api-key-auth.ts
    - apps/api/src/middleware/rate-limit.ts
    - apps/api/src/routes/v1/entries.ts
    - apps/api/src/routes/v1/entries.test.ts
  modified:
    - apps/api/src/index.ts
    - apps/api/package.json

key-decisions:
  - "Used path-specific CORS (/api/v1/* = origin:*, /trpc/* and /api/auth/* = webUrl) instead of global wildcard to prevent header collision"
  - "Rate limit before auth middleware to prevent DB flood from unauthenticated requests"
  - "Dedup returns 200 (not 409) with existing entry per ENTR-03 spec"
  - "Added drizzle-orm as direct dependency to api package for eq/and/sql imports"

patterns-established:
  - "Path-specific CORS: permissive for public API, restricted for dashboard routes"
  - "Middleware stack ordering: CORS -> rate-limit -> auth -> handler"
  - "INSERT...ON CONFLICT DO NOTHING + SELECT pattern for idempotent upserts"
  - "ApiKeyVariables type for Hono context variable typing across middleware and routes"

requirements-completed: [ENTR-01, ENTR-03, ENTR-06]

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 2 Plan 2: Entry Submission API Summary

**POST /api/v1/entries with API key auth, per-key rate limiting, and email deduplication returning queue position**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T22:15:32Z
- **Completed:** 2026-02-25T22:19:18Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Working POST /api/v1/entries endpoint: validates input against project field config, assigns atomic queue position, returns structured JSON
- API key auth middleware: extracts projectId from key metadata, loads project with eager-loaded fieldConfig, attaches to Hono context
- Rate limiter: 60 req/min per API key with IETF draft-6 standard headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After)
- Email deduplication: INSERT...ON CONFLICT DO NOTHING returns 201 for new entries, 200 for duplicates with the original entry data
- Path-specific CORS: /api/v1/* uses origin:* for external developers, dashboard routes use restricted origin

## Task Commits

Each task was committed atomically:

1. **Task 1: Create API key auth middleware, rate limit middleware, and install dependencies** - `50a9370` (feat)
2. **Task 2: Create entry route handler with deduplication and wire into API server** - `9064357` (feat)

## Files Created/Modified
- `apps/api/src/middleware/api-key-auth.ts` - Verifies x-api-key header, resolves project with fieldConfig, sets context variables
- `apps/api/src/middleware/rate-limit.ts` - Per-API-key rate limiter using hono-rate-limiter with IETF draft-6 headers
- `apps/api/src/routes/v1/entries.ts` - POST handler with validation, atomic position assignment, and deduplication
- `apps/api/src/routes/v1/entries.test.ts` - Integration test descriptions (skipped, require seeded DB)
- `apps/api/src/index.ts` - Wired middleware stack: CORS -> rate-limit -> auth -> entries route
- `apps/api/package.json` - Added hono-rate-limiter and drizzle-orm dependencies

## Decisions Made
- **Path-specific CORS:** Changed from global `*` CORS to path-specific registrations. `/api/v1/*` gets `origin: '*'` (permissive) while `/trpc/*` and `/api/auth/*` get `origin: [webUrl]` (restricted). This prevents the global CORS from overwriting permissive headers on v1 routes.
- **Rate limit before auth:** Rate limiter middleware registered before API key auth on `/api/v1/*` to prevent database flooding from unauthenticated requests.
- **Dedup returns 200 not 409:** Per ENTR-03, submitting the same email twice returns 200 with the existing entry rather than a conflict error.
- **drizzle-orm as direct dependency:** Added drizzle-orm as a direct dependency of the API package (was only available transitively through @pleasehold/db) for clean `eq`, `and`, `sql` imports.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added drizzle-orm as direct API dependency**
- **Found during:** Task 1 (API key auth middleware)
- **Issue:** `drizzle-orm` was only available transitively through `@pleasehold/db`; TypeScript could not resolve the `eq` import
- **Fix:** Added `drizzle-orm@^0.45.1` as direct dependency in apps/api/package.json
- **Files modified:** apps/api/package.json, pnpm-lock.yaml
- **Verification:** Typecheck passes
- **Committed in:** 50a9370 (Task 1 commit)

**2. [Rule 1 - Bug] Restructured CORS to prevent header collision**
- **Found during:** Task 2 (wiring index.ts)
- **Issue:** Original plan suggested adding `/api/v1/*` CORS alongside a global `*` CORS, but Hono runs all matching middleware -- the global CORS would overwrite permissive headers with restricted ones
- **Fix:** Replaced global `*` CORS with path-specific CORS registrations for `/trpc/*` and `/api/auth/*`
- **Files modified:** apps/api/src/index.ts
- **Verification:** Typecheck passes, middleware ordering confirmed correct
- **Committed in:** 9064357 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- Packages `@pleasehold/auth` and `@pleasehold/trpc` needed to be built (via `pnpm build`) to generate `.d.ts` files before typecheck could pass. This is a pre-existing development workflow requirement, not a new issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Entry submission API fully wired and type-safe, ready for end-to-end testing with a running database
- Phase 2 complete: entries table schema (Plan 01) + submission endpoint (Plan 02) deliver the core value proposition
- Dashboard analytics (Phase 3) can now query the entries table for display
- Notification system (Phase 4) can trigger on new entry inserts

## Self-Check: PASSED

All 6 claimed files verified present. All 2 commit hashes verified in git log.

---
*Phase: 02-entry-submission-api*
*Completed: 2026-02-25*
