# Phase 3: Dashboard and Data Management - Research

**Researched:** 2026-02-25
**Domain:** Data table UI, server-side search/filter/pagination, status management, CSV export
**Confidence:** HIGH (primary stack already in codebase; patterns verified against official docs and existing Phase 1/2 implementations)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | User can browse, search, and filter entries in a table view | TanStack Table (headless) for table rendering with column sorting; tRPC `entry.list` procedure with Drizzle `ilike` search on email/name/company, status enum filter, offset/limit pagination |
| DASH-02 | User can view entry details (all collected fields + metadata) | Entry detail panel or modal triggered by row click; tRPC `entry.getById` procedure returning full entry with all fields, metadata JSON, and submission timestamps |
| DASH-03 | User can see entry count and basic stats at a glance | tRPC `entry.stats` procedure using Drizzle `count()` with status-grouped aggregation; rendered as stat cards above the table (same pattern as project overview page) |
| DASH-04 | User can export all entries as CSV | Server-side tRPC procedure returns all entries for a project; client generates CSV string with RFC 4180 quoting + UTF-8 BOM prefix, triggers browser download via Blob + URL.createObjectURL |
| DASH-05 | User can set entry status (new, contacted, converted, archived) | tRPC `entry.updateStatus` mutation accepting entry ID + status enum; status column already exists on entries table with correct enum values and default `'new'` |
| DASH-06 | User can bulk-select entries and apply status changes | TanStack Table row selection with checkbox column; tRPC `entry.bulkUpdateStatus` mutation accepting array of entry IDs + target status; UI shows bulk action bar when rows are selected |

</phase_requirements>

---

## Summary

Phase 3 transforms pleasehold from an API-only service into a product with a management dashboard. The existing codebase provides all the infrastructure needed: the `entries` table already includes a `status` column with the correct enum values (`new`, `contacted`, `converted`, `archived`), the `projects->entries` Drizzle relation is defined, and the tRPC + React Query stack handles all dashboard-to-API communication.

The main technical work is: (1) a new `entry` tRPC router with list (paginated, searchable, filterable), getById, stats, updateStatus, bulkUpdateStatus, and export procedures; (2) a TanStack Table-powered entries table component with inline-style rendering (matching the existing codebase's no-framework CSS approach); and (3) CSV generation with proper RFC 4180 encoding and Excel compatibility.

TanStack Table (`@tanstack/react-table` v8.x) is the right choice for the data table. It is headless (no markup opinions -- works with the existing inline style approach), supports server-side pagination/filtering/sorting via `manualPagination`/`manualFiltering`/`manualSorting`, and has built-in row selection state management needed for DASH-06 bulk operations. It is the only new dependency needed for this phase.

**Primary recommendation:** Build a tRPC `entry` router handling all data operations (list, detail, stats, status updates, bulk updates, CSV export). Use TanStack Table headless for the table UI with server-side data management. Generate CSV client-side from a tRPC query to avoid server-side file handling. Follow existing UI patterns (inline styles, stat cards, breadcrumb navigation) established in Phase 1.

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@trpc/server` | ^11.10.0 | Entry data procedures (list, stats, update) | All dashboard operations use tRPC; established pattern from project + apiKey routers |
| `@trpc/react-query` | ^11.10.0 | React hooks for entry queries/mutations | Already used for project.list, apiKey.list, etc. |
| `@tanstack/react-query` | ^5.62.0 | Cache, pagination state, mutation handling | Already configured; staleTime=1min, retry=false |
| `drizzle-orm` | ^0.45.1 | Entry queries with search, filter, pagination | Already used for all DB operations; has `ilike`, `count`, `sql` utilities |
| `zod` | ^3.23.8+ | Input validation for tRPC procedures | Already used in project router; validates entry IDs, status enums, pagination params |
| `react` | ^19.0.0 | UI components | Already installed |

### New Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-table` | ^8.21.3 | Headless table with sorting, pagination, row selection | Entry table component; provides column definitions, row selection state, pagination state |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tanstack/react-table` | Hand-built HTML `<table>` | Hand-built works for simple display but becomes painful for row selection (DASH-06), column sorting, and pagination state management. TanStack Table is ~12kb and headless -- no style conflicts. |
| `@tanstack/react-table` | AG Grid / MUI DataGrid | Full-featured but heavy (100kb+), opinionated styling that conflicts with inline style approach, overkill for a single table view. |
| Client-side CSV generation | Server-side CSV endpoint | Server-side avoids loading all data into browser memory, but for v1 scale (thousands of entries, not millions) client-side is simpler -- no file serving, no temp files, no streaming. Revisit if data volumes grow. |
| `export-to-csv` npm package | Manual CSV string building | Manual building is ~30 lines of code and avoids a dependency for a well-understood format (RFC 4180). `export-to-csv` adds a dependency for marginal benefit. |

**Installation:**
```bash
# apps/web
pnpm add @tanstack/react-table
```

---

## Architecture Patterns

### Recommended Project Structure (additions to Phase 1/2)

```
packages/trpc/src/
├── routers/
│   ├── project.ts          # Existing
│   ├── api-key.ts          # Existing
│   └── entry.ts            # NEW: entry list, detail, stats, status, bulk, export
├── router.ts               # Updated: add entry router

apps/web/src/
├── routes/projects/$projectId/
│   ├── index.tsx            # Updated: link to entries page, show live entry count
│   ├── entries.tsx          # NEW: entries table page (search, filter, table, bulk actions)
│   └── entries/$entryId.tsx # NEW: entry detail page (all fields, metadata, status)
├── components/
│   ├── EntriesTable.tsx     # NEW: TanStack Table wrapper with columns, selection, pagination
│   ├── EntryDetailPanel.tsx # NEW: full entry detail view
│   ├── EntryStatusBadge.tsx # NEW: color-coded status badge (reusable)
│   ├── EntryStatsBar.tsx    # NEW: stat cards (total, by-status counts)
│   ├── BulkActionBar.tsx    # NEW: action bar shown when rows are selected
│   └── CsvExportButton.tsx  # NEW: download trigger with CSV generation
```

### Pattern 1: tRPC Entry Router with Paginated List

**What:** A tRPC router for all entry dashboard operations. The `list` procedure supports search (ILIKE on email/name/company), status filter, and offset/limit pagination with total count for page calculation.
**When to use:** All entry data reads and writes from the dashboard.

```typescript
// packages/trpc/src/routers/entry.ts
import { TRPCError } from '@trpc/server';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { entries, projects } from '@pleasehold/db';
import { protectedProcedure, router } from '../trpc';

const entryStatusEnum = z.enum(['new', 'contacted', 'converted', 'archived']);

export const entryRouter = router({
  list: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      search: z.string().optional(),
      status: entryStatusEnum.optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(25),
    }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
        columns: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      // Build dynamic where conditions
      const conditions = [eq(entries.projectId, input.projectId)];

      if (input.status) {
        conditions.push(eq(entries.status, input.status));
      }

      if (input.search) {
        const pattern = `%${input.search}%`;
        conditions.push(
          or(
            ilike(entries.email, pattern),
            ilike(entries.name, pattern),
            ilike(entries.company, pattern),
          )!,
        );
      }

      const whereClause = and(...conditions);

      // Parallel: fetch page of entries + total count
      const [rows, [{ total }]] = await Promise.all([
        ctx.db
          .select()
          .from(entries)
          .where(whereClause)
          .orderBy(desc(entries.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        ctx.db
          .select({ total: sql<number>`cast(count(*) as integer)` })
          .from(entries)
          .where(whereClause),
      ]);

      return {
        entries: rows,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),
});
```

**Key decisions:**
- `count` cast to integer because PostgreSQL returns bigint as string
- Parallel fetch of rows + count avoids sequential DB calls
- `ilike` for case-insensitive search across multiple columns via `or()`
- Project ownership verified before any data access (same pattern as existing routers)

### Pattern 2: TanStack Table with Server-Side Data

**What:** Headless table setup with manual pagination, manual filtering, and row selection. The table does not manage its own data -- tRPC provides paginated results.
**When to use:** The entries table component.

```typescript
// apps/web/src/components/EntriesTable.tsx
import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';

// Column definitions with selection checkbox
const columns: ColumnDef<Entry>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'position', header: 'Position' },
  { accessorKey: 'createdAt', header: 'Submitted' },
];

function EntriesTable({ data, total, page, pageSize, onPageChange }) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(total / pageSize),
    state: { rowSelection, pagination: { pageIndex: page - 1, pageSize } },
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  });

  // Render with inline styles matching existing codebase patterns
  // Selected row IDs available via: Object.keys(rowSelection)
}
```

**Critical detail:** Use `manualPagination: true` so TanStack Table does NOT try to slice the data client-side. All pagination is handled by the tRPC query.

### Pattern 3: Bulk Status Update

**What:** A tRPC mutation that accepts an array of entry IDs and a target status, updates all matching entries in a single query, and returns the count of affected rows.
**When to use:** When the user selects entries via checkboxes and applies a status change.

```typescript
// In entry router
bulkUpdateStatus: protectedProcedure
  .input(z.object({
    projectId: z.string().uuid(),
    entryIds: z.array(z.string().uuid()).min(1).max(500),
    status: entryStatusEnum,
  }))
  .mutation(async ({ ctx, input }) => {
    // Verify project ownership first
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
      columns: { id: true },
    });
    if (!project) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
    }

    // Update all matching entries scoped to the project
    const result = await ctx.db
      .update(entries)
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(entries.projectId, input.projectId),
          inArray(entries.id, input.entryIds),
        ),
      )
      .returning({ id: entries.id });

    return { updatedCount: result.length };
  }),
```

**Security note:** The `where` clause includes BOTH `projectId` AND `entryIds`. This prevents a user from updating entries in a project they do not own, even if they guess valid entry IDs.

### Pattern 4: CSV Export with RFC 4180 Compliance

**What:** Client-side CSV generation from tRPC query results with proper quoting, UTF-8 BOM for Excel compatibility, and browser-triggered download.
**When to use:** The "Export CSV" button.

```typescript
// CSV generation utility
function generateCsv(entries: Entry[], fieldConfig: FieldConfig): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility

  const headers = ['Email', 'Status', 'Position', 'Submitted'];
  if (fieldConfig.collectName) headers.splice(1, 0, 'Name');
  if (fieldConfig.collectCompany) headers.splice(2, 0, 'Company');
  if (fieldConfig.collectMessage) headers.push('Message');
  headers.push('Metadata');

  const escapeField = (value: string | null | undefined): string => {
    if (value == null) return '';
    const str = String(value);
    // RFC 4180: quote if field contains comma, double-quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = entries.map((entry) => {
    const row = [escapeField(entry.email)];
    if (fieldConfig.collectName) row.push(escapeField(entry.name));
    if (fieldConfig.collectCompany) row.push(escapeField(entry.company));
    row.push(escapeField(entry.status));
    row.push(String(entry.position));
    row.push(new Date(entry.createdAt).toISOString());
    if (fieldConfig.collectMessage) row.push(escapeField(entry.message));
    row.push(escapeField(entry.metadata ? JSON.stringify(entry.metadata) : null));
    return row.join(',');
  });

  return BOM + [headers.join(','), ...rows].join('\r\n');
}

// Browser download trigger
function downloadCsv(csvString: string, filename: string) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

**Key details:**
- UTF-8 BOM (`\uFEFF`) prepended so Excel detects encoding correctly
- RFC 4180 quoting: fields with commas, quotes, or newlines are wrapped in double quotes; internal double quotes are doubled
- `\r\n` line endings per RFC 4180
- `URL.revokeObjectURL` after click to prevent memory leaks
- CSV columns adapt to field config (same fields the project collects)

### Pattern 5: Stats Aggregation Query

**What:** A single SQL query that returns total entry count and per-status breakdown using Drizzle's `count` with `groupBy`.
**When to use:** The stats bar above the entries table.

```typescript
// In entry router
stats: protectedProcedure
  .input(z.object({ projectId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Ownership check (same pattern)
    // ...

    const [totalResult, statusCounts] = await Promise.all([
      ctx.db
        .select({ total: sql<number>`cast(count(*) as integer)` })
        .from(entries)
        .where(eq(entries.projectId, input.projectId)),
      ctx.db
        .select({
          status: entries.status,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(entries)
        .where(eq(entries.projectId, input.projectId))
        .groupBy(entries.status),
    ]);

    return {
      total: totalResult[0].total,
      byStatus: Object.fromEntries(
        statusCounts.map((row) => [row.status, row.count]),
      ),
    };
  }),
```

### Anti-Patterns to Avoid

- **Loading all entries client-side then filtering/sorting in JavaScript:** Does not scale. Use server-side pagination from the start. TanStack Table's `manualPagination: true` makes this straightforward.
- **Using Drizzle's relational query API (`db.query.entries.findMany`) for complex filtered/paginated queries:** The relational API is convenient for simple lookups but does not support `ilike`, `or()` across columns, or parallel count queries. Use the select API (`db.select().from(entries)`) for the list procedure.
- **Building CSV server-side and streaming via a separate HTTP endpoint:** Adds complexity (file management, auth on a non-tRPC endpoint) for no benefit at v1 scale. Client-side Blob generation is simpler.
- **Using `LIKE` instead of `ILIKE` for search:** PostgreSQL `LIKE` is case-sensitive. Users expect case-insensitive search on email/name fields. Always use `ilike`.
- **Forgetting project ownership checks on entry operations:** Every tRPC procedure that touches entries MUST verify the project belongs to the authenticated user. Copy the ownership pattern from `projectRouter.getById`.
- **Using `inArray` without also scoping to `projectId` in bulk operations:** A malicious user could guess entry IDs from other projects. Always combine `inArray(entries.id, ...)` with `eq(entries.projectId, ...)` in the WHERE clause.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table column definitions, sorting, pagination state | Custom React state for each | `@tanstack/react-table` `useReactTable` | Handles column ordering, pagination state, row selection state, and sort state in a single headless hook. ~12kb. |
| Row selection with select-all/indeterminate | Custom checkbox tracking with Set/Map | TanStack Table row selection API | Handles select-all, select-page, indeterminate header checkbox, and multi-page selection tracking out of the box |
| CSV field escaping | Custom regex replacements | Dedicated `escapeField` function per RFC 4180 | The rules (quote on comma/newline/quote, double-escape internal quotes) are simple but easy to get subtly wrong. A focused utility function is ~10 lines and testable. |
| Paginated query with total count | Two separate tRPC procedures | Single procedure with `Promise.all` for data + count | Avoids waterfall requests; the list procedure returns both `entries[]` and `total` in one round trip |

**Key insight:** Phase 3 is primarily a UI phase. The database schema (entries table with status column, indexes for search/sort) already exists from Phase 2. The tRPC infrastructure is proven. The main work is building React components that wire up to new tRPC procedures.

---

## Common Pitfalls

### Pitfall 1: ILIKE Search Without Escaping User Input

**What goes wrong:** User types `%` or `_` in the search box and gets unexpected results because these are LIKE/ILIKE wildcards in PostgreSQL. Searching for `%` matches every row.
**Why it happens:** The `%${search}%` pattern wrapping is correct for "contains" behavior, but the user's search term itself may contain LIKE metacharacters.
**How to avoid:** Escape `%` and `_` in the user's search input before wrapping with wildcards. Replace `%` with `\%` and `_` with `\_`, then wrap: `%${escaped}%`. Alternatively, use PostgreSQL's `escape` clause or simply accept that `%`/`_` in search terms are edge cases unlikely to matter in practice for v1.
**Warning signs:** Searching for literal percent signs or underscores returns incorrect results.

### Pitfall 2: TanStack Table Pagination Off-By-One

**What goes wrong:** Page numbers display incorrectly or the first/last page is inaccessible. Users see "Page 0 of 5" instead of "Page 1 of 5."
**Why it happens:** TanStack Table uses 0-based `pageIndex` internally, but the UI and tRPC API should use 1-based page numbers for user display. Mixing the two causes off-by-one errors.
**How to avoid:** TanStack Table state uses `pageIndex` (0-based). tRPC input uses `page` (1-based). Convert at the boundary: `tRPC page = table pageIndex + 1`. Keep this conversion in the entries page component, not in the table component.
**Warning signs:** First page shows "Page 0," or clicking "Next" skips a page.

### Pitfall 3: CSV Column Mismatch with Dynamic Field Config

**What goes wrong:** CSV headers say "Name, Company" but the data columns are shifted because the project doesn't collect those fields. The exported CSV has misaligned data.
**Why it happens:** CSV column generation doesn't account for the project's field config (which fields are enabled/disabled).
**How to avoid:** Read the project's `fieldConfig` when generating CSV. Only include columns for fields the project actually collects. The same `fieldConfig` that drives the entries table column visibility should drive CSV column inclusion.
**Warning signs:** Opening the CSV in Excel shows data in wrong columns, or empty columns where disabled fields are.

### Pitfall 4: Stale Row Selection After Page Change or Status Update

**What goes wrong:** User selects 5 entries on page 1, navigates to page 2, comes back to page 1, and the selection state is inconsistent (shows wrong checkboxes checked, or the bulk action bar shows wrong count).
**Why it happens:** TanStack Table's row selection state uses row indices by default. After pagination or data refetch, the same indices may refer to different rows.
**How to avoid:** Configure TanStack Table with `getRowId: (row) => row.id` so selection state uses entry UUIDs, not array indices. Clear row selection after a bulk status update mutation succeeds (`setRowSelection({})`).
**Warning signs:** Checkbox states don't match visual selection after pagination or mutation.

### Pitfall 5: N+1 Query in Stats Aggregation

**What goes wrong:** Stats bar shows total count, then makes separate queries for each status count (new, contacted, converted, archived), resulting in 5 database queries.
**Why it happens:** Naive implementation fetches total count, then iterates over status values and queries each one.
**How to avoid:** Use a single `GROUP BY status` query that returns all status counts in one roundtrip. Two queries total: one for overall count, one grouped by status. Run in parallel with `Promise.all`.
**Warning signs:** Stats bar loads slowly; database shows excessive queries per page load.

### Pitfall 6: Bulk Update Without Reasonable Limit

**What goes wrong:** User selects "all" on a project with 50,000 entries and the bulk update mutation sends 50,000 UUIDs in the request body, causing request size limits to be exceeded or extremely slow queries.
**Why it happens:** No upper bound on the `entryIds` array in the tRPC input.
**How to avoid:** Cap `entryIds` at a reasonable limit (e.g., 500) in the Zod schema. If users need to update more, they can do it in batches or use a "select all matching filter" pattern in a future iteration. For v1, page-level selection (25-100 entries) is the expected use case.
**Warning signs:** Bulk updates time out or fail with 413 Payload Too Large.

---

## Code Examples

### Entry Router Registration

```typescript
// packages/trpc/src/router.ts
import { apiKeyRouter } from './routers/api-key';
import { entryRouter } from './routers/entry';
import { projectRouter } from './routers/project';
import { userRouter } from './routers/user';
import { router } from './trpc';

export const appRouter = router({
  user: userRouter,
  project: projectRouter,
  apiKey: apiKeyRouter,
  entry: entryRouter,
});
```

### TanStack Router File Route for Entries Page

```typescript
// apps/web/src/routes/projects/$projectId/entries.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/projects/$projectId/entries')({
  component: EntriesPage,
});

function EntriesPage() {
  const { projectId } = Route.useParams();
  // tRPC query for entries, stats, project field config
  // Render: stats bar, search input, status filter, entries table, pagination
}
```

### Entry Detail Route

```typescript
// apps/web/src/routes/projects/$projectId/entries/$entryId.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/projects/$projectId/entries/$entryId')({
  component: EntryDetailPage,
});

function EntryDetailPage() {
  const { projectId, entryId } = Route.useParams();
  // tRPC query for single entry by ID
  // Render: all fields, metadata as key-value pairs, status dropdown, timestamps
}
```

### Status Badge Component (Reusable)

```typescript
// apps/web/src/components/EntryStatusBadge.tsx
const statusStyles: Record<string, React.CSSProperties> = {
  new: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  contacted: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  converted: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  archived: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
};

function EntryStatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.125rem 0.5rem',
      fontSize: '0.75rem',
      fontWeight: 500,
      borderRadius: '9999px',
      ...statusStyles[status],
    }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
```

### Bulk Action Bar

```typescript
// apps/web/src/components/BulkActionBar.tsx
function BulkActionBar({ selectedCount, onStatusChange, isPending }: Props) {
  if (selectedCount === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 1rem',
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '0.375rem',
      marginBottom: '1rem',
      fontSize: '0.875rem',
    }}>
      <span style={{ fontWeight: 500 }}>{selectedCount} selected</span>
      <span style={{ color: '#6b7280' }}>Set status:</span>
      {['contacted', 'converted', 'archived'].map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onStatusChange(status)}
          disabled={isPending}
          style={{
            padding: '0.25rem 0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.25rem',
            backgroundColor: '#fff',
            fontSize: '0.75rem',
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </button>
      ))}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-table` v7 (component-based) | `@tanstack/react-table` v8 (headless) | 2022 | v8 is framework-agnostic, headless, tree-shakeable. v7 is deprecated. |
| Client-side pagination (load all, slice) | Server-side pagination (offset/limit) | Always been best practice | Necessary for any table beyond ~100 rows; TanStack Table supports via `manualPagination` |
| `window.open(csvUrl)` server-generated | Client-side Blob + `URL.createObjectURL` | 2020+ | No server-side file handling, works offline, no auth complexity on download endpoint |
| Custom `X-Total-Count` header for pagination | Return `total` alongside data in response body | Preference shift | Simpler than header-based approach; tRPC naturally returns structured objects |

**Deprecated/outdated:**
- `react-table` v7: Fully replaced by TanStack Table v8; no longer maintained
- `papaparse` for simple CSV generation: Overkill for write-only CSV; its strength is parsing, not generating

---

## Open Questions

1. **Entry detail: modal vs. dedicated page**
   - What we know: DASH-02 says "click an entry to view all collected fields." This could be a slide-over panel, a modal, or a dedicated route.
   - What's unclear: Which UX pattern the product owner prefers.
   - Recommendation: Use a dedicated route (`/projects/$projectId/entries/$entryId`) for deep-linkability and back-button support. A modal would work but loses URL state. The dedicated route is consistent with TanStack Router's file-based routing pattern already in use.

2. **Search debounce timing**
   - What we know: Search triggers a tRPC query on each keystroke (via search input state). Without debouncing, this fires a DB query per character typed.
   - What's unclear: The right debounce interval.
   - Recommendation: Debounce search input at 300ms. This is a common UX standard -- responsive enough to feel instant but prevents excessive queries. Implement with a `useEffect` + `setTimeout` pattern or a custom `useDebouncedValue` hook.

3. **CSV export for very large projects**
   - What we know: Client-side CSV generation loads all entries into browser memory. For v1, projects will have hundreds to low thousands of entries.
   - What's unclear: At what scale this becomes a problem.
   - Recommendation: For v1, use client-side generation via a tRPC query that returns all entries for the project (no pagination). Add a `maxExportRows` guard (e.g., 10,000) in the tRPC procedure. If a project exceeds this, show a message suggesting they contact support. Revisit with server-side streaming CSV if needed.

4. **Whether to add a text search index (pg_trgm)**
   - What we know: `ILIKE '%search%'` without an index performs a sequential scan. For small tables this is fine; for large tables it degrades.
   - What's unclear: Whether v1 projects will have enough entries to warrant a trigram index.
   - Recommendation: Skip the trigram index for v1. The existing `entries_project_id_idx` index narrows the scan to a single project's entries. For a project with 10,000 entries, ILIKE on 10,000 rows is sub-millisecond. Add `pg_trgm` GIN index in a future phase if performance monitoring shows search latency.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `packages/db/src/schema/entries.ts` -- entries table with status column, indexes for project_id, position, and created_at (verified by reading source)
- Existing codebase: `packages/db/src/schema/relations.ts` -- projects->entries relation already defined (verified by reading source)
- Existing codebase: `packages/trpc/src/routers/project.ts` -- established pattern for ownership-guarded tRPC procedures with Drizzle (verified by reading source)
- Existing codebase: `apps/web/src/components/ApiKeyList.tsx` -- established UI table pattern with inline styles (verified by reading source)
- [Drizzle ORM - Limit/Offset Pagination](https://orm.drizzle.team/docs/guides/limit-offset-pagination) -- `.limit()`, `.offset()`, ordering requirements
- [Drizzle ORM - Count Rows](https://orm.drizzle.team/docs/guides/count-rows) -- `count()` function, PostgreSQL bigint-to-integer cast
- [Drizzle ORM - Dynamic Query Building](https://orm.drizzle.team/docs/dynamic-query-building) -- `$dynamic()` for conditional where clauses, `PgSelect` typing
- [TanStack Table - Introduction](https://tanstack.com/table/latest/docs/introduction) -- headless architecture, ~12kb bundle, React 19 compatible
- [TanStack Table - Pagination Guide](https://tanstack.com/table/v8/docs/guide/pagination) -- `manualPagination`, `pageCount`, `onPaginationChange`
- [TanStack Table - Row Selection Guide](https://tanstack.com/table/v8/docs/guide/row-selection) -- `enableRowSelection`, `onRowSelectionChange`, `getIsAllPageRowsSelected`
- [TanStack Table - Column Filtering Guide](https://tanstack.com/table/latest/docs/guide/column-filtering) -- `manualFiltering`, column filter state

### Secondary (MEDIUM confidence)
- [@tanstack/react-table npm](https://www.npmjs.com/package/@tanstack/react-table) -- v8.21.3 latest, verified on npm registry
- [RFC 4180 CSV Handling Guide](https://inventivehq.com/blog/handling-special-characters-in-csv-files) -- quoting rules, double-quote escaping
- [Excel UTF-8 CSV BOM](https://www.edmundofuentes.com/blog/2020/06/13/excel-utf8-csv-bom-string/) -- BOM prefix for Excel compatibility

### Tertiary (LOW confidence -- flag for validation)
- Search debounce timing (300ms) -- based on common UX convention, not measured against this specific application
- `maxExportRows` guard (10,000) -- arbitrary limit based on browser memory assumptions; validate with testing if needed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries except `@tanstack/react-table` are already in use. TanStack Table is well-documented, actively maintained, and widely adopted.
- Architecture: HIGH -- patterns directly extend Phase 1/2 infrastructure. tRPC router pattern, project ownership guards, TanStack Router file routes, and inline-style UI are all established.
- Schema readiness: HIGH -- entries table already has status column, relevant indexes, and Drizzle relations. No schema changes needed.
- Pitfalls: HIGH -- identified from existing codebase patterns, Drizzle docs, TanStack Table docs, and CSV specification.
- CSV export: MEDIUM -- RFC 4180 is well-defined, but Excel BOM behavior can vary across versions and platforms.

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable domain; TanStack Table v8 API is mature and unlikely to change)
