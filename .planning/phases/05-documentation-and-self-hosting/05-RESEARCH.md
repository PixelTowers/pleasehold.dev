# Phase 5: Documentation and Self-Hosting - Research

**Researched:** 2026-02-26
**Domain:** OpenAPI generation, API documentation UI, Docker containerization for pnpm/Turborepo monorepos
**Confidence:** HIGH

## Summary

Phase 5 packages pleasehold for distribution: auto-generated OpenAPI documentation from the Hono API routes, an interactive docs UI, and a production-ready Docker Compose setup that starts the full stack with a single command. The public API surface is small (3 endpoints), making the documentation scope manageable and the OpenAPI integration straightforward.

For OpenAPI generation, the recommended approach is `@hono/zod-openapi` (official Hono middleware, v0.18.4). While this requires converting the 3 public route files from plain Hono to `OpenAPIHono`, the project only has 3 public endpoints and 1 health check -- this is a small, well-bounded migration. The alternative `hono-openapi` (rhinobase) works as drop-in middleware but is a third-party package with less ecosystem adoption. For interactive documentation, `@scalar/hono-api-reference` provides a polished, theme-aware API reference page that reads from the generated OpenAPI spec endpoint.

For Docker, the pattern is: one shared multi-stage Dockerfile per service using `turbo prune --docker` to extract minimal dependency trees, with pnpm installed via corepack. The production `docker-compose.yml` orchestrates 5 services (postgres, redis, api, worker, web) with proper health checks, dependency ordering, and a shared network. The web app builds as static assets via Vite and is served by nginx in production.

**Primary recommendation:** Use `@hono/zod-openapi` + `@scalar/hono-api-reference` for docs, and `turbo prune --docker` + multi-stage Dockerfiles for containerization. Keep the existing `docker-compose.dev.yml` for development and create a new `docker-compose.yml` for production self-hosting.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOCS-01 | API has an OpenAPI spec auto-generated from route definitions | `@hono/zod-openapi` converts route definitions into OpenAPI 3.0 spec served at `/doc` |
| DOCS-02 | Hosted docs page with curl examples and response samples | `@scalar/hono-api-reference` renders interactive docs from the OpenAPI spec at `/docs` |
| INFR-01 | Product runs via `docker compose up` with PostgreSQL and Redis | Multi-stage Dockerfiles + `docker-compose.yml` with 5 services, health checks, depends_on |
| INFR-02 | Environment variables control all configuration for self-hosting | Comprehensive `.env.example` documenting all env vars used across api, worker, and web |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@hono/zod-openapi` | ^0.18.4 | OpenAPI spec generation from Zod schemas | Official Hono middleware, first-party support, generates OpenAPI 3.0/3.1 |
| `@scalar/hono-api-reference` | ^0.9.23 | Interactive API documentation UI | Official Scalar Hono integration, beautiful themes, zero config |
| `zod` | ^3.25.76 | Schema validation (already in project) | Already used for field validation, reuse for OpenAPI schemas |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nginx` (Docker image) | alpine | Serve Vite static build in production | Web container only |
| `node:22-alpine` | Docker base | Node.js runtime for api/worker containers | All Node.js Dockerfiles |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@hono/zod-openapi` | `hono-openapi` (rhinobase) | hono-openapi is middleware (less migration), but third-party, newer (v1.2.0), less proven. Only 3 public routes to migrate, so the official approach wins. |
| `@scalar/hono-api-reference` | Swagger UI / Redoc | Scalar has first-class Hono integration, is actively maintained, and ships a custom Hono theme. Swagger UI is heavier and less modern. |
| Multi-stage Dockerfile per service | Single monolithic Dockerfile | Per-service images are smaller, cache better, and follow Docker best practices. |
| `turbo prune --docker` | Manual COPY with .dockerignore | turbo prune creates minimal dependency trees automatically; manual approach is error-prone in monorepos. |

**Installation (api package):**
```bash
pnpm add @hono/zod-openapi @scalar/hono-api-reference --filter @pleasehold/api
```

## Architecture Patterns

### Recommended Project Structure Changes

```
.
|-- docker-compose.yml           # NEW: Production self-hosting
|-- docker-compose.dev.yml       # EXISTING: Dev infrastructure only
|-- .dockerignore                # NEW: Exclude node_modules, .git, etc.
|-- .env.example                 # UPDATED: All env vars documented
|-- apps/
|   |-- api/
|   |   |-- Dockerfile           # NEW: Multi-stage build
|   |   |-- src/
|   |   |   |-- routes/v1/
|   |   |   |   |-- entries.ts   # MODIFIED: Convert to OpenAPIHono route
|   |   |   |   |-- verify.ts    # MODIFIED: Convert to OpenAPIHono route
|   |   |   |-- openapi.ts       # NEW: OpenAPI route definitions + schemas
|   |   |   |-- index.ts         # MODIFIED: Mount /doc and /docs endpoints
|   |-- web/
|   |   |-- Dockerfile           # NEW: Multi-stage build (Vite + nginx)
|   |   |-- nginx.conf           # NEW: SPA routing config
|   |-- worker/
|   |   |-- Dockerfile           # NEW: Multi-stage build
```

### Pattern 1: OpenAPI Route Definition with @hono/zod-openapi

**What:** Define API routes using `createRoute()` with Zod schemas that auto-generate OpenAPI documentation.
**When to use:** For all public REST endpoints that external developers consume.

**Example:**
```typescript
// Source: https://hono.dev/examples/zod-openapi
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

const EntryResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    email: z.string().email().openapi({ example: 'user@example.com' }),
    name: z.string().nullable().openapi({ example: 'Jane Doe' }),
    company: z.string().nullable().openapi({ example: 'Acme Inc' }),
    position: z.number().int().openapi({ example: 42 }),
    createdAt: z.string().datetime().openapi({ example: '2026-02-26T12:00:00.000Z' }),
  }),
}).openapi('EntryResponse');

const ErrorSchema = z.object({
  error: z.object({
    code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
    message: z.string().openapi({ example: 'Invalid submission' }),
    details: z.array(z.object({
      field: z.string(),
      message: z.string(),
    })).optional(),
  }),
}).openapi('ErrorResponse');

const createEntryRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Entries'],
  summary: 'Submit a waitlist or demo-booking entry',
  description: 'Submit a new entry for the project associated with the API key.',
  security: [{ apiKey: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            name: z.string().optional(),
            company: z.string().optional(),
            message: z.string().optional(),
            metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: EntryResponseSchema } },
      description: 'Entry created successfully',
    },
    200: {
      content: { 'application/json': { schema: EntryResponseSchema } },
      description: 'Entry already exists (duplicate email for this project)',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Validation error or invalid JSON',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
    429: {
      description: 'Rate limit exceeded',
    },
  },
});
```

### Pattern 2: Mounting OpenAPI Doc + Scalar Reference

**What:** Serve the OpenAPI JSON spec at `/doc` and interactive docs at `/docs`.
**When to use:** Once in the main API entry point.

**Example:**
```typescript
// Source: https://hono.dev/examples/scalar
import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';

const app = new OpenAPIHono();

// ... mount routes ...

// OpenAPI JSON spec
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'pleasehold API',
    version: '1.0.0',
    description: 'API-first waitlist and demo-booking service',
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Local development' },
  ],
  security: [],
});

// Interactive docs UI
app.get('/docs', apiReference({
  spec: { url: '/doc' },
  theme: 'default',
  pageTitle: 'pleasehold API Reference',
}));
```

### Pattern 3: Multi-Stage Dockerfile for pnpm + Turborepo

**What:** Use `turbo prune --docker` to create minimal dependency trees, then multi-stage build.
**When to use:** For each containerized service (api, worker, web).

**Example (API Dockerfile):**
```dockerfile
# Stage 1: Base with pnpm
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Prune monorepo for this service
FROM base AS pruner
RUN pnpm add -g turbo
WORKDIR /app
COPY . .
RUN turbo prune @pleasehold/api --docker

# Stage 3: Install dependencies
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Stage 4: Build
FROM installer AS builder
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=@pleasehold/api...

# Stage 5: Production runner
FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser
USER appuser

COPY --from=builder /app/ .

CMD ["node", "apps/api/dist/index.js"]
EXPOSE 3001
```

### Pattern 4: Web App with Vite Build + nginx

**What:** Build React app with Vite, serve static files with nginx.
**When to use:** For the web dashboard container.

**Example (Web Dockerfile):**
```dockerfile
# Stage 1: Build with Node
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS pruner
RUN pnpm add -g turbo
WORKDIR /app
COPY . .
RUN turbo prune @pleasehold/web --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm turbo build --filter=@pleasehold/web...

# Stage 2: Serve with nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Pattern 5: Production Docker Compose

**What:** Single `docker-compose.yml` that starts the entire stack.
**When to use:** For self-hosting.

**Example:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-pleasehold}
      POSTGRES_USER: ${POSTGRES_USER:-pleasehold}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?required}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - pleasehold
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-pleasehold}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --maxmemory-policy noeviction
    volumes:
      - redis-data:/data
    networks:
      - pleasehold
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-pleasehold}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-pleasehold}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      PORT: 3001
    ports:
      - "${API_PORT:-3001}:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - pleasehold

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-pleasehold}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-pleasehold}
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - pleasehold

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        VITE_API_URL: ${API_URL:-http://localhost:3001}
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-8080}:80"
    depends_on:
      - api
    networks:
      - pleasehold

volumes:
  postgres-data:
  redis-data:

networks:
  pleasehold:
    driver: bridge
```

### Anti-Patterns to Avoid

- **Mounting entire monorepo into Docker container:** Use `turbo prune --docker` to extract only what each service needs. Copying everything makes images huge and breaks cache.
- **Running Vite dev server in production:** Vite dev is for development only. Build static assets and serve with nginx.
- **Hardcoding Redis/Postgres connection strings in Docker Compose:** Use environment variables and interpolation so users only need to edit `.env`.
- **Single Dockerfile for all services:** Each service has different dependencies and build steps. Separate Dockerfiles optimize image size and build caching.
- **Exposing database/redis ports in production compose:** Only expose api and web ports. Internal services communicate via Docker network.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OpenAPI spec from routes | Manual JSON/YAML spec file | `@hono/zod-openapi` | Spec drifts from code immediately; auto-generation keeps them in sync |
| API documentation UI | Custom HTML docs page | `@scalar/hono-api-reference` | Interactive, searchable, theme-aware, auto-updates when spec changes |
| Monorepo Docker pruning | Manual .dockerignore per service | `turbo prune --docker` | Automatically computes minimal dependency tree for each workspace |
| SPA routing in nginx | Custom nginx config from scratch | Standard SPA fallback pattern | `try_files $uri $uri/ /index.html` is the universal SPA pattern |
| DB migration in Docker | Manual SQL scripts | `pnpm db:migrate` in entrypoint | Drizzle migrations are already set up and tested |

**Key insight:** The OpenAPI spec and docs UI are the most valuable parts of this phase for external developers. Hand-writing API docs is a maintenance nightmare -- auto-generation from Zod schemas means the docs are always accurate.

## Common Pitfalls

### Pitfall 1: OpenAPIHono vs Plain Hono Incompatibility
**What goes wrong:** `@hono/zod-openapi` requires `OpenAPIHono` class instead of `Hono`. If you try to use `createRoute()` with a plain Hono instance, the `.openapi()` method does not exist.
**Why it happens:** `OpenAPIHono` extends `Hono` with OpenAPI-specific methods. The two are compatible for middleware but route registration differs.
**How to avoid:** Convert the main app to `new OpenAPIHono()`. Non-OpenAPI routes (health, tRPC, auth) continue to work since OpenAPIHono extends Hono. Only the public API routes need `createRoute()` definitions.
**Warning signs:** TypeScript error "Property 'openapi' does not exist on type 'Hono'".

### Pitfall 2: Docker Build Context Must Be Monorepo Root
**What goes wrong:** Running `docker build -f apps/api/Dockerfile apps/api/` fails because turbo prune needs access to the full monorepo.
**Why it happens:** `turbo prune` and pnpm workspace resolution both need the root `pnpm-workspace.yaml`, `pnpm-lock.yaml`, and `turbo.json`.
**How to avoid:** Always use the monorepo root as Docker build context: `docker build -f apps/api/Dockerfile .` The docker-compose.yml `context: .` handles this.
**Warning signs:** "turbo prune: command not found" or "pnpm-lock.yaml not found" during build.

### Pitfall 3: Redis Port Mismatch Between Dev and Docker
**What goes wrong:** Dev uses port 6380 (mapped from docker-compose.dev.yml), but production Docker containers communicate on the internal network where Redis runs on port 6379.
**Why it happens:** `docker-compose.dev.yml` maps host 6380 -> container 6379. In production compose, services connect directly on the Docker network.
**How to avoid:** In production `docker-compose.yml`, set `REDIS_PORT: 6379` (internal port). The existing code defaults to 6380, so the env var override is essential.
**Warning signs:** "ECONNREFUSED" errors from api/worker when connecting to Redis in Docker.

### Pitfall 4: Vite Environment Variables Are Build-Time Only
**What goes wrong:** Setting `VITE_API_URL` at runtime has no effect because Vite statically replaces `import.meta.env.VITE_*` during build.
**Why it happens:** Vite's env var injection happens at build time via string replacement in the bundle.
**How to avoid:** Pass `VITE_API_URL` as a Docker build arg (`ARG VITE_API_URL`), not a runtime env var. For the web container, the API URL is baked into the static JS bundle.
**Warning signs:** Web dashboard still pointing to localhost:3001 when deployed.

### Pitfall 5: Database Migrations Not Running on First Start
**What goes wrong:** Docker Compose starts all services but the database has no tables. API crashes with "relation does not exist."
**Why it happens:** The containers start the Node.js apps but nobody runs `drizzle-kit migrate`.
**How to avoid:** Add a migration step that runs before the API starts. Either: (a) an init container that runs migrations, or (b) a startup script in the API container that runs `pnpm db:migrate` before starting the server.
**Warning signs:** "relation 'entries' does not exist" errors on first `docker compose up`.

### Pitfall 6: pnpm-lock.yaml Mismatch with turbo prune
**What goes wrong:** `pnpm install --frozen-lockfile` fails inside Docker because the pruned lockfile doesn't match.
**Why it happens:** `turbo prune --docker` generates a pruned lockfile. If workspace package versions or hoisted dependencies are inconsistent, the pruned lockfile can be invalid.
**How to avoid:** Always run `pnpm install` without `--frozen-lockfile` in the first implementation, then verify it works before adding `--frozen-lockfile`. Ensure `pnpm-workspace.yaml` is copied into the pruned output.
**Warning signs:** "ERR_PNPM_FROZEN_LOCKFILE_WITH_OUTDATED_LOCKFILE" during Docker build.

### Pitfall 7: Missing REDIS_URL for .env.example
**What goes wrong:** The current `.env.example` has no Redis or SMTP configuration. Self-hosters cannot figure out what environment variables to set.
**Why it happens:** Development relied on defaults (localhost:6380) which worked because `docker-compose.dev.yml` was already running.
**How to avoid:** Document ALL environment variables in `.env.example` with comments explaining each one, including Redis, SMTP, and Docker-specific overrides.

## Code Examples

### Converting Existing Route to OpenAPIHono

The current entries route (plain Hono):
```typescript
// Current: apps/api/src/routes/v1/entries.ts
const app = new Hono<{ Variables: ApiKeyVariables }>();
app.post('/', async (c) => { /* ... */ });
```

Converted to OpenAPIHono:
```typescript
// New: apps/api/src/routes/v1/entries.ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

const app = new OpenAPIHono<{ Variables: ApiKeyVariables }>();

const submitEntryRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Entries'],
  summary: 'Submit a new entry',
  security: [{ apiKey: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email().openapi({ example: 'user@example.com' }),
            name: z.string().max(200).optional(),
            company: z.string().max(200).optional(),
            message: z.string().max(2000).optional(),
            metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
          }),
        },
      },
    },
  },
  responses: { /* ... schema definitions ... */ },
});

app.openapi(submitEntryRoute, async (c) => {
  // Same handler logic as before
});
```

### nginx.conf for SPA Routing

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Aggressive caching for hashed assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback: serve index.html for all unmatched routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### .dockerignore

```
node_modules
.git
.turbo
.env
.env.*
!.env.example
dist
build
out
.private-journal
.planning
coverage
*.md
!README.md
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Swagger UI for API docs | Scalar API Reference | 2024 | Scalar is lighter, has better Hono integration, modern UI |
| Manual OpenAPI YAML files | `@hono/zod-openapi` auto-generation | 2024 | Spec stays in sync with code automatically |
| Single monolithic Docker image | `turbo prune` per-service images | Turbo v2 (2024) | Smaller images, faster builds, better caching |
| `npm install` in Docker | pnpm + corepack | 2023+ | Faster installs, strict dependency resolution |

**Deprecated/outdated:**
- `swagger-ui-express`: Not designed for Hono. Scalar has native Hono integration.
- `@hono/swagger-ui`: Scalar is the recommended docs UI per Hono's own examples page.

## Open Questions

1. **Web app API URL at build time vs runtime**
   - What we know: Vite injects env vars at build time. The current app uses Vite proxy in dev (`/api` -> `localhost:3001`).
   - What's unclear: In production Docker, should the web container proxy to the API (via nginx), or should the API URL be baked in at build time?
   - Recommendation: Use nginx reverse proxy in the web container to forward `/api/*` and `/trpc/*` to the api service. This avoids build-time env vars and keeps the web container deployment-agnostic. Alternatively, use a runtime config injection pattern.

2. **Database migration strategy in Docker**
   - What we know: Drizzle Kit handles migrations. The API needs tables to exist.
   - What's unclear: Should migrations run as an init container, a startup script, or a separate compose service?
   - Recommendation: Add a `migrate` service in docker-compose.yml that runs `pnpm db:migrate` and exits. API depends on this service completing. Simple and explicit.

3. **tsup build output for API and Worker in Docker**
   - What we know: API and Worker use tsup for builds. The build output goes to `dist/`.
   - What's unclear: Whether `turbo prune --docker` correctly handles tsup builds with workspace dependencies.
   - Recommendation: Test the `turbo prune` + `pnpm turbo build --filter=@pleasehold/api...` pipeline manually before committing Dockerfiles. The `...` suffix ensures workspace dependencies are built first.

## Sources

### Primary (HIGH confidence)
- [Hono Zod OpenAPI Example](https://hono.dev/examples/zod-openapi) - Official Hono docs for @hono/zod-openapi setup
- [Hono Scalar Example](https://hono.dev/examples/scalar) - Official Hono docs for Scalar integration
- [Hono OpenAPI Example](https://hono.dev/examples/hono-openapi) - Official Hono docs for hono-openapi middleware
- [Turborepo Docker Guide](https://turborepo.dev/docs/guides/tools/docker) - Official turbo prune --docker documentation
- [pnpm Docker Guide](https://pnpm.io/docker) - Official pnpm Docker patterns with corepack

### Secondary (MEDIUM confidence)
- [Scalar Hono Integration](https://scalar.com/scalar/scalar-api-references/integrations/hono) - Scalar official docs for Hono
- [@scalar/hono-api-reference npm](https://www.npmjs.com/package/@scalar/hono-api-reference) - v0.9.23, actively maintained
- [@hono/zod-openapi npm](https://www.npmjs.com/package/@hono/zod-openapi) - v0.18.4, official Hono middleware
- [hono-openapi npm](https://www.npmjs.com/package/hono-openapi) - v1.2.0, third-party alternative
- [hono-openapi DeepWiki](https://deepwiki.com/rhinobase/hono-openapi) - Detailed API reference

### Tertiary (LOW confidence)
- [Turborepo + pnpm Docker Medium article](https://fintlabs.medium.com/optimized-multi-stage-docker-builds-with-turborepo-and-pnpm-for-nodejs-microservices-in-a-monorepo-c686fdcf051f) - Community pattern, not official

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Hono and Scalar libraries with documented integration patterns
- Architecture: HIGH - turbo prune and multi-stage Docker are well-documented, battle-tested patterns
- Pitfalls: HIGH - Based on actual codebase analysis (Redis port mismatch, Vite build-time env vars, migration ordering are all verified from source code)

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable libraries, patterns unlikely to change)
