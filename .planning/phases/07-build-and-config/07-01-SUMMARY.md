---
phase: 07-build-and-config
plan: 01
subsystem: infra
tags: [tsup, build, node, esm, smtp, nodemailer]

# Dependency graph
requires:
  - phase: 06-code-fixes
    provides: working API and worker source code to build
provides:
  - tsup build configuration for API service (apps/api/tsup.config.ts)
  - tsup build configuration for worker service (apps/worker/tsup.config.ts)
  - actionable SMTP missing-config warning in worker mailer
affects: [08-integration-testing, docker, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: [tsup app config with noExternal for workspace bundling, createRequire banner shim for CJS deps in ESM output]

key-files:
  created:
    - apps/api/tsup.config.ts
    - apps/worker/tsup.config.ts
  modified:
    - apps/worker/src/senders/mailer.ts

key-decisions:
  - "Used noExternal regex to bundle workspace packages into single dist/index.js for Docker runner stage"
  - "Added createRequire banner shim for CJS dependencies (nodemailer, ioredis) in ESM output"

patterns-established:
  - "App tsup config: node22 target, no dts, noExternal for workspace packages, createRequire shim"

requirements-completed: [BILD-01, BILD-02]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 7 Plan 1: Build and Config Summary

**tsup build configs for API and worker apps with workspace bundling, plus actionable SMTP missing-config warning**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T13:34:16Z
- **Completed:** 2026-02-26T13:35:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- API and worker builds now succeed with `pnpm build --filter @pleasehold/api` and `pnpm build --filter @pleasehold/worker`
- Both produce a single bundled `dist/index.js` ready for Docker runner stages
- SMTP missing-config warning now lists affected features and all required env vars with examples

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tsup configuration for API and worker apps** - `c0ad0dd` (chore)
2. **Task 2: Improve SMTP missing-config warning with actionable guidance** - `0e194e7` (fix)

## Files Created/Modified
- `apps/api/tsup.config.ts` - Build config for API: ESM, node22, workspace bundling, createRequire shim
- `apps/worker/tsup.config.ts` - Build config for worker: same pattern as API
- `apps/worker/src/senders/mailer.ts` - Multi-line SMTP warning with feature list and env var documentation

## Decisions Made
- Used `noExternal: [/@pleasehold\/.*/]` to bundle workspace packages into the output so the Docker runner stage only needs `dist/index.js`, not the full monorepo
- Added `createRequire` banner shim because dependencies like nodemailer and ioredis use `require()` internally, which fails in pure ESM output
- Set `target: 'node22'` to match the Dockerfile base image and engines field

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both API and worker builds produce clean `dist/index.js` output
- Ready for Docker build integration and integration testing
- SMTP configuration is optional and warns clearly when missing

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 07-build-and-config*
*Completed: 2026-02-26*
