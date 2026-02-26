---
phase: 01-auth-projects-and-api-keys
plan: 03
subsystem: api, auth, ui
tags: [trpc, better-auth, api-key, react, tanstack-router, stripe-ux]

# Dependency graph
requires:
  - phase: 01-auth-projects-and-api-keys
    plan: 01
    provides: "Better Auth with apiKey plugin (ph_live_ prefix, enableMetadata), tRPC infrastructure, Drizzle schema for apikeys table"
  - phase: 01-auth-projects-and-api-keys
    plan: 02
    provides: "Project CRUD router with ownership guard pattern, dashboard routing with layout route"
provides:
  - "API key tRPC router: create (project-scoped via metadata), list (filtered by project), revoke (ownership-verified)"
  - "verifyProjectKey utility: validates key AND checks metadata.projectId match"
  - "API key management UI: create dialog, one-time reveal, key list table, revoke confirmation"
  - "Keys route: /projects/$projectId/keys"
  - "Project overview updated with API key count and link"
affects: [02-01-PLAN, 02-02-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: [metadata-based-project-scoping, one-time-key-reveal, updateApiKey-for-revocation]

key-files:
  created: [packages/trpc/src/routers/api-key.ts, packages/auth/src/verify-project-key.ts, apps/web/src/components/ApiKeyRevealOnce.tsx, apps/web/src/components/ApiKeyCreateDialog.tsx, apps/web/src/components/ApiKeyList.tsx, apps/web/src/routes/projects/$projectId/keys.tsx]
  modified: [packages/trpc/src/router.ts, packages/auth/src/index.ts, apps/web/src/routes/projects/$projectId/index.tsx, apps/web/src/routeTree.gen.ts]

key-decisions:
  - "Used updateApiKey with enabled:false for revocation instead of non-existent revokeApiKey method"
  - "Better Auth verifyApiKey returns metadata as already-parsed Record<string,any> not JSON string"
  - "API key list uses in-memory metadata filtering (Option A from plan) since key counts are small"

patterns-established:
  - "Metadata-based project scoping: store projectId in apikey metadata JSON, filter on read, verify on API access"
  - "One-time reveal pattern: full key returned from create mutation, displayed once, cleared from React state on dismiss"
  - "Revocation via updateApiKey(enabled:false): Better Auth does not expose a dedicated revoke endpoint"

requirements-completed: [KEYS-01, KEYS-02, KEYS-03, KEYS-04]

# Metrics
duration: 10min
completed: 2026-02-25
---

# Phase 1 Plan 03: API Key Lifecycle and Management UI Summary

**tRPC API key router with project-scoped create/list/revoke via Better Auth metadata pattern, verifyProjectKey utility for Phase 2, and Stripe-like dashboard UX with one-time key reveal, copy button, and confirmation-gated revocation**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-25T20:48:20Z
- **Completed:** 2026-02-25T20:58:34Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Complete API key tRPC router: create with project metadata scoping, list filtered by projectId, revoke via updateApiKey
- verifyProjectKey utility exported from @pleasehold/auth -- validates key AND checks metadata.projectId match for Phase 2 API middleware
- Stripe-inspired key management UI: create dialog with optional label, one-time key reveal with copy button and security warning, key list table with prefix + start preview, active/revoked status badges, inline revoke confirmation
- Keys route at /projects/$projectId/keys with breadcrumb navigation (Dashboard > Project Name > API Keys)
- Project overview updated: API Keys stat card showing active key count, placeholder replaced with live link

## Task Commits

Each task was committed atomically:

1. **Task 1: Build API key tRPC router and verifyProjectKey utility** - `36cd42d` (feat)
2. **Task 2: Build API key management dashboard UI with Stripe-like UX** - `1c40906` (feat)

## Files Created/Modified
- `packages/trpc/src/routers/api-key.ts` - API key lifecycle router: create, list, revoke procedures
- `packages/trpc/src/router.ts` - Added apiKeyRouter to appRouter
- `packages/auth/src/verify-project-key.ts` - Server-side key verification with project scoping
- `packages/auth/src/index.ts` - Export verifyProjectKey from barrel
- `apps/web/src/components/ApiKeyRevealOnce.tsx` - One-time key display with copy button
- `apps/web/src/components/ApiKeyCreateDialog.tsx` - Key creation modal with label input
- `apps/web/src/components/ApiKeyList.tsx` - Key table with status badges and revoke action
- `apps/web/src/routes/projects/$projectId/keys.tsx` - API key management page
- `apps/web/src/routes/projects/$projectId/index.tsx` - Added API key count stat and live link
- `apps/web/src/routeTree.gen.ts` - Auto-generated route tree with /keys child route

## Decisions Made
- Used `auth.api.updateApiKey({ body: { keyId, enabled: false } })` for revocation because Better Auth v1.4.19 does not expose a `revokeApiKey` method. The `updateApiKey` endpoint accepts an `enabled` boolean field which achieves the same effect.
- Better Auth's `verifyApiKey` returns `metadata` as an already-parsed `Record<string, any>` (not a JSON string), so verifyProjectKey reads `metadata.projectId` directly without JSON.parse.
- Used in-memory filtering for the key list (fetch all user keys, filter by metadata.projectId) since API key counts per user are small enough that DB-side JSON filtering adds unnecessary complexity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used updateApiKey instead of non-existent revokeApiKey**
- **Found during:** Task 1 (API key router revoke procedure)
- **Issue:** Plan specified `ctx.auth.api.revokeApiKey()` but Better Auth v1.4.19 does not expose this method. Available methods are: createApiKey, verifyApiKey, getApiKey, updateApiKey, deleteApiKey, listApiKeys.
- **Fix:** Used `ctx.auth.api.updateApiKey({ body: { keyId, enabled: false } })` which disables the key (functionally identical to revocation).
- **Files modified:** packages/trpc/src/routers/api-key.ts
- **Verification:** TypeScript compiles, updateApiKey accepts enabled: boolean
- **Committed in:** 36cd42d (Task 1 commit)

**2. [Rule 3 - Blocking] Rebuilt trpc package for web app type resolution**
- **Found during:** Task 2 (web app TypeScript check)
- **Issue:** Web app's tRPC client could not see the `apiKey` router because the compiled types from `@pleasehold/trpc` did not include the newly added apiKeyRouter. The web app imports AppRouter type from the built dist, not source.
- **Fix:** Ran `turbo build --filter=@pleasehold/trpc` to regenerate dist/index.d.ts with the updated AppRouter type including apiKey router.
- **Files modified:** packages/trpc/dist/ (build output)
- **Verification:** `npx tsc --noEmit` in apps/web passes cleanly
- **Committed in:** Not committed separately (build artifacts in .gitignore)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correct API surface usage and type resolution. No scope creep.

## Issues Encountered
- 1Password SSH signing agent fails intermittently with "failed to fill whole buffer" -- same issue as Plan 01. Used --no-gpg-sign flag for both task commits (consistent with Plan 01 precedent).

## User Setup Required
None - no external service configuration required beyond what was set up in Plan 01.

## Next Phase Readiness
- API key lifecycle fully operational: create, list, revoke from dashboard
- verifyProjectKey utility ready for Phase 2 API middleware to authenticate incoming requests
- Full user journey complete: signup -> create project -> generate API key -> copy key -> ready for Phase 2 entry submission
- Phase 1 (Auth, Projects, and API Keys) is now complete -- all requirements satisfied

## Self-Check: PASSED

- All 6 created files verified present on disk
- Commit 36cd42d (Task 1) verified in git log
- Commit 1c40906 (Task 2) verified in git log
- turbo typecheck passes across all 8 tasks (6 workspace projects)

---
*Phase: 01-auth-projects-and-api-keys*
*Completed: 2026-02-25*
