---
phase: 06-code-fixes
plan: 02
subsystem: infra
tags: [docker, nginx, auth, cleanup]

# Dependency graph
requires:
  - phase: 05-docs-deploy
    provides: Docker Compose stack and nginx proxy config
provides:
  - Worker service with correct API_URL for verification email links
  - Clean @pleasehold/auth barrel exports (no dead code)
  - Health endpoint proxied through nginx on web port
affects: [07-integration-tests, 08-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Worker env vars mirror API service pattern for URL configuration"
    - "All API endpoints proxied through nginx for single-port access"

key-files:
  created: []
  modified:
    - docker-compose.yml
    - packages/auth/src/index.ts
    - apps/web/nginx.conf

key-decisions:
  - "Kept middleware.ts and verify-project-key.ts source files intact -- only removed barrel re-exports to reduce public API surface"
  - "Added WEB_URL to worker service for consistency with API service env pattern"

patterns-established:
  - "All URL-generating services (api, worker) must have API_URL and WEB_URL env vars in Docker"
  - "All API endpoints accessible through nginx proxy, not just direct API port"

requirements-completed: [INTG-01, CLEN-01, CLEN-02]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 6 Plan 02: Infra Fixes Summary

**Worker API_URL env var for correct email links, dead auth exports removed, /health proxied through nginx**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T12:31:55Z
- **Completed:** 2026-02-26T12:33:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Worker service in Docker now receives API_URL so verification email links point to the correct host (not hardcoded localhost)
- Dead barrel exports (authMiddleware, verifyProjectKey) removed from @pleasehold/auth -- source files retained as internal utilities
- /health endpoint accessible through nginx web proxy on port 8080, not only on direct API port 3001

## Task Commits

Each task was committed atomically:

1. **Task 1: Add API_URL to worker service and remove dead auth exports** - `45519f2` (fix)
2. **Task 2: Add /health proxy to nginx config** - `aecd4cf` (fix)

## Files Created/Modified
- `docker-compose.yml` - Added API_URL and WEB_URL to worker service environment
- `packages/auth/src/index.ts` - Removed authMiddleware and verifyProjectKey barrel exports
- `apps/web/nginx.conf` - Added /health location block proxying to api:3001

## Decisions Made
- Kept middleware.ts and verify-project-key.ts source files intact -- only removed barrel re-exports to reduce public API surface area without losing internal utility code
- Added WEB_URL to worker service alongside API_URL for consistency with the API service environment pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All infrastructure fixes from v1.0 audit complete (combined with 06-01 plan)
- Docker stack ready for deployment with correct worker env vars
- Health monitoring accessible through standard web port

## Self-Check: PASSED

- All 3 modified files exist on disk
- Both task commits verified (45519f2, aecd4cf)
- SUMMARY.md created at expected path

---
*Phase: 06-code-fixes*
*Completed: 2026-02-26*
