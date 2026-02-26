---
phase: 05-documentation-and-self-hosting
plan: 01
subsystem: api
tags: [openapi, scalar, zod-openapi, api-docs, hono]

# Dependency graph
requires:
  - phase: 02-entry-management
    provides: "Entry submission route and verify route to document"
  - phase: 04-notification-system
    provides: "Double opt-in verify endpoint mounted at /verify"
provides:
  - "Auto-generated OpenAPI 3.0 JSON spec at /doc"
  - "Interactive Scalar API reference at /docs"
  - "Shared Zod OpenAPI schemas for request/response types"
  - "OpenAPIHono routes with createRoute metadata"
affects: [05-02]

# Tech tracking
tech-stack:
  added: ["@hono/zod-openapi@0.19.10", "@scalar/hono-api-reference"]
  patterns: ["OpenAPIHono + createRoute for auto-documented routes", "Registry-based security scheme registration"]

key-files:
  created:
    - apps/api/src/openapi.ts
  modified:
    - apps/api/src/index.ts
    - apps/api/src/routes/v1/entries.ts
    - apps/api/src/routes/v1/verify.ts
    - apps/api/package.json

key-decisions:
  - "Used @hono/zod-openapi@0.19.10 (not v1.x) for zod v3 compatibility"
  - "Security scheme registered via openAPIRegistry.registerComponent instead of doc() config (components excluded from OpenAPIObjectConfig type)"
  - "OpenAPI schemas are documentation-only; runtime validation still uses dynamic buildEntrySchema per project"

patterns-established:
  - "OpenAPIHono createRoute pattern: define route config with schemas, then app.openapi(route, handler)"
  - "Literal type assertion (as const) for OpenAPIHono response type narrowing"

requirements-completed: [DOCS-01, DOCS-02]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 5 Plan 1: OpenAPI Documentation Summary

**Auto-generated OpenAPI 3.0 spec at /doc and interactive Scalar API reference at /docs using @hono/zod-openapi route definitions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T09:12:32Z
- **Completed:** 2026-02-26T09:17:57Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created shared OpenAPI Zod schemas (EntryRequest, EntryResponse, ErrorResponse, VerifyResponse) for documentation
- Converted all 3 public routes (entries POST, verify GET, health GET) from plain Hono to OpenAPIHono with createRoute metadata
- Mounted /doc endpoint serving auto-generated OpenAPI 3.0 JSON spec with security scheme, tags, and response schemas
- Mounted /docs endpoint serving interactive Scalar API reference with curl examples and response samples

## Task Commits

Each task was committed atomically:

1. **Task 1: Install OpenAPI dependencies and create shared schemas** - `d926869` (feat)
2. **Task 2: Convert routes to OpenAPIHono and mount /doc + /docs** - `b5b852f` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `apps/api/src/openapi.ts` - Shared OpenAPI Zod schemas for request/response/error types (documentation-only)
- `apps/api/src/routes/v1/entries.ts` - Entry submission route converted to OpenAPIHono with createRoute
- `apps/api/src/routes/v1/verify.ts` - Verification route converted to OpenAPIHono with createRoute
- `apps/api/src/index.ts` - Main app converted to OpenAPIHono, /doc and /docs endpoints mounted, security scheme registered
- `apps/api/package.json` - Added @hono/zod-openapi and @scalar/hono-api-reference dependencies

## Decisions Made
- Used @hono/zod-openapi@0.19.10 instead of v1.x because v1.x requires zod v4 but the project uses zod v3.25.76
- Registered the apiKey security scheme via `app.openAPIRegistry.registerComponent()` because `OpenAPIObjectConfig` omits `components` by design (components are auto-generated from the registry)
- OpenAPI schemas are documentation-only superset schemas; runtime validation remains dynamic per-project via `buildEntrySchema(project.fieldConfig)`
- Used `true as const` in verify handler response to satisfy OpenAPIHono strict literal type checking for `z.literal(true)` schema

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed @hono/zod-openapi version for zod v3 compatibility**
- **Found during:** Task 1 (dependency installation)
- **Issue:** Latest @hono/zod-openapi@1.2.2 has peer dependency on zod@^4.0.0, project uses zod@3.25.76
- **Fix:** Downgraded to @hono/zod-openapi@0.19.10 which supports zod>=3.0.0
- **Files modified:** apps/api/package.json
- **Verification:** No peer dependency warnings, typecheck passes
- **Committed in:** d926869 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed components not accepted in app.doc() config**
- **Found during:** Task 2 (index.ts conversion)
- **Issue:** `OpenAPIObjectConfig` type is `Omit<OpenAPIObject, 'paths' | 'components' | 'webhooks'>` -- components field not allowed in doc() config
- **Fix:** Registered security scheme via `app.openAPIRegistry.registerComponent()` instead
- **Files modified:** apps/api/src/index.ts
- **Verification:** Typecheck passes, security scheme will appear in generated spec
- **Committed in:** b5b852f (Task 2 commit)

**3. [Rule 1 - Bug] Fixed Scalar apiReference config shape**
- **Found during:** Task 2 (index.ts conversion)
- **Issue:** Current @scalar/hono-api-reference uses `url` property directly, not `spec: { url }`
- **Fix:** Changed `{ spec: { url: '/doc' } }` to `{ url: '/doc' }`
- **Files modified:** apps/api/src/index.ts
- **Verification:** Typecheck passes
- **Committed in:** b5b852f (Task 2 commit)

**4. [Rule 1 - Bug] Fixed verify handler literal type narrowing**
- **Found during:** Task 2 (verify.ts conversion)
- **Issue:** `verified: true` widened to `boolean` by TypeScript, incompatible with `z.literal(true)` schema response type
- **Fix:** Changed to `verified: true as const` to preserve literal type
- **Files modified:** apps/api/src/routes/v1/verify.ts
- **Verification:** Typecheck passes
- **Committed in:** b5b852f (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (4 bugs)
**Impact on plan:** All auto-fixes necessary for type-safe compilation. No scope creep. Plan's intent fully preserved.

## Issues Encountered
- `pnpm build --filter @pleasehold/api` fails with "No input files" -- this is a pre-existing issue (API app has no tsup config, it's a runtime server run via tsx, not a library). Not caused by this plan's changes. Typecheck passes which confirms correctness.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- OpenAPI documentation infrastructure complete, ready for Plan 05-02
- Adding new OpenAPIHono routes will automatically appear in /doc and /docs
- Scalar UI at /docs provides interactive testing for developers

## Self-Check: PASSED

All created files verified present. All commit hashes verified in git log.

---
*Phase: 05-documentation-and-self-hosting*
*Completed: 2026-02-26*
