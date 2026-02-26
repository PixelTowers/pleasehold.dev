---
phase: 02-entry-submission-api
plan: 01
subsystem: database, api
tags: [drizzle, postgres, zod, validation, tdd, vitest]

# Dependency graph
requires:
  - phase: 01-auth-projects-keys
    provides: "projects table, projectFieldConfigs table, relations, db package build pipeline"
provides:
  - "entries table schema with dedup constraint, queue position, status enum, 3 indexes"
  - "entriesRelations and updated projectsRelations with entries many-relation"
  - "buildEntrySchema dynamic Zod field validator with strictObject"
  - "FieldConfig exported type for downstream route handlers"
affects: [02-entry-submission-api, 03-dashboard-analytics]

# Tech tracking
tech-stack:
  added: [vitest, zod]
  patterns: [TDD red-green-refactor, dynamic Zod schema from config booleans, strictObject for field rejection]

key-files:
  created:
    - packages/db/src/schema/entries.ts
    - apps/api/src/lib/field-validator.ts
    - apps/api/src/lib/field-validator.test.ts
  modified:
    - packages/db/src/schema/relations.ts
    - packages/db/src/schema/index.ts
    - apps/api/package.json

key-decisions:
  - "FieldConfig interface exported for reuse by route handler in Plan 02"
  - "Fields optional when enabled (project accepts but does not require them) per ENTR-02"
  - "Metadata validated as flat primitives (string/number/boolean/null) with 4KB serialized cap"
  - "Drizzle migrations gitignored (reproducible from schema); migration applied to dev DB"

patterns-established:
  - "TDD for validation modules: test file next to source with vitest"
  - "Dynamic Zod strictObject pattern for configurable form validation"

requirements-completed: [ENTR-02, ENTR-04, ENTR-05]

# Metrics
duration: 5min
completed: 2026-02-25
---

# Phase 2 Plan 1: Entries Schema and Field Validator Summary

**Entries table with email dedup constraint and dynamic Zod field validator via TDD using strictObject**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-25T22:06:43Z
- **Completed:** 2026-02-25T22:11:18Z
- **Tasks:** 2 (Task 2 was TDD with 3 sub-commits)
- **Files modified:** 6

## Accomplishments
- Entries table with uuid PK, project FK, email, name, company, message, metadata JSONB, position integer, status enum, timestamps, unique constraint on (project_id, email), and 3 performance indexes
- `@pleasehold/db` exports `entries` and `entriesRelations` with full type support
- `buildEntrySchema` function tested (19 passing tests) and exported from field-validator module
- Field validator rejects unexpected fields via strictObject, enforces email required, makes enabled fields optional, constrains metadata to flat primitives under 4KB

## Task Commits

Each task was committed atomically:

1. **Task 1: Create entries table schema, update relations and barrel export** - `85f1f53` (feat)
2. **Task 2 RED: Failing tests for buildEntrySchema** - `1686871` (test)
3. **Task 2 GREEN: Implement buildEntrySchema** - `8f99115` (feat)
4. **Task 2 REFACTOR: Export FieldConfig interface** - `344bbfe` (refactor)

_Note: Task 2 followed TDD red-green-refactor cycle producing 3 commits._

## Files Created/Modified
- `packages/db/src/schema/entries.ts` - Entries table definition with columns, unique constraint, and indexes
- `packages/db/src/schema/relations.ts` - Added entriesRelations + updated projectsRelations with entries many
- `packages/db/src/schema/index.ts` - Barrel export now includes entries
- `apps/api/src/lib/field-validator.ts` - Dynamic Zod schema builder from project field config
- `apps/api/src/lib/field-validator.test.ts` - 19 unit tests covering all validation scenarios
- `apps/api/package.json` - Added vitest devDep, zod dep, test script

## Decisions Made
- **FieldConfig exported:** Exported the interface so the route handler in Plan 02 can import it directly rather than redeclaring
- **Fields optional when enabled:** When collectName/Company/Message is true, the field is accepted but not required (`.optional()`) per ENTR-02 semantics
- **Metadata flat primitives only:** Record values limited to string/number/boolean/null -- nested objects rejected per research Pitfall 3
- **4KB metadata cap:** JSON.stringify length check provides consistent cross-platform byte-ish limit
- **Migration gitignored:** The `drizzle/` directory is in `.gitignore` (set in Phase 1). Migrations are reproducible from schema via `db:generate`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added zod as direct dependency to api package**
- **Found during:** Task 2 (RED phase)
- **Issue:** zod was only available transitively through @pleasehold/trpc; not importable directly
- **Fix:** Added `zod@^3.23.8` as direct dependency in apps/api/package.json
- **Files modified:** apps/api/package.json, pnpm-lock.yaml
- **Verification:** Tests import zod successfully, all pass
- **Committed in:** 1686871 (RED phase commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for correct module resolution. No scope creep.

## Issues Encountered
- Database migration required DATABASE_URL environment variable not available in default shell. Resolved by passing it explicitly from root `.env` file.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Entries table and field validator ready for Plan 02 (entry submission route handler)
- `buildEntrySchema` and `FieldConfig` type exported for route handler consumption
- Database schema supports queue position (atomic position assignment in Plan 02)

## Self-Check: PASSED

All 6 claimed files verified present. All 4 commit hashes verified in git log.

---
*Phase: 02-entry-submission-api*
*Completed: 2026-02-25*
