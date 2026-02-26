---
phase: 03-dashboard-and-data-management
plan: 02
subsystem: ui
tags: [react, tanstack-table, csv, inline-styles, trpc, dashboard]

requires:
  - phase: 03-dashboard-and-data-management
    provides: entry tRPC router with list, stats, bulkUpdateStatus, export procedures
provides:
  - entries page route at /projects/$projectId/entries
  - EntriesTable component with TanStack Table, selection, pagination
  - EntryStatusBadge for color-coded status pills
  - EntryStatsBar for total and per-status stat cards
  - BulkActionBar for bulk status changes on selected entries
  - CsvExportButton for RFC 4180 CSV generation and download
affects: [03-dashboard-and-data-management]

tech-stack:
  added: [@tanstack/react-table]
  patterns: [manual-pagination, uuid-row-ids, debounced-search, lazy-trpc-fetch, csv-bom-generation]

key-files:
  created:
    - apps/web/src/components/EntryStatusBadge.tsx
    - apps/web/src/components/EntryStatsBar.tsx
    - apps/web/src/components/BulkActionBar.tsx
    - apps/web/src/components/CsvExportButton.tsx
    - apps/web/src/components/EntriesTable.tsx
    - apps/web/src/routes/projects/$projectId/entries.tsx
  modified:
    - apps/web/package.json
    - apps/web/src/routes/projects/$projectId/index.tsx

key-decisions:
  - "Entry detail navigate uses string cast since entry detail route is in Plan 03-03"
  - "CsvExportButton uses trpc.useUtils().entry.export.fetch() for imperative lazy fetching"
  - "EntriesTable uses getRowId: (row) => row.id to prevent stale selection after page changes"

patterns-established:
  - "Debounced search: useState + useEffect setTimeout pattern at 300ms"
  - "Manual pagination: 1-based page state mapped to 0-based TanStack pageIndex"
  - "Bulk mutation: invalidate list + stats queries and clear selection on success"

requirements-completed: [DASH-01, DASH-03, DASH-04, DASH-05, DASH-06]

duration: 4min
completed: 2026-02-25
---

# Phase 3 Plan 2: Entries Table Page Summary

**Entries management page with TanStack Table, debounced search, status filter, stat cards, bulk status changes, and RFC 4180 CSV export**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T22:55:46Z
- **Completed:** 2026-02-25T22:59:28Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Entries page at /projects/$projectId/entries with full feature set
- TanStack Table with selection checkboxes, manual pagination, and UUID-based row IDs
- Search with 300ms debounce, status filter dropdown, page reset on filter change
- 5 stat cards (total + 4 status breakdowns) with color-coded status badges
- Bulk action bar for changing status of multiple selected entries
- CSV export with UTF-8 BOM, RFC 4180 escaping, and field-config-aware column headers
- Project overview quick link updated from "Coming soon" to active link

## Task Commits

Each task was committed atomically:

1. **Task 1: Install TanStack Table and create shared entry components** - `c6fdafb` (feat)
2. **Task 2: Create entries page with TanStack Table, search, filter, and pagination** - `c29ae2a` (feat)
3. **Deviation fix: Link entries page from project overview** - `0289380` (fix)

## Files Created/Modified
- `apps/web/src/components/EntryStatusBadge.tsx` - Color-coded status pill badge (new/contacted/converted/archived)
- `apps/web/src/components/EntryStatsBar.tsx` - Row of 5 stat cards showing total and per-status counts
- `apps/web/src/components/BulkActionBar.tsx` - Action bar with status change buttons for selected entries
- `apps/web/src/components/CsvExportButton.tsx` - CSV generation with BOM, RFC 4180 escaping, and browser download
- `apps/web/src/components/EntriesTable.tsx` - TanStack Table wrapper with columns, selection, pagination
- `apps/web/src/routes/projects/$projectId/entries.tsx` - Entries management page wiring all components with tRPC
- `apps/web/package.json` - Added @tanstack/react-table dependency
- `apps/web/src/routes/projects/$projectId/index.tsx` - Updated entries quick link from placeholder to active link

## Decisions Made
- Used `trpc.useUtils().entry.export.fetch()` for imperative CSV export rather than managing enabled/disabled query state
- Entry detail navigation uses string cast since the entry detail route (`$entryId`) will be created in Plan 03-03
- `getRowId: (row) => row.id` uses entry UUID as row ID to prevent stale selection when navigating pages

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated project overview entries quick link**
- **Found during:** After Task 2
- **Issue:** Project overview had a disabled "Coming soon" placeholder for entries link, but entries page now exists
- **Fix:** Replaced static div with active Link component pointing to /projects/$projectId/entries
- **Files modified:** apps/web/src/routes/projects/$projectId/index.tsx
- **Verification:** TypeScript compiles, link matches existing quick link patterns
- **Committed in:** 0289380

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for discoverability of the entries page. No scope creep.

## Issues Encountered
- TanStack Router type-safe routing rejected `/projects/$projectId/entries/$entryId` since that route file doesn't exist yet (Plan 03-03). Fixed by casting the interpolated URL string which works at runtime while the route is registered in the next plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Entries page is fully functional with search, filter, pagination, stats, bulk actions, and CSV export
- Entry detail page (click-through from table rows) will be built in Plan 03-03
- All 5 supporting components are exported and reusable

---
*Phase: 03-dashboard-and-data-management*
*Completed: 2026-02-25*
