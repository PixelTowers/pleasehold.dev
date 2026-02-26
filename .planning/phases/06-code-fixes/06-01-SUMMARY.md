---
phase: 06-code-fixes
plan: 01
subsystem: ui
tags: [tanstack-router, trpc, zod, navigation, filters]

# Dependency graph
requires:
  - phase: 03-dashboard
    provides: "Entry routes, entries page, tRPC entry router"
provides:
  - "Type-safe TanStack Router navigation for auth redirects (no full-page reloads)"
  - "Type-safe entry detail navigation with route params"
  - "pending_verification status in dashboard filter dropdown"
  - "Separate entryManualStatusEnum and entryFilterStatusEnum for correct status scoping"
affects: [07-integration-fixes, 08-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Split Zod enums when filter scope differs from mutation scope"
    - "Use TanStack Router navigate({ to, params }) for type-safe SPA navigation"

key-files:
  created: []
  modified:
    - apps/web/src/routes/index.tsx
    - apps/web/src/routes/projects/new.tsx
    - apps/web/src/routes/projects/$projectId/entries.tsx
    - packages/trpc/src/routers/entry.ts

key-decisions:
  - "Split entryStatusEnum into entryManualStatusEnum (user-settable) and entryFilterStatusEnum (includes pending_verification) to prevent users from manually setting system-assigned statuses"

patterns-established:
  - "Enum splitting: when a filter needs more values than a mutation allows, use separate Zod enums"

requirements-completed: [ROUT-01, ROUT-02, INTG-02]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 6 Plan 1: Routing and Filter Fixes Summary

**TanStack Router type-safe navigation for auth redirects and entry detail links, plus pending_verification status in dashboard filter dropdown**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T12:31:57Z
- **Completed:** 2026-02-26T12:35:18Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced window.location.href auth redirects with TanStack Router navigate in index.tsx and new.tsx -- eliminates full-page reloads
- Converted entry detail click from template-string URL to type-safe TanStack Router params navigation
- Added pending_verification to dashboard status filter dropdown and tRPC list query filter enum
- Split entryStatusEnum into entryManualStatusEnum and entryFilterStatusEnum so updateStatus/bulkUpdateStatus cannot set system-only statuses

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace window.location.href redirects with TanStack Router navigate** - `814c678` (fix)
2. **Task 2: Fix entry navigation to use type-safe links and add pending_verification filter** - `3c6a5f6` (fix)

## Files Created/Modified
- `apps/web/src/routes/index.tsx` - Added useNavigate import, replaced window.location.href with navigate({ to: '/login' })
- `apps/web/src/routes/projects/new.tsx` - Replaced window.location.href with navigate({ to: '/login' })
- `apps/web/src/routes/projects/$projectId/entries.tsx` - Type-safe entry navigation with params, added pending_verification filter option, updated status type cast
- `packages/trpc/src/routers/entry.ts` - Split entryStatusEnum into entryManualStatusEnum and entryFilterStatusEnum

## Decisions Made
- Split entryStatusEnum into two enums (entryManualStatusEnum for mutations, entryFilterStatusEnum for list queries) to enforce that pending_verification is system-assigned only. This is cleaner than a single enum with runtime checks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt trpc package to propagate updated types**
- **Found during:** Task 2 (type-safe entry navigation)
- **Issue:** After updating entryFilterStatusEnum in the tRPC router source, the apps/web TypeScript compilation failed because the trpc package exports from dist/ which was stale
- **Fix:** Ran `npm run build` in packages/trpc to regenerate dist/index.d.ts with the new enum types
- **Files modified:** packages/trpc/dist/ (gitignored, not committed)
- **Verification:** TypeScript compilation passed after rebuild
- **Committed in:** 3c6a5f6 (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard build step required for monorepo type propagation. No scope creep.

## Issues Encountered
None beyond the trpc rebuild noted in deviations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All routing and filter fixes complete for Phase 6 Plan 1
- Plan 2 (if applicable) can proceed independently
- Phase 7 integration fixes can reference the new enum pattern

## Self-Check: PASSED

All 5 files verified present. Both commit hashes (814c678, 3c6a5f6) verified in git log.

---
*Phase: 06-code-fixes*
*Completed: 2026-02-26*
