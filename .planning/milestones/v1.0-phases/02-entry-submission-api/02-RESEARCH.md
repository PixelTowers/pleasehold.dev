# Phase 2: Entry Submission API - Research

**Researched:** 2026-02-25
**Domain:** REST API design, field validation, deduplication, rate limiting, queue positioning
**Confidence:** HIGH (primary findings verified against existing codebase, official docs, and Phase 1 patterns)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENTR-01 | External user can submit an entry via `POST /api/v1/entries` with API key auth | Hono REST route + API key middleware using existing `verifyProjectKey` utility from `@pleasehold/auth`; project resolved from key metadata |
| ENTR-02 | API validates submitted fields against project configuration | Dynamic Zod schema built from `projectFieldConfigs` boolean toggles; strict mode rejects unexpected fields |
| ENTR-03 | Duplicate email submissions return the existing entry (not a new one) | Unique constraint on `(project_id, email)` + INSERT-then-SELECT pattern (avoids Drizzle `onConflictDoNothing` + `returning()` empty-result bug) |
| ENTR-04 | API accepts optional metadata JSON (UTM params, referral source, etc.) | JSONB column on entries table with `.$type<Record<string, unknown>>()` for type safety |
| ENTR-05 | API returns entry with queue position in response | Stored `position` integer column, assigned atomically via subquery `SELECT COUNT(*) + 1` at insert time |
| ENTR-06 | Rate limiting enforced per API key (429 with Retry-After header) | `hono-rate-limiter` middleware with `keyGenerator` extracting API key from request header; IETF standard headers including Retry-After |

</phase_requirements>

---

## Summary

Phase 2 delivers the core value proposition of pleasehold: external developers POST entries to a public REST endpoint authenticated by API key. The existing codebase from Phase 1 provides all the infrastructure needed -- `verifyProjectKey` in `@pleasehold/auth` already verifies keys and extracts project IDs from metadata, the `projectFieldConfigs` schema defines which fields each project collects, and the Hono API server already has a commented placeholder for `/api/v1/entries`.

The main technical challenges are: (1) concurrent-safe deduplication by email+project with proper response semantics (returning the existing entry, not an error), (2) assigning gapless queue positions atomically under concurrent inserts, and (3) rate limiting per API key with proper IETF-standard headers including `Retry-After`. All three have well-established solutions documented below.

The phase requires one new database table (`entries`), one new Drizzle schema file, one Hono middleware for API key auth, one Hono middleware for rate limiting, one route handler for entry creation, and updates to the relation definitions. No new packages are needed beyond `hono-rate-limiter` (v0.5.3) since Drizzle, Hono, Zod, and the auth infrastructure are already in place.

**Primary recommendation:** Add the `entries` table with a unique constraint on `(project_id, email)` and a stored `position` column. Build a thin API key auth middleware that wraps the existing `verifyProjectKey`, a dynamic field validator that reads `projectFieldConfigs`, and use `hono-rate-limiter` for per-key rate limiting. Keep all public API code in `apps/api/src/` as Hono routes -- do NOT route through tRPC (per PROJECT.md: "REST for public API, tRPC for dashboard").

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hono` | ^4.12.2 | HTTP server + route handler | Already serves tRPC and auth routes; add REST routes alongside |
| `drizzle-orm` | ^0.45.1 | ORM for entries table schema + queries | Already used for projects, field configs, auth tables |
| `zod` | ^3.23.8 | Dynamic field validation schemas | Already used in tRPC routers; reuse for REST input validation |
| `@pleasehold/auth` | workspace | `verifyProjectKey` utility | Already built in Phase 1; extracts projectId from key metadata |
| `@pleasehold/db` | workspace | Schema + client | Already exports all tables and `createDb` |

### New Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `hono-rate-limiter` | ^0.5.3 | Per-API-key rate limiting middleware | Applied to `/api/v1/*` routes only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `hono-rate-limiter` | Better Auth API key built-in rate limiting | Better Auth's rate limiting works via `verifyApiKey` (server-side `auth.api`) which is NOT subject to Better Auth's HTTP rate limiter. It tracks `requestCount` in DB but does NOT return HTTP headers (no `Retry-After`). `hono-rate-limiter` gives proper 429 with IETF headers. |
| `hono-rate-limiter` | Custom Hono middleware | Custom: full control but must implement sliding window, header formatting, store management. `hono-rate-limiter` is express-rate-limit inspired, actively maintained (v0.5.3, Dec 2025), handles all edge cases. |
| In-memory rate limit store | Redis-backed store | In-memory is fine for single-process v1. Redis store (`@hono-rate-limiter/redis`) available when scaling to multiple processes. |
| `jsonb` column for metadata | Separate `entry_metadata` table | JSONB is simpler, avoids joins, and metadata is always read with the entry. Separate table only makes sense for querying metadata independently. |

**Installation:**
```bash
# apps/api
pnpm add hono-rate-limiter
```

---

## Architecture Patterns

### Recommended Project Structure (additions to Phase 1)

```
apps/api/src/
├── index.ts                    # Add /api/v1 routes alongside existing tRPC + auth
├── routes/
│   └── v1/
│       └── entries.ts          # POST /api/v1/entries handler
├── middleware/
│   ├── api-key-auth.ts         # Hono middleware: verify API key, resolve project
│   └── rate-limit.ts           # Hono middleware: per-key rate limiting config
└── lib/
    └── field-validator.ts      # Dynamic Zod schema builder from field config

packages/db/src/schema/
├── entries.ts                  # NEW: entries table definition
├── index.ts                    # Updated: add entries export
└── relations.ts                # Updated: add entries relations
```

### Pattern 1: API Key Auth Middleware for Hono

**What:** Hono middleware that extracts the API key from the request header, verifies it, resolves the project, and attaches project + field config to the Hono context.
**When to use:** All `/api/v1/*` routes.

```typescript
// apps/api/src/middleware/api-key-auth.ts
import type { Context, Next } from 'hono';
import { verifyProjectKey } from '@pleasehold/auth';

export function apiKeyAuth(auth: AuthInstance, db: Database) {
  return async (c: Context, next: Next) => {
    const apiKey = c.req.header('x-api-key');
    if (!apiKey) {
      return c.json({ error: { code: 'MISSING_API_KEY', message: 'x-api-key header is required' } }, 401);
    }

    // First, verify the key exists and is valid (without project check)
    const verifyResult = await auth.api.verifyApiKey({ body: { key: apiKey } });
    if (!verifyResult?.valid || !verifyResult.key?.metadata) {
      return c.json({ error: { code: 'INVALID_API_KEY', message: 'API key is invalid or revoked' } }, 401);
    }

    const projectId = verifyResult.key.metadata.projectId;
    if (!projectId) {
      return c.json({ error: { code: 'INVALID_API_KEY', message: 'API key is not scoped to a project' } }, 401);
    }

    // Load project with field config
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId)),
      with: { fieldConfig: true },
    });
    if (!project) {
      return c.json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' } }, 404);
    }

    // Attach to context for downstream handlers
    c.set('project', project);
    c.set('apiKeyId', verifyResult.key.id);
    return next();
  };
}
```

**Key decision:** Use `x-api-key` header (not `Authorization: Bearer`) because API keys are not bearer tokens in the OAuth sense. This avoids confusion with session-based auth on other routes. The `x-api-key` convention is widely used (Stripe, SendGrid, Postman).

### Pattern 2: Dynamic Field Validation from Project Config

**What:** Build a Zod schema at request time based on the project's `fieldConfig` booleans. Uses `z.strictObject()` to reject unexpected fields.
**When to use:** Inside the entry creation handler, before inserting into DB.

```typescript
// apps/api/src/lib/field-validator.ts
import { z } from 'zod';

interface FieldConfig {
  collectName: boolean;
  collectCompany: boolean;
  collectMessage: boolean;
}

export function buildEntrySchema(fieldConfig: FieldConfig) {
  const shape: Record<string, z.ZodTypeAny> = {
    email: z.string().email().max(254),
  };

  if (fieldConfig.collectName) {
    shape.name = z.string().min(1).max(200);
  }
  if (fieldConfig.collectCompany) {
    shape.company = z.string().min(1).max(200);
  }
  if (fieldConfig.collectMessage) {
    shape.message = z.string().min(1).max(2000);
  }

  // metadata is always optional -- UTM params, referral source, etc.
  shape.metadata = z.record(z.unknown()).optional();

  // strictObject rejects fields NOT in the schema (ENTR-02: "reject fields project doesn't expect")
  return z.strictObject(shape);
}
```

**Critical detail:** Use `z.strictObject()` (not `z.object()`) to enforce ENTR-02. With `z.object()`, extra fields are silently stripped. With `z.strictObject()`, extra fields cause a validation error -- which is the correct behavior for "API rejects submissions that don't match the project's configured field schema."

### Pattern 3: Entry Deduplication with Queue Position

**What:** Insert-then-SELECT pattern for concurrent-safe deduplication. Uses unique constraint on `(project_id, email)`.
**When to use:** Entry creation handler.

```typescript
// Conceptual pattern for the entry handler
async function createOrGetEntry(db, projectId, data) {
  // Attempt insert with position assignment via subquery
  const insertResult = await db
    .insert(entries)
    .values({
      projectId,
      email: data.email,
      name: data.name ?? null,
      company: data.company ?? null,
      message: data.message ?? null,
      metadata: data.metadata ?? null,
      position: sql`(SELECT COALESCE(MAX(${entries.position}), 0) + 1 FROM ${entries} WHERE ${entries.projectId} = ${projectId})`,
    })
    .onConflictDoNothing({ target: [entries.projectId, entries.email] })
    .returning();

  if (insertResult.length > 0) {
    // New entry created -- return 201
    return { entry: insertResult[0], created: true };
  }

  // Conflict occurred -- fetch existing entry (ENTR-03: return existing, not duplicate)
  const existing = await db.query.entries.findFirst({
    where: and(eq(entries.projectId, projectId), eq(entries.email, data.email)),
  });

  return { entry: existing, created: false };
}
```

**Why INSERT-then-SELECT instead of transaction with SELECT-first:**
1. INSERT with `onConflictDoNothing` is atomic at the DB level -- no race condition between check and insert
2. The happy path (new entry) is a single query
3. The duplicate path (existing entry) is two queries but only hits on actual duplicates
4. Avoids holding a transaction lock during the entire check-insert cycle

**Known Drizzle caveat:** `onConflictDoNothing()` + `.returning()` returns an empty array when a conflict occurs (this is PostgreSQL behavior, not a Drizzle bug -- `ON CONFLICT DO NOTHING` has nothing to return). The follow-up SELECT is required.

### Pattern 4: Rate Limiting per API Key

**What:** `hono-rate-limiter` middleware with `keyGenerator` that extracts the API key from the `x-api-key` header.
**When to use:** Applied before API key auth middleware on all `/api/v1/*` routes.

```typescript
// apps/api/src/middleware/rate-limit.ts
import { rateLimiter } from 'hono-rate-limiter';

export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000,     // 1 minute window
  limit: 60,                // 60 requests per minute per key
  standardHeaders: 'draft-6', // RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After
  keyGenerator: (c) => c.req.header('x-api-key') ?? '',
  // Returns 429 automatically with Retry-After header
});
```

**Header behavior:** `hono-rate-limiter` follows the IETF Rate Limit Headers specification (draft-6 by default). On 429 responses it sets:
- `RateLimit-Limit`: Maximum requests allowed (60)
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Seconds until the rate limit resets
- `Retry-After`: Seconds until the client can retry (set on 429 only)

**Ordering matters:** Rate limit middleware MUST run BEFORE API key auth middleware. This prevents unauthenticated flood from consuming `verifyApiKey` calls (which hit the database).

### Pattern 5: Response Format

**What:** Consistent JSON response shape for the public API.

```typescript
// 201 Created (new entry)
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "position": 42,
    "createdAt": "2026-02-25T12:00:00.000Z"
  }
}

// 200 OK (duplicate, existing entry returned per ENTR-03)
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "position": 12,
    "createdAt": "2026-02-25T10:00:00.000Z"
  }
}

// 400 Bad Request (validation failure per ENTR-02)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid submission",
    "details": [
      { "field": "email", "message": "Required" },
      { "field": "company", "message": "Unrecognized key" }
    ]
  }
}

// 401 Unauthorized
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API key is invalid or revoked"
  }
}

// 429 Too Many Requests (with Retry-After header)
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests"
  }
}
```

### Anti-Patterns to Avoid

- **Routing entry submission through tRPC:** PROJECT.md explicitly states "REST for public API, tRPC for dashboard." External developers need a plain HTTP endpoint, not tRPC's binary protocol. Keep `/api/v1/entries` as a Hono route.
- **Using `z.object()` instead of `z.strictObject()` for field validation:** `z.object()` silently strips unknown keys. ENTR-02 requires rejection of fields that don't match the schema.
- **Using Drizzle `onConflictDoUpdate` to fake deduplication:** Updating an existing entry on conflict changes its data -- violating ENTR-03 which says "return the existing entry" (not update it).
- **Assigning queue position in application code:** `position = await getCount() + 1` has a race condition under concurrent inserts. Use a SQL subquery within the INSERT statement.
- **Placing rate limit middleware AFTER auth middleware:** An attacker flooding with invalid keys would still trigger `verifyApiKey` DB calls on every request. Rate limit must come first.
- **Using `Authorization: Bearer` header for API keys:** This conflicts with session-based auth on `/trpc/*` and `/api/auth/*` routes. Use `x-api-key` as a dedicated header.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting with headers | Custom sliding window + header logic | `hono-rate-limiter` | IETF-compliant headers, configurable stores, tested edge cases (window boundaries, concurrent access) |
| API key verification | Custom hash + lookup | `verifyProjectKey` (already built) | Phase 1 already handles hash verification, enabled check, metadata extraction |
| Input validation | Custom field-by-field checks | Zod `strictObject` | Structured error messages, type inference, composable schemas |
| Queue position assignment | Application-level counter | SQL subquery in INSERT | Concurrent-safe without application-level locks |
| Email normalization | Custom regex/parsing | Zod `z.string().email()` | RFC 5322 validation, max-length enforcement |

**Key insight:** Phase 2 is mostly wiring -- connecting Phase 1's infrastructure (auth, DB, field config) to a new REST endpoint. The new code is thin: one middleware, one validator, one handler, one schema file. Resist the urge to over-engineer.

---

## Common Pitfalls

### Pitfall 1: Queue Position Race Condition Under Concurrent Inserts

**What goes wrong:** Two concurrent `POST /api/v1/entries` requests both compute `position = COUNT(*) + 1` in application code, both get the same value, and two entries share the same position number.

**Why it happens:** The `SELECT COUNT(*)` and `INSERT` are separate statements without serialization.

**How to avoid:** Compute position inside the INSERT statement using a subquery: `position = (SELECT COALESCE(MAX(position), 0) + 1 FROM entries WHERE project_id = $1)`. PostgreSQL's row-level locking on INSERT ensures the subquery sees the latest committed state. For even stricter guarantees, wrap in a serializable transaction.

**Warning signs:** Two entries in the same project with identical `position` values.

### Pitfall 2: `onConflictDoNothing` Returns Empty Array

**What goes wrong:** Developer writes `db.insert(entries).values(...).onConflictDoNothing().returning()`, expects to get the conflicting row back, gets `[]` instead. Handler returns 500 or null to the caller.

**Why it happens:** This is PostgreSQL behavior -- `ON CONFLICT DO NOTHING` literally does nothing, so there is nothing to return. Drizzle faithfully passes through the empty result.

**How to avoid:** Always follow the INSERT-then-SELECT pattern documented in Pattern 3 above. Check `insertResult.length === 0` and issue a follow-up SELECT.

**Warning signs:** Duplicate email submissions return 500 or empty response instead of the existing entry.

### Pitfall 3: Metadata Field Allows Arbitrary JSON Injection

**What goes wrong:** External user submits `{ "metadata": { "__proto__": {...} } }` or deeply nested objects that consume memory/CPU during serialization.

**Why it happens:** `z.record(z.unknown())` accepts any JSON structure without depth or size limits.

**How to avoid:** Constrain metadata validation: limit to `z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))` (flat key-value pairs only). Add a max-size check (e.g., `JSON.stringify(metadata).length <= 4096`). This covers UTM params and referral sources without enabling abuse.

**Warning signs:** Large metadata payloads causing slow inserts or inflated storage.

### Pitfall 4: Strict Validation Rejects Fields the Project HAS Enabled

**What goes wrong:** Project has `collectName: true` but the Zod schema builder doesn't include `name` in the schema. Submissions with `name` are rejected as "unrecognized key."

**Why it happens:** The `buildEntrySchema` function reads the wrong field config, or the field config wasn't loaded with the project (missing `with: { fieldConfig: true }` in query).

**How to avoid:** In the API key auth middleware, always load the project WITH its field config (`with: { fieldConfig: true }`). Verify in tests that each toggle properly adds/removes the field from the schema.

**Warning signs:** Valid submissions rejected with "Unrecognized key" errors for fields the project has enabled.

### Pitfall 5: CORS Blocks External Developer Requests

**What goes wrong:** External developer's browser-based form submission to `/api/v1/entries` gets blocked by CORS because the Hono CORS middleware only allows `webUrl` origin.

**Why it happens:** The current CORS config in `apps/api/src/index.ts` only allows `[webUrl]`. External developers' sites are different origins.

**How to avoid:** The `/api/v1/*` routes need a separate CORS policy. Options: (a) allow `*` origin for `/api/v1/*` routes only (API key provides auth, CORS is not a security boundary for API-key-authenticated endpoints), or (b) document that submissions should come from server-side code, not browser JavaScript. Recommendation: allow `*` for `/api/v1/*` since the API key is the security mechanism.

**Warning signs:** Browser console shows "Blocked by CORS policy" when submitting from an external domain.

### Pitfall 6: Entry Status Column Missing Breaks Phase 3

**What goes wrong:** Phase 3 (Dashboard) needs entry status (new, contacted, converted, archived) but the entries table doesn't have a `status` column. Requires a migration in Phase 3.

**Why it happens:** Temptation to only implement what Phase 2 needs. But the entries table schema affects Phase 3 directly.

**How to avoid:** Add `status` column with default `'new'` to the entries table from the start. Phase 2 doesn't expose it in the API response, but it's ready for Phase 3. Avoids a migration that touches every row.

---

## Code Examples

### Entries Table Schema

```typescript
// packages/db/src/schema/entries.ts
import { index, jsonb, pgTable, integer, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const entries = pgTable(
  'entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name'),
    company: text('company'),
    message: text('message'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    position: integer('position').notNull(),
    status: text('status', { enum: ['new', 'contacted', 'converted', 'archived'] })
      .notNull()
      .default('new'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('entries_project_email_unique').on(table.projectId, table.email),
    index('entries_project_id_idx').on(table.projectId),
    index('entries_project_id_position_idx').on(table.projectId, table.position),
    index('entries_project_id_created_at_idx').on(table.projectId, table.createdAt),
  ],
);
```

### Entry Relations

```typescript
// Addition to packages/db/src/schema/relations.ts
export const entriesRelations = relations(entries, ({ one }) => ({
  project: one(projects, {
    fields: [entries.projectId],
    references: [projects.id],
  }),
}));

// Update projectsRelations to include entries
export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(authUsers, {
    fields: [projects.userId],
    references: [authUsers.id],
  }),
  fieldConfig: one(projectFieldConfigs),
  entries: many(entries),
}));
```

### Complete Entry Handler

```typescript
// apps/api/src/routes/v1/entries.ts
import { Hono } from 'hono';
import { and, eq, sql } from 'drizzle-orm';
import { entries } from '@pleasehold/db';
import { buildEntrySchema } from '../../lib/field-validator';

const entriesRoute = new Hono();

entriesRoute.post('/', async (c) => {
  const project = c.get('project');
  const body = await c.req.json();

  // Build validation schema from project field config
  const schema = buildEntrySchema(project.fieldConfig);
  const parseResult = schema.safeParse(body);

  if (!parseResult.success) {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid submission',
        details: parseResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    }, 400);
  }

  const data = parseResult.data;
  const db = c.get('db');

  // Attempt insert with atomic position assignment
  const insertResult = await db
    .insert(entries)
    .values({
      projectId: project.id,
      email: data.email,
      name: data.name ?? null,
      company: data.company ?? null,
      message: data.message ?? null,
      metadata: data.metadata ?? null,
      position: sql`(SELECT COALESCE(MAX(${entries.position}), 0) + 1 FROM ${entries} WHERE ${entries.projectId} = ${project.id})`,
    })
    .onConflictDoNothing({ target: [entries.projectId, entries.email] })
    .returning();

  if (insertResult.length > 0) {
    const entry = insertResult[0];
    return c.json({
      data: {
        id: entry.id,
        email: entry.email,
        name: entry.name,
        company: entry.company,
        position: entry.position,
        createdAt: entry.createdAt.toISOString(),
      },
    }, 201);
  }

  // Duplicate -- return existing entry (ENTR-03)
  const existing = await db.query.entries.findFirst({
    where: and(eq(entries.projectId, project.id), eq(entries.email, data.email)),
  });

  return c.json({
    data: {
      id: existing!.id,
      email: existing!.email,
      name: existing!.name,
      company: existing!.company,
      position: existing!.position,
      createdAt: existing!.createdAt.toISOString(),
    },
  }, 200);
});

export { entriesRoute };
```

### Hono Route Registration

```typescript
// apps/api/src/index.ts -- additions
import { apiKeyAuth } from './middleware/api-key-auth';
import { apiRateLimiter } from './middleware/rate-limit';
import { entriesRoute } from './routes/v1/entries';

// Public REST API: separate CORS for external origins
app.use('/api/v1/*', cors({ origin: '*' }));

// Rate limit BEFORE auth (prevent DB hits from flood)
app.use('/api/v1/*', apiRateLimiter);

// API key auth middleware (verify key, resolve project, attach to context)
app.use('/api/v1/*', apiKeyAuth(auth, db));

// Mount entry routes
app.route('/api/v1/entries', entriesRoute);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `express-rate-limit` | `hono-rate-limiter` | 2024-2025 | Hono-native, same API as express-rate-limit, IETF header support |
| Custom IETF rate limit headers | `hono-rate-limiter` draft-6/draft-7 | 2024 | draft-6 (default) uses separate `RateLimit-*` headers; draft-7 combines into single `RateLimit` header |
| `ON CONFLICT DO UPDATE` for deduplication | `ON CONFLICT DO NOTHING` + SELECT | N/A | DO UPDATE changes existing data; DO NOTHING preserves original entry (correct for ENTR-03) |
| Application-level counters for position | SQL subquery `MAX(position) + 1` | N/A | Concurrent-safe, no application locks needed |

**Deprecated/outdated:**
- `express-rate-limit`: Works only with Express; `hono-rate-limiter` is the Hono equivalent
- Manual `X-RateLimit-*` headers: Replaced by IETF standard `RateLimit-*` headers (draft-6)

---

## Open Questions

1. **Rate limit values for production**
   - What we know: `hono-rate-limiter` supports `windowMs` and `limit` configuration. The middleware is easy to adjust.
   - What's unclear: The right default rate limit for pleasehold (60/min is a reasonable starting point, but depends on use case -- waitlist launches can have bursts).
   - Recommendation: Start with 60 requests per minute per API key. Make configurable via environment variable (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`). Can adjust post-launch without code changes.

2. **Queue position gap handling**
   - What we know: `MAX(position) + 1` within an INSERT is safe for concurrent inserts. However, if entries are ever deleted (Phase 3 or future), positions will have gaps.
   - What's unclear: Whether the product should renumber positions on deletion (expensive) or accept gaps (simpler).
   - Recommendation: Accept gaps. Position represents "order of arrival," not a live counter. Document this as a product decision.

3. **Entry metadata size limit**
   - What we know: JSONB has no inherent size limit in PostgreSQL. Unbounded metadata is an abuse vector.
   - What's unclear: The right maximum size for metadata.
   - Recommendation: Limit metadata to flat key-value pairs with a 4KB serialized JSON limit. Covers UTM params (utm_source, utm_medium, utm_campaign, utm_content, utm_term) and referral data without enabling abuse.

4. **Whether `hono-rate-limiter` in-memory store resets on server restart**
   - What we know: The in-memory store lives in the Node.js process. Server restart clears all rate limit counters.
   - What's unclear: Whether this matters for v1.
   - Recommendation: Acceptable for v1 single-process deployment. Note in Phase 5 (Docker/self-hosting) that Redis store should be configured for multi-process deployments.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `packages/auth/src/verify-project-key.ts` -- verifyProjectKey utility (verified by reading source)
- Existing codebase: `packages/db/src/schema/field-configs.ts` -- field config boolean toggles (verified by reading source)
- Existing codebase: `apps/api/src/index.ts` -- Hono server with placeholder for Phase 2 routes (verified by reading source)
- Drizzle ORM docs -- [Upsert Query](https://orm.drizzle.team/docs/guides/upsert) (onConflictDoNothing, onConflictDoUpdate)
- Drizzle ORM docs -- [PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg) (jsonb with `.$type<>()`)
- Better Auth docs -- [API Key plugin](https://www.better-auth.com/docs/plugins/api-key) (verifyApiKey response shape, rate limiting, metadata)
- Better Auth docs -- [Rate Limit](https://www.better-auth.com/docs/concepts/rate-limit) (only applies to client-initiated requests, NOT `auth.api` calls)

### Secondary (MEDIUM confidence)
- hono-rate-limiter -- [Official docs](https://honohub.dev/docs/rate-limiter) (installation, keyGenerator, standardHeaders, Retry-After)
- hono-rate-limiter -- [GitHub repository](https://github.com/rhinobase/hono-rate-limiter) (v0.5.3, Dec 2025, MIT license, TypeScript)
- Drizzle ORM issue [#2474](https://github.com/drizzle-team/drizzle-orm/issues/2474) -- `returning()` with `onConflictDoNothing` returns empty array (confirmed as expected PostgreSQL behavior)

### Tertiary (LOW confidence -- flag for validation)
- Rate limit default values (60 req/min) -- based on general API best practices, not specific to pleasehold's use case. Validate with load testing.
- In-memory store behavior on restart -- inferred from Node.js process model, not explicitly tested with `hono-rate-limiter`.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use (except `hono-rate-limiter` which is well-documented and actively maintained)
- Architecture: HIGH -- patterns directly extend Phase 1 infrastructure; data flow documented in Phase 1 research
- Schema design: HIGH -- entries table follows existing conventions (uuid PKs, snake_case columns, timestamptz)
- Pitfalls: HIGH -- identified from existing codebase patterns, Drizzle documented behavior, and production API design experience
- Rate limiting: MEDIUM -- `hono-rate-limiter` docs verified, but exact config values need tuning

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable domain; `hono-rate-limiter` may release new versions but API is stable)
