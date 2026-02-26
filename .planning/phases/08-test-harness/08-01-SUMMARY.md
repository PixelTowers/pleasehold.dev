---
phase: 08-test-harness
plan: 01
subsystem: testing
tags: [vitest, postgresql, integration-tests, better-auth, hono, drizzle]

# Dependency graph
requires:
  - phase: 02-entry-api
    provides: "POST /api/v1/entries route with API key auth and deduplication"
  - phase: 01-auth
    provides: "Better Auth with API key plugin, auth_users table"
provides:
  - "Vitest global setup for creating/seeding/tearing down a fresh test PostgreSQL database"
  - "8 passing integration tests for POST /api/v1/entries covering auth, validation, dedup, positioning, metadata"
  - "Seed utility that creates user, project, field config, and API key via Better Auth server-side API"
affects: [08-test-harness, 09-docs-deploy]

# Tech tracking
tech-stack:
  added: [postgres (devDependency for direct DB admin)]
  patterns: ["Global setup creates ephemeral test database per run", "Better Auth server-side API key creation for test seeding", "Hono app.request() for in-process integration testing", "process.env for passing data from global setup to test workers"]

key-files:
  created:
    - apps/api/vitest.config.ts
    - apps/api/src/test/setup.ts
    - apps/api/src/test/seed.ts
  modified:
    - apps/api/src/routes/v1/entries.test.ts
    - apps/api/package.json

key-decisions:
  - "Used Better Auth server-side API (auth.api.createApiKey) for seed instead of direct DB insertion -- avoids reimplementing hashing"
  - "Passed TEST_API_KEY via process.env instead of vitest provide/inject -- simpler, works because global setup runs before worker forks"
  - "Built minimal test Hono app (apiKeyAuth + entriesRoute only) instead of importing full index.ts -- avoids BullMQ/Redis/tRPC boot dependencies"

patterns-established:
  - "Test DB pattern: create ephemeral DB, drizzle-kit push schema, seed, run tests, drop DB"
  - "Seed pattern: export constants (TEST_USER_ID, TEST_PROJECT_ID) + getTestApiKey() for env-based retrieval"

requirements-completed: [TEST-01]

# Metrics
duration: 8min
completed: 2026-02-26
---

# Phase 08 Plan 01: Entry API Test Harness Summary

**8 integration tests for POST /api/v1/entries using real PostgreSQL, real Better Auth API key verification, and Hono in-process requests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-26T14:12:00Z
- **Completed:** 2026-02-26T14:20:23Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Built complete test database harness: ephemeral DB creation, schema push via drizzle-kit, seed with user/project/field-config/API-key, teardown
- Replaced 7 skipped test stubs with 8 real integration tests (added metadata test) -- all passing
- Zero mocks: real PostgreSQL, real Better Auth hashing/verification, real Hono request pipeline
- Test database is created fresh per run and dropped after -- no test pollution

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test database harness** - `51b1883` (feat)
2. **Task 2: Rewrite entries.test.ts with real integration tests** - `2b6ba7a` (feat)

## Files Created/Modified
- `apps/api/vitest.config.ts` - Vitest configuration with global setup and 15s timeout
- `apps/api/src/test/setup.ts` - Global setup/teardown: creates test DB, pushes schema, seeds data, drops DB
- `apps/api/src/test/seed.ts` - Seed function inserting user, project, field config, and API key via Better Auth API
- `apps/api/src/routes/v1/entries.test.ts` - 8 integration tests covering auth, validation, dedup, positioning, metadata
- `apps/api/package.json` - Added postgres as devDependency for direct DB admin operations

## Decisions Made
- **Better Auth server-side API for seeding:** Used `auth.api.createApiKey({ body: { userId, metadata } })` instead of manually inserting hashed keys. The server-side call bypasses session requirements when userId is provided, giving us proper key hashing without reimplementing the algorithm.
- **process.env for cross-process data sharing:** Global setup stores TEST_DATABASE_URL, TEST_API_KEY, and BETTER_AUTH_SECRET in process.env. Since global setup runs before vitest forks worker processes, env vars propagate automatically.
- **Minimal test app construction:** Built a focused Hono app mounting only apiKeyAuth middleware + entriesRoute instead of importing index.ts. This avoids requiring Redis (BullMQ) and tRPC setup during tests. The fire-and-forget notification queue calls silently fail via .catch() when Redis is unavailable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed drizzle-kit push flag**
- **Found during:** Task 1 (Global setup)
- **Issue:** Plan specified `--force-accept-data-loss` flag which does not exist in drizzle-kit
- **Fix:** Removed the flag -- drizzle-kit push on a fresh empty database applies schema without interactive prompts
- **Files modified:** apps/api/src/test/setup.ts
- **Verification:** drizzle-kit push succeeds, schema applied to test DB
- **Committed in:** 51b1883 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed cross-process env propagation for TEST_API_KEY**
- **Found during:** Task 2 (Integration tests)
- **Issue:** seed.ts exported `TEST_API_KEY` as a mutable module variable, but the value was set in the global setup process and not available in test worker processes (separate module instances)
- **Fix:** Changed seed() to return the API key string, setup stores it in process.env.TEST_API_KEY, tests read via getTestApiKey() helper
- **Files modified:** apps/api/src/test/seed.ts, apps/api/src/test/setup.ts, apps/api/src/routes/v1/entries.test.ts
- **Verification:** All 8 integration tests pass with real API key authentication
- **Committed in:** 2b6ba7a (Task 2 commit)

**3. [Rule 1 - Bug] Adjusted missing-email test assertion for OpenAPI layer**
- **Found during:** Task 2 (Integration tests)
- **Issue:** Plan expected `error.code === 'VALIDATION_ERROR'` for missing email, but @hono/zod-openapi validates the request body against EntryRequestSchema before the handler runs, returning `{ success: false, error: { name: 'ZodError', issues: [...] } }` format
- **Fix:** Updated test to assert against the actual OpenAPI validation error format (success=false, ZodError, path contains 'email')
- **Files modified:** apps/api/src/routes/v1/entries.test.ts
- **Verification:** Test passes and validates correct 400 behavior
- **Committed in:** 2b6ba7a (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All fixes necessary for correctness. No scope creep. The drizzle-kit flag fix and env propagation fix were implementation bugs in the plan's specifications. The OpenAPI validation format fix reflects the actual API behavior.

## Issues Encountered
- PostgreSQL was not running (Docker daemon down). Started Homebrew PostgreSQL 14 on port 5432 as alternative. Tests run against local PostgreSQL instead of the Docker container on port 5434.
- BullMQ Redis connection errors appear in stderr during tests (port 6380 refused). These are expected and harmless -- the notification queue's fire-and-forget `.catch()` pattern swallows them silently. No functional impact on tests.

## User Setup Required

None - no external service configuration required. Tests require a running PostgreSQL instance (configured via DATABASE_URL env var).

## Next Phase Readiness
- Test harness is ready for additional test plans (08-02 if applicable)
- The test DB pattern (setup/seed/teardown) can be extended for dashboard tRPC tests or other API endpoints
- All TEST-01 requirements satisfied: integration tests run against real DB, zero skipped

## Self-Check: PASSED

All files verified present. All commits verified in history.

---
*Phase: 08-test-harness*
*Completed: 2026-02-26*
