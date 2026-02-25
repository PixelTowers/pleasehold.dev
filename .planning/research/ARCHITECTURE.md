# Architecture Research

**Domain:** API-first waitlist/demo-booking SaaS (dual-API: public REST + internal tRPC)
**Researched:** 2026-02-25
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
                         External Developers                    Dashboard Users
                              |                                       |
                              | POST /api/v1/entries                   | Browser (React 19)
                              | (API Key in header)                   | (Better Auth session)
                              v                                       v
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              apps/api  (Hono Server)                             │
│                                                                                  │
│  ┌─────────────────────────────┐    ┌──────────────────────────────────────────┐ │
│  │     Public REST Routes      │    │          tRPC Router (/trpc/*)          │ │
│  │    /api/v1/entries           │    │                                          │ │
│  │    /api/v1/projects/:id     │    │  project.* | entry.* | apiKey.*          │ │
│  │                              │    │  notification.* | user.* | export.*      │ │
│  │  API Key Auth Middleware     │    │                                          │ │
│  │  Rate Limiting Middleware    │    │  protectedProcedure (session auth)       │ │
│  └──────────────┬──────────────┘    └──────────────────┬─────────────────────┘ │
│                  │                                      │                        │
│                  └──────────┬───────────────────────────┘                        │
│                             │                                                    │
│                    Shared Service Layer                                           │
│              (packages/core — domain logic)                                       │
│                             │                                                    │
│                  ┌──────────┴──────────┐                                         │
│                  │     enqueueJob()    │                                         │
│                  └──────────┬──────────┘                                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│                       /api/auth/*  (Better Auth)                                 │
│                   Session auth for dashboard users                               │
└────────────────────┬─────────────────────────────┬───────────────────────────────┘
                     │                              │
                     v                              v
           ┌─────────────────┐           ┌──────────────────┐
           │   PostgreSQL    │           │      Redis       │
           │   (Drizzle)    │           │    (BullMQ)      │
           └─────────────────┘           └────────┬─────────┘
                                                  │
                                                  v
                                    ┌──────────────────────┐
                                    │   apps/worker        │
                                    │                      │
                                    │  email-send          │
                                    │  slack-notify        │
                                    │  webhook-dispatch    │
                                    └──────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `apps/api` | Single Hono server hosting both public REST + tRPC routes, plus Better Auth | Hono with route groups: `/api/v1/*` (REST), `/trpc/*` (tRPC), `/api/auth/*` (Better Auth) |
| `apps/web` | Dashboard SPA for project owners | React 19 + Vite + TanStack Router, tRPC React hooks for data fetching |
| `apps/landing` | Marketing site + docs | Astro (static site, no API dependency at build time) |
| `apps/worker` | Background job processor for all async notifications | BullMQ workers in a separate Node.js process |
| `packages/db` | Schema definitions, Drizzle client factory, migrations | Drizzle ORM + postgres.js, shared across api and worker |
| `packages/auth` | Better Auth configuration, middleware, client helpers | Better Auth with drizzle adapter, API key plugin |
| `packages/trpc` | tRPC router definitions, context, procedure builders | tRPC v11 with superjson, protectedProcedure pattern |
| `packages/core` | Domain logic shared between REST routes and tRPC procedures | Pure functions and service classes, no framework coupling |
| `packages/shared` | TypeScript types, constants, validators (Zod schemas) | Zod schemas for entry validation, project config types |
| `packages/email` | Email template rendering | React Email templates for notifications |

## Recommended Project Structure

```
pleasehold/
├── apps/
│   ├── api/                      # Hono API server
│   │   ├── src/
│   │   │   ├── index.ts          # Server bootstrap, route mounting
│   │   │   ├── queue.ts          # BullMQ queue connection + queue names
│   │   │   ├── routes/
│   │   │   │   └── v1/           # Public REST API routes
│   │   │   │       ├── entries.ts     # POST/GET entries
│   │   │   │       └── projects.ts    # GET project config (public)
│   │   │   └── middleware/
│   │   │       ├── api-key.ts    # API key verification + project resolution
│   │   │       └── rate-limit.ts # Per-key rate limiting via Redis
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── web/                      # Dashboard SPA
│   │   ├── src/
│   │   │   ├── routes/           # TanStack Router file-based routes
│   │   │   ├── components/       # React components
│   │   │   ├── lib/
│   │   │   │   ├── trpc.ts       # tRPC React client setup
│   │   │   │   └── auth.ts       # Better Auth browser client
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── landing/                  # Marketing site
│   │   ├── src/
│   │   │   └── pages/            # Astro pages
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── worker/                   # Background job processor
│       ├── src/
│       │   ├── index.ts          # Worker bootstrap, graceful shutdown
│       │   └── workers/
│       │       ├── email-send.ts
│       │       ├── slack-notify.ts
│       │       └── webhook-dispatch.ts
│       ├── package.json
│       └── Dockerfile
│
├── packages/
│   ├── db/                       # Database schema + client
│   │   ├── src/
│   │   │   ├── client.ts         # createDb() factory
│   │   │   ├── schema/           # Drizzle table definitions
│   │   │   │   ├── projects.ts
│   │   │   │   ├── entries.ts
│   │   │   │   ├── api-keys.ts
│   │   │   │   ├── notification-channels.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── auth.ts       # Better Auth tables
│   │   │   │   ├── relations.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── drizzle/              # Migration files
│   │
│   ├── auth/                     # Better Auth config + middleware
│   │   └── src/
│   │       ├── config.ts         # createAuth() factory
│   │       ├── middleware.ts     # Hono auth middleware
│   │       ├── client.ts         # Browser auth client
│   │       └── index.ts
│   │
│   ├── trpc/                     # tRPC router + context
│   │   └── src/
│   │       ├── trpc.ts           # initTRPC, procedure builders
│   │       ├── context.ts        # Context type + factory
│   │       ├── router.ts         # Merged app router
│   │       └── routers/
│   │           ├── project.ts
│   │           ├── entry.ts
│   │           ├── api-key.ts
│   │           ├── notification.ts
│   │           ├── export.ts
│   │           └── user.ts
│   │
│   ├── core/                     # Domain logic (framework-agnostic)
│   │   └── src/
│   │       ├── entries.ts        # Entry creation, validation, field config
│   │       ├── projects.ts       # Project CRUD, mode configuration
│   │       ├── notifications.ts  # Notification routing logic
│   │       └── api-keys.ts       # Key generation, project-scoped verification
│   │
│   ├── shared/                   # Types, constants, validators
│   │   └── src/
│   │       ├── types/
│   │       │   ├── project.ts    # Project mode, field config types
│   │       │   └── entry.ts      # Entry submission types
│   │       ├── validators/
│   │       │   ├── entry.ts      # Zod schemas for entry validation
│   │       │   └── project.ts    # Zod schemas for project config
│   │       └── constants.ts      # Queue names, defaults
│   │
│   ├── email/                    # Email templates
│   │   └── src/
│   │       ├── templates/
│   │       │   ├── new-entry.tsx  # React Email: new waitlist/demo entry
│   │       │   └── welcome.tsx    # React Email: welcome to pleasehold
│   │       └── client.ts         # Resend client factory
│   │
│   └── logger/                   # Shared logger
│       └── src/
│           └── index.ts          # pino logger instance
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── Dockerfile.worker
│   └── Dockerfile.landing
│
├── docker-compose.yml            # Production self-host compose
├── docker-compose.dev.yml        # Dev: postgres + redis only
├── turbo.json
├── pnpm-workspace.yaml
├── biome.json
├── vitest.workspace.ts
└── package.json
```

### Structure Rationale

- **`apps/api` hosts both REST and tRPC:** One Hono server, two route groups. This avoids running two separate API servers, simplifies deployment, and lets both APIs share the same database connection pool and auth system. GoldenBerry uses this exact pattern (see reference codebase).
- **`apps/worker` is a separate process:** Workers MUST run in a separate process from the API. BullMQ workers doing I/O (HTTP calls to Slack, webhooks, email services) should not compete with the API event loop. The worker shares `packages/db` and `packages/email` but has its own process and Redis connection.
- **`packages/core` for domain logic:** The critical architectural decision. Both REST routes and tRPC procedures call the same domain functions. This prevents logic duplication and makes the dual-API pattern sustainable. REST routes are thin adapters over core functions; tRPC procedures are thin adapters over core functions.
- **`packages/shared` for types/validators:** Zod schemas defined once, used by REST route validation, tRPC input schemas, and dashboard form validation. Single source of truth for "what does a valid entry look like?"
- **`packages/db` owns all schema:** Following GoldenBerry's pattern -- the db package is the single authority for table definitions, relations, and migrations. Both api and worker import from it.

## Architectural Patterns

### Pattern 1: Dual-API Thin Adapter

**What:** Both the public REST API and internal tRPC API are thin adapters that delegate to shared domain logic in `packages/core`. Neither API contains business logic directly.
**When to use:** Always. This is the foundational pattern for the entire architecture.
**Trade-offs:** Slightly more indirection (REST handler -> core function -> db), but prevents the most dangerous anti-pattern in dual-API systems: logic divergence.

**Example:**
```typescript
// packages/core/src/entries.ts
export async function createEntry(
  db: Database,
  projectId: string,
  data: EntryInput,
): Promise<Entry> {
  // validate fields against project config
  // insert entry
  // return created entry
}

// apps/api/src/routes/v1/entries.ts (REST)
app.post('/api/v1/entries', apiKeyAuth(), async (c) => {
  const project = c.get('project'); // set by apiKeyAuth middleware
  const body = await c.req.json();
  const parsed = entryInputSchema.parse(body);
  const entry = await createEntry(db, project.id, parsed);
  return c.json({ data: entry }, 201);
});

// packages/trpc/src/routers/entry.ts (tRPC)
export const entryRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return listEntries(ctx.db, input.projectId, ctx.user.id);
    }),
});
```

### Pattern 2: Project-Scoped API Key Auth via Metadata

**What:** Better Auth's API key plugin is user-scoped (keys belong to a user, not a project). To scope keys to projects, store `projectId` in the key's metadata field. The API key middleware verifies the key, then resolves the project from metadata.
**When to use:** For all public REST API endpoints. The middleware extracts the API key, verifies it via Better Auth, reads the `projectId` from metadata, loads the project config, and attaches it to the Hono context.
**Trade-offs:** This is a workaround for Better Auth not yet supporting native project-scoped keys (see [Issue #4746](https://github.com/better-auth/better-auth/issues/4746)). If/when native support lands, the migration is isolated to this middleware and the key creation tRPC procedure.

**Example:**
```typescript
// apps/api/src/middleware/api-key.ts
import { createMiddleware } from 'hono/factory';

export const apiKeyAuth = () =>
  createMiddleware(async (c, next) => {
    const apiKey = c.req.header('X-API-Key') ?? c.req.header('Authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return c.json({ error: 'API key required' }, 401);
    }

    const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
    if (!result.valid || !result.key) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    const projectId = result.key.metadata?.projectId;
    if (!projectId) {
      return c.json({ error: 'API key not bound to a project' }, 403);
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    c.set('project', project);
    c.set('apiKeyOwner', result.key.userId);
    await next();
  });
```

### Pattern 3: Notification Fan-Out via BullMQ

**What:** When a new entry is created, a single job is enqueued to a `notification-dispatch` queue. The dispatch worker reads the project's notification channels from the database and enqueues individual delivery jobs (`email-send`, `slack-notify`, `webhook-dispatch`) for each configured channel.
**When to use:** Every time a new entry is submitted via the public API.
**Trade-offs:** Two-hop queue pattern (dispatch -> delivery) adds a small amount of latency but provides retry isolation. If a Slack notification fails, it does not block or retry the email notification.

**Example:**
```typescript
// packages/core/src/notifications.ts
export async function enqueueEntryNotification(
  enqueueJob: EnqueueJob,
  projectId: string,
  entryId: string,
): Promise<void> {
  await enqueueJob('notification-dispatch', 'new-entry', {
    projectId,
    entryId,
  });
}

// apps/worker/src/workers/notification-dispatch.ts
// Reads project notification channels, fans out to delivery queues:
//   - email-send (if email channel configured)
//   - slack-notify (if Slack webhook URL configured)
//   - webhook-dispatch (if custom webhook URL configured)
```

### Pattern 4: Dynamic Field Validation from Project Config

**What:** Each project has a `fieldConfig` column (JSONB) that defines which fields to collect and which are required. Entry validation is dynamic -- the Zod schema is constructed at request time based on the project's config.
**When to use:** For the public entry submission endpoint.
**Trade-offs:** More complex than static validation, but this is the core value proposition of the product (configurable forms without code changes).

**Example:**
```typescript
// packages/core/src/entries.ts
export function buildEntrySchema(fieldConfig: FieldConfig): z.ZodSchema {
  const shape: Record<string, z.ZodTypeAny> = {
    email: z.string().email(), // always required
  };

  if (fieldConfig.name?.enabled) {
    shape.name = fieldConfig.name.required
      ? z.string().min(1)
      : z.string().optional();
  }
  if (fieldConfig.company?.enabled) {
    shape.company = fieldConfig.company.required
      ? z.string().min(1)
      : z.string().optional();
  }
  // custom fields...
  for (const field of fieldConfig.customFields ?? []) {
    shape[field.key] = field.required
      ? z.string().min(1)
      : z.string().optional();
  }

  return z.object(shape);
}
```

## Data Flow

### Flow 1: External Entry Submission (Public REST API)

```
Developer's Frontend
    │
    │  POST /api/v1/entries
    │  Headers: X-API-Key: ph_live_abc123
    │  Body: { email: "user@example.com", name: "Jane" }
    │
    v
┌─ Hono API Server ─────────────────────────────────────────────────┐
│                                                                    │
│  1. Rate Limit Middleware                                          │
│     └─ Check Redis: rate_limit:{api_key_prefix}                   │
│     └─ 429 if exceeded                                            │
│                                                                    │
│  2. API Key Auth Middleware                                        │
│     └─ Verify key via Better Auth                                  │
│     └─ Extract projectId from key metadata                         │
│     └─ Load project config from DB                                 │
│     └─ Attach project to context                                   │
│                                                                    │
│  3. Entry Route Handler                                            │
│     └─ Build dynamic Zod schema from project.fieldConfig           │
│     └─ Validate request body                                       │
│     └─ Call core.createEntry(db, projectId, validatedData)         │
│     └─ Call core.enqueueEntryNotification(enqueue, projectId, id)  │
│     └─ Return 201 { data: entry }                                  │
└────────────────────────────────────────────────────────────────────┘
    │
    │ (async, via Redis/BullMQ)
    v
┌─ Worker Process ───────────────────────────────────────────────────┐
│                                                                    │
│  4. notification-dispatch worker                                   │
│     └─ Load project notification channels from DB                  │
│     └─ For each channel, enqueue delivery job:                     │
│         ├─ email-send (Resend API)                                 │
│         ├─ slack-notify (Slack webhook URL)                         │
│         └─ webhook-dispatch (custom URL, POST with payload)        │
│                                                                    │
│  5. Delivery workers (each retries independently)                  │
│     └─ email-send: render React Email template, send via Resend    │
│     └─ slack-notify: POST to Slack webhook URL                     │
│     └─ webhook-dispatch: POST entry data to custom endpoint        │
└────────────────────────────────────────────────────────────────────┘
```

### Flow 2: Dashboard Entry Viewing (Internal tRPC API)

```
Dashboard (React 19 SPA)
    │
    │  trpc.entry.list.useQuery({ projectId })
    │  (httpBatchLink → /trpc/*)
    │  (Cookies: Better Auth session)
    │
    v
┌─ Hono API Server ─────────────────────────────────────────────────┐
│                                                                    │
│  1. tRPC middleware (via @hono/trpc-server)                        │
│     └─ createContext: resolve session from cookies via Better Auth  │
│     └─ Inject db, session, user, enqueueJob into context           │
│                                                                    │
│  2. protectedProcedure (auth middleware)                            │
│     └─ Verify session exists, throw UNAUTHORIZED if not            │
│                                                                    │
│  3. entry.list resolver                                            │
│     └─ Verify user owns the project                                │
│     └─ Query entries with pagination + filters                     │
│     └─ Return typed result (end-to-end type safety to React)       │
└────────────────────────────────────────────────────────────────────┘
```

### Flow 3: Notification Channel Configuration (Internal tRPC API)

```
Dashboard
    │  trpc.notification.configureChannel.useMutation()
    │  Body: { projectId, channel: "slack", webhookUrl: "https://hooks.slack.com/..." }
    v
protectedProcedure
    │  Verify user owns project
    │  Upsert notification_channels row
    │  Return updated config
    v
(No worker involvement -- this is pure CRUD)
```

### Key Data Flows Summary

1. **Entry submission:** REST API -> core logic -> DB insert + BullMQ enqueue -> Worker fan-out -> delivery
2. **Dashboard reads:** React -> tRPC -> Drizzle query -> typed response -> React
3. **Dashboard writes:** React -> tRPC mutation -> core logic -> DB upsert -> typed response
4. **API key creation:** Dashboard -> tRPC -> Better Auth createApiKey (with projectId in metadata) -> key returned
5. **CSV export:** Dashboard -> tRPC -> stream entries from DB -> format as CSV -> return blob

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k projects | Monolith is fine. Single API process, single worker process, single Postgres, single Redis. This is where pleasehold starts. |
| 1k-100k projects | Scale workers horizontally (multiple worker containers). Add connection pooling (PgBouncer). Add read replicas for dashboard queries. Rate limiting becomes critical for public API. |
| 100k+ projects | Separate REST API and tRPC into distinct services behind a gateway. Partition BullMQ queues by project tier. Consider dedicated Redis instances for rate limiting vs job queues. |

### Scaling Priorities

1. **First bottleneck: Worker throughput.** If a popular project gets 10k signups in an hour, the notification fan-out creates 10k * N delivery jobs (where N = number of notification channels). Scale workers horizontally first -- BullMQ supports multiple consumers on the same queue naturally.
2. **Second bottleneck: Database connections.** Each API request and each worker job opens a DB connection. Use connection pooling early. The worker process should create one db instance, not one per job.
3. **Third bottleneck: Rate limiting accuracy.** Redis-based rate limiting is eventually consistent. At high throughput, sliding window counters are more accurate than fixed windows. Use `hono-rate-limiter` with `@hono-rate-limiter/redis` from the start.

## Anti-Patterns

### Anti-Pattern 1: Logic in Route Handlers

**What people do:** Put business logic directly in REST route handlers or tRPC resolvers instead of in `packages/core`.
**Why it's wrong:** With two APIs (REST + tRPC) hitting the same domain, logic in handlers means logic duplication. When you fix a validation bug in the REST handler, you forget to fix it in the tRPC resolver. They drift apart silently.
**Do this instead:** Route handlers and tRPC procedures are thin adapters. They parse input, call a core function, and format the response. All domain logic lives in `packages/core`.

### Anti-Pattern 2: Worker Creates Its Own Queue Connections Per Job

**What people do:** Create a new Redis connection or database connection inside each job processor callback.
**Why it's wrong:** Connection exhaustion. If 100 jobs run concurrently, that is 100 Redis connections and 100 Postgres connections, quickly hitting limits.
**Do this instead:** Create connections once at worker startup (in `apps/worker/src/index.ts`) and pass them to worker factory functions. The GoldenBerry reference codebase does this correctly -- one `IORedis` instance shared across all workers.

### Anti-Pattern 3: Using Better Auth API Keys Without Project Scoping

**What people do:** Create API keys that are user-scoped only, then try to figure out which project a request is for via a URL parameter or request body.
**Why it's wrong:** It couples project selection to the request shape (what if multiple endpoints need project context?), and it means the API key does not inherently scope access. A user with access to Project A could submit entries to Project B by changing the body.
**Do this instead:** Store `projectId` in the API key's metadata. The middleware resolves the project from the key itself. One key = one project. This is the natural scoping boundary.

### Anti-Pattern 4: Separate API Servers for REST and tRPC

**What people do:** Run two separate Node.js servers -- one for REST, one for tRPC.
**Why it's wrong:** Double the deployment surface, double the health checks, double the connection pools. For a product of this scope, a single Hono server with route groups is the correct granularity. The GoldenBerry codebase proves this works well: REST routes at path prefixes, tRPC at `/trpc/*`, auth at `/api/auth/*`, all in one `Hono()` instance.
**Do this instead:** One Hono server with `app.route('/api/v1', restRoutes)` and `app.use('/trpc/*', trpcServer(...))`.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Resend (email) | REST API from worker via `@goldenberry/email` pattern | Worker creates client, renders React Email template, sends. Dev env: log only. |
| Slack (notifications) | Direct webhook POST from worker | Simple `fetch()` to Slack webhook URL stored in notification_channels table. No SDK needed. |
| Custom webhooks | POST from worker to user-configured URL | Include HMAC signature header for payload verification. Retry with exponential backoff (BullMQ built-in). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `apps/web` -> `apps/api` (tRPC) | HTTP via tRPC httpBatchLink | Vite dev proxy to API; production via reverse proxy (nginx/traefik) |
| `apps/web` -> `apps/api` (auth) | HTTP via Better Auth client | Same-origin cookies; browser client uses relative base URL |
| `apps/api` -> `apps/worker` | Redis via BullMQ queue | API enqueues jobs; worker processes them. No direct communication. |
| `apps/api` -> `packages/core` | Direct import | Same process; core functions are pure domain logic |
| `apps/worker` -> `packages/core` | Direct import | Worker also imports core for shared logic (field config parsing, etc.) |
| `packages/trpc` -> `packages/db` | Direct import | tRPC procedures query via Drizzle ORM |
| `packages/trpc` -> `packages/core` | Direct import | tRPC procedures delegate to core logic |

## Docker Compose Architecture (Self-Hosting)

```yaml
# docker-compose.yml (production self-host)
services:
  api:
    build: { dockerfile: docker/Dockerfile.api }
    ports: ["3035:3035"]
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379
      # ... auth, email config

  worker:
    build: { dockerfile: docker/Dockerfile.worker }
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379
      # ... email, slack config

  web:
    build: { dockerfile: docker/Dockerfile.web }
    ports: ["3000:3000"]
    # Static SPA served by nginx; proxies /trpc and /api to api service

  postgres:
    image: postgres:17
    volumes: [postgres-data:/var/lib/postgresql/data]

  redis:
    image: redis:7
    volumes: [redis-data:/data]
```

**Key decisions for self-hosting:**
- **4 application containers:** api, worker, web, and optionally landing (or bake landing into web's nginx)
- **Worker scales independently:** `docker compose up --scale worker=3` for higher notification throughput
- **Web is static:** The React SPA is built at image build time and served by nginx. The nginx config proxies `/trpc/*` and `/api/*` to the api container.
- **No MinIO/S3 needed:** Unlike GoldenBerry, pleasehold has no file storage requirement. Simpler infrastructure.

## Build Order (Dependency Chain)

The following build order reflects true dependencies. Each item requires the items above it to exist first:

```
Phase 1: Foundation
    packages/shared    (types, validators — no dependencies)
    packages/logger    (pino — no dependencies)
    packages/db        (schema, client — depends on shared for types)

Phase 2: Auth + Core
    packages/auth      (Better Auth config — depends on db)
    packages/core      (domain logic — depends on db, shared)

Phase 3: API Layer
    packages/trpc      (router, context — depends on db, auth, core)
    apps/api           (Hono server — depends on trpc, auth, core, db)

Phase 4: Dashboard
    apps/web           (React SPA — depends on trpc types, auth client)

Phase 5: Background Jobs
    packages/email     (templates — depends on shared)
    apps/worker        (BullMQ workers — depends on db, email, core)

Phase 6: Distribution
    docker/            (Dockerfiles — depends on all apps being buildable)
    apps/landing       (marketing site — independent, can be built anytime)
```

**Build order rationale:**
- `packages/shared` and `packages/db` are the foundation everything depends on. Build schema first.
- Auth comes before API because both REST and tRPC need auth middleware.
- `packages/core` comes before both API and tRPC because both delegate to it.
- The API server can be tested end-to-end before the dashboard exists (use curl/httpie).
- Workers can be developed and tested independently once the queue infrastructure exists.
- Docker and landing page are the final phase -- they require working apps but do not block feature development.

## Sources

- GoldenBerry reference codebase (`/Users/christopher.jimenez/Src/PixelTowers/GoldenBerry`) -- direct analysis of Hono + tRPC + Drizzle + BullMQ patterns (HIGH confidence)
- [Better Auth API Key Plugin Docs](https://www.better-auth.com/docs/plugins/api-key) -- API key verification, metadata, permissions (HIGH confidence)
- [Better Auth Issue #4746: Tenant/Org-Scoped API Keys](https://github.com/better-auth/better-auth/issues/4746) -- project-scoped key workaround via metadata (MEDIUM confidence)
- [BullMQ Architecture Docs](https://docs.bullmq.io/guide/architecture) -- worker patterns, separate process recommendation (HIGH confidence)
- [BullMQ Workers Docs](https://docs.bullmq.io/guide/workers) -- sandboxed processors, event-driven patterns (HIGH confidence)
- [Hono Bearer Auth Middleware](https://hono.dev/docs/middleware/builtin/bearer-auth) -- API key extraction patterns (HIGH confidence)
- [hono-rate-limiter with Redis](https://github.com/rhinobase/hono-rate-limiter) -- rate limiting per API key (MEDIUM confidence)
- [Notification System Design with BullMQ](https://10xengineering.substack.com/p/designing-a-scalable-notification) -- fan-out pattern for multi-channel notifications (MEDIUM confidence)
- [Docker Compose Patterns for SaaS](https://dev.to/shrsv/mastering-docker-compose-advanced-patterns-for-on-prem-saas-deployments-boh) -- multi-container self-hosting patterns (MEDIUM confidence)
- [Drizzle + Turborepo Shared Schema](https://pliszko.com/blog/post/2023-08-31-shared-database-schema-with-drizzleorm-and-turborepo) -- monorepo DB package pattern (MEDIUM confidence)

---
*Architecture research for: pleasehold.dev (API-first waitlist/demo-booking SaaS)*
*Researched: 2026-02-25*
