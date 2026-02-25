# Phase 1: Auth, Projects, and API Keys - Research

**Researched:** 2026-02-25
**Domain:** Authentication, project management, API key lifecycle — identity and access layer
**Confidence:** HIGH (primary findings verified against GoldenBerry reference codebase + Better Auth source)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Email/password signup + GitHub OAuth + Google OAuth (Better Auth handles all three)
- Sessions persist across browser refresh (7-day expiry, 1-day updateAge)
- Logout available from any page
- Better Auth `apiKey` plugin handles key lifecycle (generation, hashing, verification)
- Keys are user-scoped in Better Auth; store `projectId` in key metadata to achieve project scoping
- Key prefix: `ph_live_` — recognizable format for developers
- Show key once on creation with copy button (Stripe pattern) — never displayed again
- Keys hashed at rest in database
- Multiple keys per project allowed (staging, production, different services)
- Keys have optional user-defined labels ("production", "staging", "chris-local")
- Revoked keys immediately reject subsequent API calls
- Predefined toggle-based fields: email (always required), name, company, message
- No custom field builder — toggle presets only
- Text-only field types
- Smart mode defaults: waitlist → email only; demo-booking → email + name + company + message
- Owner can change which fields are enabled after creation
- API strictly validates submissions: reject any fields the project doesn't expect
- Mode (waitlist vs demo-booking) is locked on creation — cannot be changed after
- Project has a name and mode as core properties
- First login: guided creation flow for first project
- Returning users: project list as card grid (name, mode, entry count, last activity)
- Each project has overview page with stats, quick links, and recent activity

### Claude's Discretion

- Dashboard styling and layout details (spacing, typography, color scheme)
- Exact guided creation flow steps and UI
- API key list presentation in project settings
- Error messages and validation feedback copy
- Empty state designs

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create an account with email and password | Better Auth `emailAndPassword: { enabled: true }` + Drizzle adapter |
| AUTH-02 | User session persists across browser refresh | Better Auth session config: `expiresIn: 604800` (7 days), cookie-based |
| AUTH-03 | User can log out from any page | `authClient.signOut()` from `better-auth/react` client; available globally via React context |
| PROJ-01 | User can create a project with a name and mode (waitlist or demo-booking) | `projects` Drizzle table + tRPC `project.create` protectedProcedure |
| PROJ-02 | User can manage multiple projects from a single account | `projects` table scoped by `userId`; tRPC `project.list` returns all owned projects |
| PROJ-03 | User can configure which fields to collect per project | `project_field_configs` table (boolean columns per field); tRPC `project.updateFields` |
| PROJ-04 | User can switch between projects in the dashboard | Client-side routing via TanStack Router; project list in sidebar or nav |
| KEYS-01 | User can generate project-scoped API keys from the dashboard | Better Auth `apiKey` plugin `createApiKey` with `metadata: { projectId }` |
| KEYS-02 | API keys use recognizable prefix format (`ph_live_...`) | Better Auth apiKey plugin `prefix` option set to `ph_live_` |
| KEYS-03 | User can revoke API keys | Better Auth `revokeApiKey` (sets `enabled: false`); verified rejection on next request |
| KEYS-04 | API keys hashed at rest and displayed only once on creation | Better Auth apiKey plugin hashes by default; `start` field stores first 8 chars for display |

</phase_requirements>

---

## Summary

Phase 1 establishes the complete identity and access layer for pleasehold. The GoldenBerry reference codebase provides a battle-tested blueprint: the same technology stack (Better Auth + Drizzle + tRPC + Hono) is already proven in production. The monorepo structure (`apps/api`, `apps/web`, `packages/auth`, `packages/db`, `packages/trpc`) can be copied almost verbatim with pleasehold-specific schema substitutions.

The most nuanced implementation challenge is project-scoped API keys. Better Auth's `apiKey` plugin scopes keys to users, not projects. The workaround — storing `projectId` in the key's `metadata` JSON column — is functional but requires discipline: all API key validation middleware must read and verify `metadata.projectId`, not just check that the key exists and is enabled. This isolation logic must live in a single middleware function to avoid scattered tenant-check code in future phases.

The field configuration system (`PROJ-03`) is intentionally simple: four boolean toggles stored in a `project_field_configs` table (or as JSONB on the projects table). The API validation in Phase 2 will read these flags to accept or reject submitted fields. Designing the schema correctly in Phase 1 is critical — Phase 2 depends on it directly.

**Primary recommendation:** Scaffold the monorepo from GoldenBerry's structure, enable `emailAndPassword` (GoldenBerry disables it — pleasehold needs it), configure the `apiKey` plugin with `ph_live_` prefix, and design the `projects` + `project_field_configs` schema as the shared data contract for Phases 2–5.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | ^1.x | Auth (sessions, OAuth, API keys) | Already used in GoldenBerry; handles hashing, sessions, OAuth flow out of the box |
| `drizzle-orm` | ^0.40+ | ORM + schema | Used in GoldenBerry; type-safe queries, Postgres-native, migration support |
| `drizzle-kit` | ^0.30+ | Migration CLI | Paired with drizzle-orm for `generate` + `migrate` commands |
| `postgres` (postgres.js) | ^3.x | Postgres driver | Used in GoldenBerry `createDb`; lightweight, no connection pool config needed for v1 |
| `hono` | ^4.x | HTTP server | Used in GoldenBerry API; handles auth routes at `/api/auth/*`, tRPC at `/trpc/*` |
| `@hono/trpc-server` | ^0.3+ | tRPC adapter for Hono | Bridges tRPC router into Hono middleware |
| `@trpc/server` | ^11.x | tRPC server | Type-safe RPC; procedures map directly to dashboard operations |
| `@trpc/client`, `@trpc/react-query` | ^11.x | tRPC client | Used in web app with TanStack Query |
| `superjson` | ^2.x | tRPC transformer | Handles Date serialization across wire |
| `zod` | ^3.x | Input validation | Schema validation for tRPC procedure inputs |
| `react` | 19.x | UI framework | Decided stack |
| `@tanstack/react-router` | ^1.x | Client-side routing | Used in GoldenBerry web app |
| `@tanstack/react-query` | ^5.x | Server state management | Pairs with tRPC react adapter |
| `vite` | ^6.x | Frontend bundler | Decided stack |
| `turborepo` | ^2.x | Monorepo task orchestration | Used in GoldenBerry (`turbo.json`) |
| `pnpm` | ^10.x | Package manager | Used in GoldenBerry (`pnpm-workspace.yaml`) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `better-auth/client/plugins` — `apiKeyClient` | same as better-auth | Client-side API key operations | Web app auth client only |
| `better-auth/adapters/drizzle` — `drizzleAdapter` | same | Connects Better Auth to Drizzle schema | Required for Better Auth DB integration |
| `@biomejs/biome` | ^2.x | Lint + format | Already in GoldenBerry; replaces ESLint + Prettier |
| `@hono/node-server` | ^1.x | Node.js server adapter for Hono | `apps/api` entry point |
| `husky` | ^9.x | Git hooks | Pre-commit quality gate (biome check) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `postgres.js` driver | `pg` / `node-postgres` | `pg` is more common but postgres.js is simpler and GoldenBerry uses it |
| Better Auth apiKey plugin | Custom key generation | Custom: more control; Better Auth: hashing, verification, rate limiting already built |
| tRPC | REST endpoints | REST is simpler for public API (Phase 2 uses REST); dashboard uses tRPC for type safety |
| TanStack Router | React Router v7 | Both valid; GoldenBerry uses TanStack Router — match reference |

**Installation:**
```bash
# Root workspace
pnpm add -w turbo typescript @biomejs/biome husky -D

# packages/db
pnpm add drizzle-orm postgres
pnpm add drizzle-kit -D

# packages/auth
pnpm add better-auth

# packages/trpc
pnpm add @trpc/server superjson zod

# apps/api
pnpm add hono @hono/node-server @hono/trpc-server

# apps/web
pnpm add react react-dom @tanstack/react-router @tanstack/react-query @trpc/client @trpc/react-query better-auth superjson
pnpm add vite @vitejs/plugin-react -D
```

---

## Architecture Patterns

### Recommended Project Structure

```
pleasehold/
├── apps/
│   ├── api/                    # Hono server — tRPC + auth routes + REST /api/v1 (Phase 2)
│   │   └── src/
│   │       └── index.ts        # App entry: CORS, auth handler, tRPC middleware, health
│   └── web/                    # React 19 + Vite dashboard
│       └── src/
│           ├── routes/         # TanStack Router file-based routes
│           ├── components/     # Shared UI components
│           ├── hooks/          # Custom hooks (useAuth, useProject)
│           └── lib/            # trpc client, auth client singletons
├── packages/
│   ├── auth/                   # Better Auth config factory + client factory + types
│   │   └── src/
│   │       ├── config.ts       # createAuth() — server-side
│   │       ├── client.ts       # createAuthClient() — browser-side
│   │       ├── middleware.ts   # Hono authMiddleware (session extraction)
│   │       └── types.ts        # AuthUser, AuthSession interfaces
│   ├── db/                     # Drizzle schema + client factory
│   │   └── src/
│   │       ├── client.ts       # createDb(connectionUrl)
│   │       ├── schema/
│   │       │   ├── auth.ts     # auth_users, sessions, accounts, verifications
│   │       │   ├── api-keys.ts # apikeys (Better Auth schema + metadata col)
│   │       │   ├── projects.ts # projects table
│   │       │   ├── field-configs.ts  # project_field_configs table
│   │       │   ├── relations.ts
│   │       │   └── index.ts    # barrel export
│   │       └── index.ts
│   └── trpc/                   # tRPC router + context
│       └── src/
│           ├── trpc.ts         # initTRPC, publicProcedure, protectedProcedure
│           ├── context.ts      # Context interface + createContext()
│           ├── router.ts       # appRouter (merged sub-routers)
│           └── routers/
│               ├── project.ts  # project.list, create, update, getById
│               ├── api-key.ts  # apiKey.list, create, revoke
│               └── user.ts     # user.me, update
├── turbo.json
├── pnpm-workspace.yaml
├── biome.json
└── package.json
```

### Pattern 1: Auth Configuration Factory

Mirror GoldenBerry's `createAuth()` factory exactly, with these pleasehold-specific changes:
- Enable `emailAndPassword` (GoldenBerry disables it; pleasehold requires it per AUTH-01)
- Add `apiKey()` plugin with `prefix: 'ph_live_'`
- Keep GitHub + Google OAuth as optional (env-gated)
- Keep `onUserCreated` hook to sync `auth_users` → app `users` table

```typescript
// Source: GoldenBerry packages/auth/src/config.ts (adapted)
// packages/auth/src/config.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { apiKey } from 'better-auth/plugins';

export function createAuth(options: AuthOptions) {
  return betterAuth({
    database: drizzleAdapter(options.db, {
      provider: 'pg',
      schema: {
        user: authUsers,
        session: sessions,
        account: accounts,
        verification: verifications,
        apikey: apikeys,
      },
    }),
    secret: options.secret,
    baseURL: options.baseUrl,
    trustedOrigins: options.trustedOrigins,
    emailAndPassword: {
      enabled: true,           // KEY DIFFERENCE from GoldenBerry
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,  // 7 days
      updateAge: 60 * 60 * 24,       // 1 day
    },
    socialProviders: { /* google + github if env vars present */ },
    plugins: [
      apiKey({
        prefix: 'ph_live_',
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await options.onUserCreated?.({ id: user.id, email: user.email, name: user.name });
          },
        },
      },
    },
  });
}
```

### Pattern 2: Project-Scoped API Keys via Metadata

Better Auth's `apiKey` plugin scopes keys to `userId`. Project scoping is achieved by storing `projectId` in the `metadata` JSON field. This is the documented workaround for GitHub issue #4746 (native project scoping not yet merged).

```typescript
// Source: Better Auth apiKey plugin docs + GoldenBerry packages/db/src/schema/api-keys.ts
// Key creation — tRPC mutation in routers/api-key.ts
create: protectedProcedure
  .input(z.object({
    projectId: z.string().uuid(),
    label: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Verify project belongs to user before creating key
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
      columns: { id: true },
    });
    if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

    const result = await ctx.auth.api.createApiKey({
      body: {
        name: input.label ?? 'API Key',
        prefix: 'ph_live_',
        metadata: { projectId: input.projectId },
      },
      headers: ctx.requestHeaders,  // needed for Better Auth session context
    });

    // result.key is the ONLY time the full key is available
    // result.start stores the first 8 chars for dashboard display
    return { id: result.id, key: result.key, start: result.start };
  }),
```

**Critical:** The full plaintext key is ONLY available in the `create` response. After that, only `start` (first 8 chars) is available. Return `key` from the mutation and have the client display it with a copy button — never store it client-side beyond the single display moment.

### Pattern 3: tRPC Context with Auth Session

```typescript
// Source: GoldenBerry packages/trpc/src/context.ts (adapted — no S3, no queue in Phase 1)
// packages/trpc/src/context.ts
export interface Context {
  db: Database;
  session: AuthSession | null;
  user: AuthUser | null;
  auth: ReturnType<typeof createAuth>;  // needed for apiKey operations
}

// apps/api/src/index.ts — tRPC middleware registration
app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: async (_opts, c) => {
    const authSession = await auth.api.getSession({ headers: c.req.raw.headers });
    return createContext({
      db,
      session: authSession?.session ?? null,
      user: authSession?.user ?? null,
      auth,
    });
  },
}));

// Auth routes handler
app.all('/api/auth/*', async (c) => {
  const response = await auth.handler(c.req.raw);
  return new Response(response.body, { status: response.status, headers: response.headers });
});
```

### Pattern 4: Drizzle Schema — Two-Table User Pattern

GoldenBerry uses a two-table pattern: `auth_users` (owned by Better Auth, do not modify) and `users` (app-level profile). Mirror this for pleasehold:

```typescript
// packages/db/src/schema/auth.ts — Better Auth owns these, never hand-modify
export const authUsers = pgTable('auth_users', { /* as in GoldenBerry */ });
export const sessions = pgTable('sessions', { /* as in GoldenBerry */ });
export const accounts = pgTable('accounts', { /* as in GoldenBerry */ });
export const verifications = pgTable('verifications', { /* as in GoldenBerry */ });
// NOTE: No twoFactors table needed — skip 2FA plugin for pleasehold

// packages/db/src/schema/projects.ts
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mode: text('mode', { enum: ['waitlist', 'demo-booking'] }).notNull(),
  // mode is immutable after creation — enforced in tRPC update mutation (reject mode changes)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('projects_user_id_idx').on(table.userId),
]);

// packages/db/src/schema/field-configs.ts
// One row per project — boolean toggles for each collectable field
export const projectFieldConfigs = pgTable('project_field_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().unique()
    .references(() => projects.id, { onDelete: 'cascade' }),
  collectName: boolean('collect_name').notNull().default(false),
  collectCompany: boolean('collect_company').notNull().default(false),
  collectMessage: boolean('collect_message').notNull().default(false),
  // email is always required — no toggle needed, enforced at API layer
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// Seed row created automatically when project is created (in tRPC mutation)
// Defaults match mode: waitlist → all false; demo-booking → all true
```

### Pattern 5: Hono + tRPC + REST Coexistence

Phase 2 adds a public REST API at `/api/v1/entries`. Plan the Hono router to accommodate this from the start:

```typescript
// apps/api/src/index.ts structure
const app = new Hono();

app.use('*', cors({ origin: [...], credentials: true }));

// Auth routes (Better Auth handles everything under /api/auth/*)
app.all('/api/auth/*', async (c) => { /* Better Auth handler */ });

// Dashboard tRPC (session-authenticated)
app.use('/trpc/*', trpcServer({ router: appRouter, createContext }));

// Public REST API (API-key authenticated) — added in Phase 2
// app.post('/api/v1/entries', apiKeyMiddleware, entriesHandler);

app.get('/health', (c) => c.json({ status: 'ok' }));
```

### Anti-Patterns to Avoid

- **Modifying Better Auth tables directly:** Never add columns to `auth_users`, `sessions`, `accounts`, or `apikeys`. These tables are owned by Better Auth. App-level data goes in separate tables.
- **Inline project ownership checks:** Every tRPC procedure that touches project data must verify `project.userId === ctx.user.id`. Extract this into a `requireProjectOwnership(db, projectId, userId)` helper — do not repeat the check inline.
- **Returning full API key after creation:** The `key` field from Better Auth's `createApiKey` must be returned to the client exactly once and never logged or stored. Only `id` and `start` are safe to persist/return subsequently.
- **Storing field config as freeform JSON:** Use discrete boolean columns (not `jsonb`). Phase 2's validation logic does a simple column check — freeform JSON requires parsing and is harder to query.
- **Skipping `onConflictDoNothing` on user sync:** The `onUserCreated` hook fires on every OAuth sign-in if the user already exists. Without `onConflictDoNothing()`, repeated logins throw unique constraint errors.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API key hashing + verification | Custom SHA-256 hash + timing-safe compare | Better Auth `apiKey` plugin | Handles hash, `start` field, `enabled` flag, `expiresAt`, request counting |
| Session management | Custom JWT + cookie handling | Better Auth sessions | Cookie signing, CSRF protection, session rotation all built in |
| OAuth flow | Custom OAuth2 callbacks | Better Auth social providers | GitHub + Google OAuth with redirect handling, state params, PKCE |
| Password hashing | Custom bcrypt/argon2 calls | Better Auth `emailAndPassword` | Uses argon2 by default with correct work factors |
| DB migrations | Manual SQL files | `drizzle-kit generate` + `drizzle-kit migrate` | Schema diffing, migration history, rollback support |

**Key insight:** Better Auth's `apiKey` plugin eliminates ~300 lines of custom key infrastructure. The only custom code needed is the metadata-based project scoping pattern.

---

## Common Pitfalls

### Pitfall 1: Project-Scoped Key Metadata Not Verified at Call Time

**What goes wrong:** Keys are stored with `metadata: { projectId }` but the middleware that validates incoming API requests (Phase 2) doesn't read `metadata.projectId` — it only checks that the key exists and is enabled. Any valid key from any project can submit entries to any project.

**Why it happens:** Better Auth's `verifyApiKey` returns a success result without surfacing metadata to the caller; developers assume the key "works" and skip the extra check.

**How to avoid:** Create a `verifyProjectKey(apiKey: string, projectId: string)` utility that calls Better Auth's verify AND checks `result.key.metadata.projectId === projectId`. Phase 2 must use this utility, not raw Better Auth verify.

**Warning signs:** Integration tests pass when using any valid key for any project endpoint.

### Pitfall 2: Mode Immutability Not Enforced in Schema

**What goes wrong:** The `mode` column is writable in the DB. A developer adds a generic `project.update` tRPC mutation that accepts all fields including `mode`, allowing mode changes.

**Why it happens:** Drizzle schemas don't have "immutable column" semantics — enforcement is application-layer only.

**How to avoid:** The `project.update` tRPC mutation must explicitly omit `mode` from its input schema (`z.object({ name: z.string() })` — no `mode` field). Add a comment at the schema level noting immutability.

### Pitfall 3: Field Config Row Not Created on Project Creation

**What goes wrong:** `project_field_configs` table exists but project creation only inserts into `projects`. Subsequent field-config queries return null. Phase 2 field validation breaks.

**Why it happens:** Two-table insert is easy to miss when writing the create mutation.

**How to avoid:** The `project.create` tRPC mutation must insert both the `projects` row and a `project_field_configs` row in a single Drizzle transaction. Use `db.transaction()`. Seed defaults based on `mode`.

**Warning signs:** `projectFieldConfigs.findFirst({ where: eq(projectId, ...) })` returns `undefined` for newly created projects.

### Pitfall 4: Better Auth `emailAndPassword` Disabled by Default

**What goes wrong:** Copying GoldenBerry's `config.ts` directly results in email/password auth being disabled (GoldenBerry sets `emailAndPassword: { enabled: false }`). Sign-up attempts silently fail.

**Why it happens:** GoldenBerry uses magic link auth exclusively. Pleasehold needs email/password.

**How to avoid:** Explicitly set `emailAndPassword: { enabled: true }` in `createAuth()`. Verify in tests that sign-up with email + password succeeds.

### Pitfall 5: `trustedOrigins` Missing Causes CORS Failures on Auth Endpoints

**What goes wrong:** Better Auth rejects requests from the web app origin with 403. Session cookies not set.

**Why it happens:** Better Auth has its own CORS check on `trustedOrigins` separate from Hono's CORS middleware.

**How to avoid:** Set `trustedOrigins: [process.env.WEB_URL ?? 'http://localhost:5173']` in `createAuth()`. This must match the exact origin the web app runs on (including port).

### Pitfall 6: `onUserCreated` Hook Throws on Duplicate OAuth Sign-In

**What goes wrong:** User signs in with GitHub, a `users` row is created. On second sign-in, `onUserCreated` fires again (Better Auth calls it on account linking too in some versions), hitting a unique constraint on `users.email`.

**How to avoid:** Always use `.onConflictDoNothing()` in the insert inside `onUserCreated`. Pattern is established in GoldenBerry.

---

## Code Examples

### Better Auth apiKey Plugin — Create and Revoke

```typescript
// Source: Better Auth official docs + GoldenBerry packages/auth/src/config.ts
// Server: creating a key via the API plugin's REST endpoint (used internally)
const result = await auth.api.createApiKey({
  body: {
    name: 'My Production Key',
    prefix: 'ph_live_',
    metadata: JSON.stringify({ projectId: 'uuid-here' }),
  },
  headers: requestHeaders,
});
// result.key — full plaintext key (ONLY TIME IT'S AVAILABLE)
// result.id  — use for revocation
// result.start — first 8 chars, safe to store/display

// Revoke
await auth.api.revokeApiKey({
  body: { keyId: result.id },
  headers: requestHeaders,
});
```

### Drizzle Transaction for Project Creation

```typescript
// Source: Drizzle ORM docs — db.transaction() pattern
// packages/trpc/src/routers/project.ts
create: protectedProcedure
  .input(z.object({
    name: z.string().min(1).max(100),
    mode: z.enum(['waitlist', 'demo-booking']),
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values({
        userId: ctx.user.id,
        name: input.name,
        mode: input.mode,
      }).returning();

      // Seed field config defaults based on mode
      const demoMode = input.mode === 'demo-booking';
      await tx.insert(projectFieldConfigs).values({
        projectId: project.id,
        collectName: demoMode,
        collectCompany: demoMode,
        collectMessage: demoMode,
      });

      return project;
    });
  }),
```

### tRPC protectedProcedure with Project Ownership Guard

```typescript
// Source: GoldenBerry packages/trpc/src/routers/project.ts (pattern)
// packages/trpc/src/routers/project.ts
getById: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)),
      with: { fieldConfig: true },
    });
    if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
    return project;
  }),
```

### Hono Auth Handler Mount

```typescript
// Source: GoldenBerry apps/api/src/index.ts
app.all('/api/auth/*', async (c) => {
  const response = await auth.handler(c.req.raw);
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth / Auth.js | Better Auth | 2024 | Better Auth is framework-agnostic, has apiKey plugin, works with Hono — not tied to Next.js |
| Prisma ORM | Drizzle ORM | 2023–2024 | Drizzle is lighter, SQL-first, no Rust binary dependency, faster cold starts |
| Express + body-parser | Hono | 2023 | Hono is edge-compatible, ~14x faster cold start, cleaner middleware |
| Custom API key generation | Better Auth apiKey plugin | 2024 | Plugin handles hash, verification, rate limit, expiry built-in |
| tRPC v10 | tRPC v11 | 2024–2025 | v11 changes `useQuery` return shape; ensure `@trpc/react-query` matches `@trpc/server` version |

**Deprecated/outdated:**
- `passport.js`: Pre-dates modern TypeScript patterns; no API key support; avoid
- `jsonwebtoken` for sessions: Manual expiry handling; use Better Auth sessions instead
- Prisma's `schema.prisma` syntax: Replaced by Drizzle's TypeScript-native schema files in this stack

---

## Open Questions

1. **Better Auth apiKey plugin `prefix` behavior**
   - What we know: GoldenBerry uses `apiKey()` with no prefix set; the `prefix` option is documented
   - What's unclear: Whether `prefix` is set at plugin config level or per-key at creation time; need to verify if `ph_live_` can be set globally vs. per-call
   - Recommendation: Check Better Auth `apiKey` plugin docs during Wave 0 implementation. If global config isn't available, pass `prefix: 'ph_live_'` in each `createApiKey` body call.

2. **Better Auth issue #4746 — native project scoping**
   - What we know: The issue is open; metadata workaround is functional; STATE.md flags migration path as uncertain
   - What's unclear: Whether #4746 merged between research cutoff and now
   - Recommendation: Isolate all key scoping logic in a single `verifyProjectKey()` utility. If native scoping ships, swap the utility internals without touching callers.

3. **`requestHeaders` access in tRPC context for apiKey operations**
   - What we know: Better Auth's `createApiKey` and `revokeApiKey` require `headers` for session context
   - What's unclear: Whether the Hono `c.req.raw.headers` can be passed through tRPC context cleanly, or if apiKey operations need to go through a separate Hono route
   - Recommendation: Pass `auth` instance into tRPC context (as shown in Pattern 3 above), and add `requestHeaders: Headers` to the Context type. Populate it in `createContext` from `c.req.raw.headers`.

---

## Sources

### Primary (HIGH confidence)
- GoldenBerry reference codebase — `packages/auth/src/config.ts`, `client.ts`, `middleware.ts`, `types.ts`, `helpers.ts`
- GoldenBerry reference codebase — `packages/db/src/schema/auth.ts`, `api-keys.ts`, `projects.ts`, `users.ts`, `relations.ts`
- GoldenBerry reference codebase — `packages/trpc/src/trpc.ts`, `context.ts`, `router.ts`, `routers/project.ts`
- GoldenBerry reference codebase — `apps/api/src/index.ts` (Hono + tRPC + Better Auth integration)
- GoldenBerry reference codebase — `turbo.json`, `pnpm-workspace.yaml`, `package.json` (monorepo structure)

### Secondary (MEDIUM confidence)
- Better Auth official docs (betterauth.dev) — apiKey plugin, emailAndPassword, drizzleAdapter, trustedOrigins
- tRPC v11 docs — `initTRPC`, `protectedProcedure` pattern, context factory

### Tertiary (LOW confidence — flag for validation)
- Better Auth GitHub issue #4746 — project-scoped keys native support status (open as of research; verify current state)
- Better Auth `apiKey` plugin `prefix` option — global vs. per-call configuration behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against GoldenBerry reference codebase
- Architecture: HIGH — patterns lifted directly from proven production reference
- Schema design: HIGH — direct adaptation of GoldenBerry schema with pleasehold-specific tables
- Pitfalls: HIGH — identified from direct code reading of reference (not WebSearch)
- API key scoping workaround: MEDIUM — functional pattern documented, native support status uncertain

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (Better Auth is active development; verify issue #4746 status before implementing)
