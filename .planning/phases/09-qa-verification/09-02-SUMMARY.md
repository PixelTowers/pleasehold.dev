---
phase: 09-qa-verification
plan: 02
subsystem: infra
tags: [docker, docker-compose, nginx, postgresql, redis, self-hosting, qa]

# Dependency graph
requires:
  - phase: 07-build-and-config
    provides: "Docker build pipeline with tsup configs and migration flow"
  - phase: 05-docs-deploy
    provides: "docker-compose.yml, Dockerfiles, nginx proxy config"
provides:
  - "QA-04 verified: Docker self-hosting works end-to-end from clean state"
  - "Dockerfile fixes for root tsconfig and Zod v3/v4 version conflict"
affects: [09-qa-verification]

# Tech tracking
tech-stack:
  added: []
  patterns: ["tsconfig.json copied to Docker builder stage for workspace references"]

key-files:
  created:
    - ".planning/phases/09-qa-verification/09-02-QA-REPORT.md"
  modified:
    - "apps/api/Dockerfile"
    - "apps/worker/Dockerfile"
    - "apps/web/Dockerfile"
    - "apps/api/tsup.config.ts"
    - "apps/api/package.json"

key-decisions:
  - "Copy root tsconfig.json into Docker builder stage to fix turbo prune --docker omission"
  - "Mark better-auth as external in tsup config to resolve Zod v3/v4 runtime conflict"

patterns-established:
  - "Docker builds require root tsconfig.json copied separately from turbo prune output"
  - "Packages with native Zod v4 dependencies must be externalized from tsup bundles"

requirements-completed: [QA-04]

# Metrics
duration: 45min
completed: 2026-02-26
---

# Phase 9 Plan 02: Docker Self-Hosting QA Summary

**Docker self-hosting verified end-to-end: clean docker-compose up builds all services, runs migrations, serves API and dashboard, and accepts entry submissions -- with two Docker build fixes for tsconfig and Zod version conflict**

## Performance

- **Duration:** ~45 min (across two sessions with human checkpoint)
- **Started:** 2026-02-26T16:20:00Z (approx)
- **Completed:** 2026-02-26T17:08:44Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Verified Docker self-hosting flow from clean state -- all 6 services build, start, and run correctly
- Fixed two Docker build issues: missing root tsconfig in turbo prune output, and Zod v3/v4 version conflict in API bundle
- Human-verified dashboard accessibility -- all pages load, data displays correctly, no console errors
- Full functional test passed: signup, project creation, API key generation, entry submission through Docker stack
- QA report documents 11/11 checks passed (10 automated + 1 human verification)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build and verify Docker Compose stack from clean state** - `768985e` (fix)
2. **Task 2: Human verification of Docker-hosted dashboard** - `d29178a` (docs)

## Files Created/Modified
- `.planning/phases/09-qa-verification/09-02-QA-REPORT.md` - QA verification report with all test results
- `apps/api/Dockerfile` - Added root tsconfig.json copy to builder stage
- `apps/worker/Dockerfile` - Added root tsconfig.json copy to builder stage
- `apps/web/Dockerfile` - Added root tsconfig.json copy to builder stage
- `apps/api/tsup.config.ts` - Made better-auth external to avoid Zod version conflict
- `apps/api/package.json` - Added better-auth as direct dependency
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- **Root tsconfig in Docker builds:** `turbo prune --docker` does not include the root tsconfig.json, but workspace package tsconfigs reference it. Added explicit COPY step in all three Dockerfiles to resolve.
- **better-auth externalized in tsup:** `better-auth@1.4.19` depends on `better-call@1.1.8` which uses Zod v4 `.meta()`. When tsup bundled the code, it resolved Zod v3 at build time, causing a runtime crash. Making better-auth external lets it resolve its own Zod dependency at runtime.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Root tsconfig.json missing in Docker builds**
- **Found during:** Task 1 (Docker build step)
- **Issue:** `turbo prune --docker` output does not include root tsconfig.json, but workspace package tsconfigs extend from it via `../../tsconfig.json`
- **Fix:** Added `COPY --from=pruner /app/tsconfig.json ./tsconfig.json` to the builder stage of all three Dockerfiles
- **Files modified:** apps/api/Dockerfile, apps/worker/Dockerfile, apps/web/Dockerfile
- **Verification:** Docker build completes successfully for all services
- **Committed in:** 768985e (Task 1 commit)

**2. [Rule 1 - Bug] Zod v3/v4 version conflict crashing API at runtime**
- **Found during:** Task 1 (API service startup)
- **Issue:** better-auth internally uses Zod v4 features (`.meta()`) via better-call, but tsup bundled the code with Zod v3 resolution, causing `TypeError: z7.coerce.boolean(...).meta is not a function`
- **Fix:** Marked better-auth as external in tsup config and added as direct dependency of @pleasehold/api
- **Files modified:** apps/api/tsup.config.ts, apps/api/package.json
- **Verification:** API starts without errors, /health returns 200
- **Committed in:** 768985e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were necessary to get Docker builds working. No scope creep -- these are correctness fixes for the Docker pipeline.

## Issues Encountered
- Port 3001 was occupied by a running tsx dev server -- killed it before Docker testing
- Docker builds required two rounds of fixing (tsconfig, then Zod) before all services started cleanly

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Docker self-hosting verified and working
- Plan 09-03 (notification pipeline QA) is the final plan in the milestone
- All Docker fixes committed and ready for production use

## Self-Check: PASSED

- FOUND: .planning/phases/09-qa-verification/09-02-QA-REPORT.md
- FOUND: .planning/phases/09-qa-verification/09-02-SUMMARY.md
- FOUND: 768985e (Task 1 commit)
- FOUND: d29178a (Task 2 commit)

---
*Phase: 09-qa-verification*
*Completed: 2026-02-26*
