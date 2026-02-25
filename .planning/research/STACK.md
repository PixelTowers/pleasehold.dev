# Stack Research

**Domain:** Waitlist/demo-booking API-first SaaS
**Researched:** 2026-02-25
**Confidence:** HIGH

## Decided Stack (Locked)

The core stack is decided per PROJECT.md and mirrors GoldenBerry. These versions are verified against the GoldenBerry reference codebase and npm registry as of today.

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | ~5.7.3 | Language | GoldenBerry standard; mature, stable |
| Hono | ^4.12.2 | HTTP framework | Lightweight, fast, middleware-based. Runs everywhere. GoldenBerry proven |
| @hono/node-server | ^1.19.9 | Node.js adapter | Required for running Hono on Node.js in Docker |
| @hono/trpc-server | ^0.4.2 | tRPC integration | Bridges tRPC router into Hono for dashboard API |
| @trpc/server | ^11.10.0 | Type-safe RPC | Dashboard-to-API communication with full type inference |
| @trpc/client | ^11.10.0 | tRPC client | Dashboard consumes tRPC API |
| @trpc/react-query | ^11.10.0 | React bindings | TanStack Query integration for tRPC in dashboard |
| Drizzle ORM | ^0.45.1 | Database ORM | Type-safe, SQL-like, lightweight. GoldenBerry proven |
| drizzle-kit | ^0.31.9 | Migration tooling | Schema generation and migration management |
| postgres | ^3.4.8 | PostgreSQL driver | postgres.js — fastest pure JS Postgres driver. Used by GoldenBerry |
| BullMQ | ^5.70.1 | Job queue | Redis-backed, reliable, retries with backoff. Proven in GoldenBerry worker |
| ioredis | ^5.9.3 | Redis client | Required by BullMQ. Also used for rate limiting |
| Better Auth | ^1.4.19 | Authentication | Session auth for dashboard users. GoldenBerry proven with API key plugin |
| React | ^19.0.0 | Dashboard UI | GoldenBerry standard |
| Vite | ^6.3.0 | Dashboard bundler | Fast dev, good production builds |
| Astro | ^5.18.0 | Landing page | Static-first, fast marketing pages. GoldenBerry marketing pattern |
| Zod | ^3.23.8 | Validation | Schema validation for API inputs, tRPC procedures, config |
| superjson | ^2.2.2 | Serialization | Date/BigInt serialization for tRPC transport |
| pnpm | ^10.30.1 | Package manager | Workspace support, fast, disk-efficient |
| Turborepo | ^2.4.4 | Monorepo build | Task orchestration, caching, parallel builds |

### Dashboard Libraries (from GoldenBerry pattern)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @tanstack/react-query | ^5.90.0 | Data fetching | Server state management, caching, refetching |
| @tanstack/react-router | ^1.163.2 | Routing | Type-safe file-based routing. GoldenBerry pattern |
| @tanstack/react-table | ^8.21.3 | Data tables | Waitlist entries table, headless UI |
| @tanstack/react-form | ^1.28.3 | Forms | Type-safe forms for project config |
| Tailwind CSS | ^4.0.0 | Styling | Utility-first, fast. GoldenBerry standard |
| zustand | ^5.0.11 | Client state | Minimal global state (UI preferences, filters) |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| @biomejs/biome | 2.4.4 | Lint + format | Replaces ESLint + Prettier. One tool, zero config |
| Vitest | ^4.0.18 | Testing | Fast, Vite-native. GoldenBerry standard |
| tsup | ^8.5.1 | Package bundling | Builds workspace packages. GoldenBerry pattern |
| tsx | ^4.21.0 | Dev runtime | TypeScript execution for dev mode (watch mode) |
| husky | ^9.1.7 | Git hooks | Pre-commit quality enforcement |

## Domain-Specific Libraries (Research Focus)

These are the libraries specific to the waitlist/demo-booking SaaS domain. This is where the new research lives.

### API Key Management

**Use Better Auth's built-in `apiKey` plugin.** Do NOT build custom API key infrastructure.

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| better-auth (apiKey plugin) | ^1.4.19 | API key creation, hashing, verification, rate limiting | HIGH |

**Why:** Better Auth's API key plugin already handles:
- Key generation with configurable length (default 64 chars) and prefix (e.g., `ph_`)
- Secure hashing (keys stored hashed, not plaintext)
- Verification via `auth.api.verifyApiKey()` server-side
- Built-in per-key rate limiting (sliding window) with `timeWindow` and `maxRequests`
- Key rotation via expiration (`keyExpiration` config)
- Permission scoping (resource-based structure)
- Default header: `x-api-key` (customizable via `apiKeyHeaders`)
- Automatic expired key cleanup

GoldenBerry already uses this plugin (see `packages/auth/src/config.ts`). The pattern is proven and the code is directly reusable.

**Configuration for pleasehold:**
```typescript
apiKey({
  defaultPrefix: 'ph_',
  defaultKeyLength: 32, // 32 is plenty for API keys with a prefix
  enableMetadata: true,  // store project association
  rateLimiting: {
    enabled: true,
    timeWindow: 60 * 1000, // 1 minute
    maxRequests: 60,        // 60 req/min default, configurable per key
  },
})
```

**Source:** [Better Auth API Key Plugin docs](https://www.better-auth.com/docs/plugins/api-key) (HIGH confidence, official docs verified)

### Rate Limiting (Public API)

**Use `rate-limiter-flexible` for the public REST API.** Better Auth handles API-key-level rate limiting, but the public API also needs IP-based and global rate limiting as a first line of defense.

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| rate-limiter-flexible | ^9.1.1 | IP-based rate limiting for public REST endpoints | HIGH |

**Why rate-limiter-flexible over hono-rate-limiter:**
- Zero dependencies (hono-rate-limiter requires `unstorage` as peer dep)
- Native ioredis support (hono-rate-limiter's `@hono-rate-limiter/redis` requires a specific RedisClient interface that doesn't match ioredis natively)
- Battle-tested (11M+ weekly downloads vs hono-rate-limiter's much smaller footprint)
- Supports sliding window, fixed window, token bucket algorithms
- Works perfectly as Hono middleware with a thin wrapper

**Hono middleware pattern:**
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { MiddlewareHandler } from 'hono';

export function rateLimitMiddleware(limiter: RateLimiterRedis): MiddlewareHandler {
  return async (c, next) => {
    try {
      await limiter.consume(c.req.header('x-forwarded-for') ?? 'unknown');
      await next();
    } catch {
      return c.json({ error: 'Too many requests' }, 429);
    }
  };
}
```

**Two-layer strategy:**
1. `rate-limiter-flexible` for IP-based rate limiting on the public REST API (e.g., 100 req/min per IP)
2. Better Auth API key plugin's built-in rate limiting for per-key limits (e.g., 60 req/min per API key)

**Source:** [rate-limiter-flexible GitHub](https://github.com/animir/node-rate-limiter-flexible) (HIGH confidence, widely adopted, zero deps)

### Webhook Delivery

**Build webhook delivery using BullMQ + native `fetch` + `node:crypto`.** Do NOT add a webhook-specific library.

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| bullmq | ^5.70.1 | Queue webhook delivery jobs with retry | HIGH |
| node:crypto | built-in | HMAC-SHA256 signing for webhook payloads | HIGH |
| (native fetch) | built-in | HTTP delivery to customer webhook URLs | HIGH |

**Why no webhook library:**
- Webhook delivery is: queue a job, sign payload with HMAC, POST via fetch, handle retry on failure
- BullMQ already handles: retries with exponential backoff, dead-letter queues, job lifecycle tracking
- `node:crypto` handles: `crypto.createHmac('sha256', secret).update(payload).digest('hex')`
- `fetch` handles: the HTTP POST
- Adding a library for this is dependency bloat for ~50 lines of code

**Webhook delivery pattern:**
```typescript
// Sign payload
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Deliver
const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-PleaseHold-Signature': `sha256=${signature}`,
    'X-PleaseHold-Event': eventType,
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(10_000), // 10s timeout
});
```

**BullMQ retry configuration:**
```typescript
{
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s, 8s, 16s
  },
}
```

**Source:** [Node.js crypto docs](https://nodejs.org/api/crypto.html), [BullMQ docs](https://docs.bullmq.io/) (HIGH confidence, standard Node.js patterns)

### Slack Integration

**Use native `fetch` for Slack incoming webhooks.** Do NOT install `@slack/webhook` or `@slack/web-api`.

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| (native fetch) | built-in | POST to Slack incoming webhook URL | HIGH |

**Why no Slack SDK:**
- `@slack/webhook` (v7.0.7) pulls in `axios` (~1.13.5) as a transitive dependency. The entire package exists to wrap a single `fetch` call
- Incoming webhooks are literally: `POST https://hooks.slack.com/services/T.../B.../xxx` with a JSON body `{ "text": "..." }`
- pleasehold sends one-way notifications. It does not read messages, manage channels, or use OAuth. Zero interactivity
- Self-hosted users must configure their own Slack app webhook URL anyway

**Slack notification pattern:**
```typescript
async function sendSlackNotification(webhookUrl: string, message: {
  text: string;
  blocks?: unknown[];
}): Promise<boolean> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(5_000),
  });
  return response.ok;
}
```

**Source:** [Slack Incoming Webhooks docs](https://api.slack.com/incoming-webhooks) (HIGH confidence, official Slack docs)

### Email Notifications

**Use Resend + React Email.** Matches GoldenBerry exactly.

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| resend | ^6.9.2 | Email delivery API | HIGH |
| @react-email/components | ^1.0.8 | Email templates in JSX | HIGH |

**Why Resend:**
- Already proven in GoldenBerry (`packages/email`)
- TypeScript-first SDK with full type safety
- React Email integration means templates are JSX components, not string templates
- Free tier (100 emails/day) is generous for self-hosters
- Self-hosted users can swap to any SMTP provider via environment variables (build abstraction layer)

**Self-hosting consideration:** The email package should expose a `createEmailClient` factory (like GoldenBerry) that can be backed by Resend or a generic SMTP transport. For v1, Resend is the default; SMTP fallback is a future enhancement.

**Source:** [Resend docs](https://resend.com/docs), GoldenBerry reference (HIGH confidence, proven pattern)

### CSV Export

**Use `papaparse` for CSV generation.** Do NOT use `fast-csv` or build custom CSV serialization.

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| papaparse | ^5.5.3 | CSV generation for entry export | MEDIUM |
| @types/papaparse | ^5.5.2 | TypeScript types | MEDIUM |

**Why papaparse:**
- Fastest CSV parser/generator in JavaScript benchmarks
- Handles edge cases (commas in values, unicode, quoted fields) that hand-rolled `join(',')` does not
- Streaming support for large exports
- 50M+ weekly downloads, battle-tested

**Why not build it yourself:**
- CSV looks trivial until you hit: commas in company names, unicode characters, newlines in message fields, BOM for Excel compatibility
- papaparse handles all of this for ~30KB

**Source:** [PapaParse docs](https://www.papaparse.com/) (MEDIUM confidence, web search verified with multiple sources)

### Request Validation (Public API)

**Use `@hono/zod-validator` for public REST API input validation.**

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| @hono/zod-validator | ^0.7.6 | Hono middleware for Zod schema validation | HIGH |

**Why:** The public REST API (non-tRPC) still needs input validation. This middleware validates request bodies/params against Zod schemas and returns proper 400 errors. Already in the Hono ecosystem, zero friction.

**Source:** [Hono middleware docs](https://hono.dev/docs/middleware/third-party/zod-validator) (HIGH confidence)

### Logging

**Use `pino` for structured logging.** Matches GoldenBerry pattern.

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| pino | ^10.3.1 | Structured JSON logging | HIGH |

**Why:** Fast, JSON-native, standard for Node.js production logging. GoldenBerry already has a `@goldenberry/logger` package wrapping pino. Replicate as `@pleasehold/logger`.

**Source:** GoldenBerry reference (HIGH confidence)

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@slack/web-api` | 500KB+ with OAuth, channels, users — overkill for sending notifications | Native `fetch` to Slack webhook URL |
| `@slack/webhook` | Pulls in `axios` for a single POST request | Native `fetch` |
| `nodemailer` | Low-level SMTP. Resend is higher-level and already proven | `resend` |
| `express-rate-limit` | Express-specific, wrong framework | `rate-limiter-flexible` (framework-agnostic) |
| `hono-rate-limiter` | Immature (v0.5.3), Redis store requires `unstorage` peer dep, poor ioredis support | `rate-limiter-flexible` (zero deps, ioredis native) |
| `uuid` | Node.js has `crypto.randomUUID()` built-in since v19 | `crypto.randomUUID()` |
| `axios` | `fetch` is built into Node.js 18+. No need for HTTP client libraries | Native `fetch` |
| `svix` / `hookdeck` | Managed webhook SaaS. pleasehold IS the SaaS, not a consumer of one | BullMQ + fetch + crypto |
| `passport.js` | Session-based auth with strategy sprawl. Better Auth is cleaner | `better-auth` |
| `jsonwebtoken` | Custom JWT handling when Better Auth manages sessions | `better-auth` |
| `fast-csv` | Slower than papaparse in benchmarks, more complex API | `papaparse` |
| Custom API key generation | Better Auth apiKey plugin handles generation, hashing, verification, rate limiting | `better-auth` apiKey plugin |
| `helmet` | Express-specific security headers middleware | Hono's built-in `secureHeaders` middleware |
| `cors` (npm package) | Express-specific CORS middleware | Hono's built-in `cors` middleware |
| `dotenv` | Node.js 20.6+ has `--env-file` flag; Turborepo handles env passthrough | `--env-file .env` flag or Turborepo `passThroughEnv` |

## Installation

```bash
# Root devDependencies
pnpm add -Dw @biomejs/biome turbo typescript vitest husky

# packages/db
pnpm add --filter @pleasehold/db drizzle-orm postgres
pnpm add -D --filter @pleasehold/db drizzle-kit

# packages/auth
pnpm add --filter @pleasehold/auth better-auth

# packages/email
pnpm add --filter @pleasehold/email resend @react-email/components react

# packages/trpc
pnpm add --filter @pleasehold/trpc @trpc/server superjson zod

# packages/shared
pnpm add --filter @pleasehold/shared zod

# packages/logger
pnpm add --filter @pleasehold/logger pino

# apps/api
pnpm add --filter @pleasehold/api hono @hono/node-server @hono/trpc-server @hono/zod-validator bullmq ioredis drizzle-orm rate-limiter-flexible

# apps/worker
pnpm add --filter @pleasehold/worker bullmq ioredis papaparse
pnpm add -D --filter @pleasehold/worker @types/papaparse

# apps/web (dashboard)
pnpm add --filter @pleasehold/web react react-dom @tanstack/react-query @tanstack/react-router @tanstack/react-table @tanstack/react-form @trpc/client @trpc/react-query superjson zustand
pnpm add -D --filter @pleasehold/web @vitejs/plugin-react vite tailwindcss @tailwindcss/vite @tanstack/router-plugin

# apps/landing
pnpm add --filter @pleasehold/landing astro tailwindcss @tailwindcss/vite

# All packages get these dev deps
# tsup (build), tsx (dev), typescript
```

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| drizzle-orm@0.45.x | postgres@3.4.x | Use postgres.js driver, not pg |
| drizzle-orm@0.45.x | better-auth@1.4.x | Better Auth has a built-in Drizzle adapter |
| @trpc/server@11.x | @hono/trpc-server@0.4.x | Verified working in GoldenBerry |
| @trpc/client@11.x | @trpc/react-query@11.x | Must be same major version |
| bullmq@5.x | ioredis@5.x | BullMQ requires ioredis, not redis |
| rate-limiter-flexible@9.x | ioredis@5.x | Shares the same ioredis instance as BullMQ |
| better-auth@1.4.x | hono@4.x | Better Auth has Hono integration |
| React@19 | @react-email/components@1.x | React Email supports React 19 |
| Astro@5.x | tailwindcss@4.x | Via @tailwindcss/vite plugin |
| Vitest@4.x | Vite@6.x | Vitest 4 requires Vite 6+ |

## Stack Patterns by Variant

**If self-hosted (docker-compose):**
- Email: Users provide SMTP config or Resend API key via env vars
- Redis: Single Redis instance for both BullMQ and rate limiting
- Database: Single PostgreSQL instance

**If managed (pleasehold.dev hosted):**
- Email: Resend as default provider
- Redis: Could separate BullMQ and rate-limiting Redis instances for isolation
- Database: Managed PostgreSQL

## Dependency Count Summary

**Total new domain-specific dependencies: 3**
- `rate-limiter-flexible` (zero transitive deps)
- `papaparse` (zero transitive deps)
- `@hono/zod-validator` (peer deps on hono + zod, already present)

Everything else is either already in the decided stack, built-in to Node.js, or handled by Better Auth plugins. This is lean.

## Sources

- GoldenBerry reference codebase `/Users/christopher.jimenez/Src/PixelTowers/GoldenBerry` -- architectural patterns, version pins, package structure (HIGH confidence)
- [Better Auth API Key Plugin](https://www.better-auth.com/docs/plugins/api-key) -- API key management capabilities (HIGH confidence, official docs)
- [rate-limiter-flexible GitHub](https://github.com/animir/node-rate-limiter-flexible) -- rate limiting with ioredis (HIGH confidence)
- [hono-rate-limiter GitHub](https://github.com/rhinobase/hono-rate-limiter) -- evaluated and rejected for ioredis compatibility issues (HIGH confidence)
- [Slack Incoming Webhooks](https://api.slack.com/incoming-webhooks) -- webhook-only Slack integration (HIGH confidence, official docs)
- [Resend docs](https://resend.com/docs) -- email delivery SDK (HIGH confidence)
- [PapaParse](https://www.papaparse.com/) -- CSV generation (MEDIUM confidence)
- [Node.js crypto](https://nodejs.org/api/crypto.html) -- HMAC signing for webhook delivery (HIGH confidence, official docs)
- npm registry -- all version numbers verified via `npm view` on 2026-02-25 (HIGH confidence)

---
*Stack research for: pleasehold.dev — waitlist/demo-booking API SaaS*
*Researched: 2026-02-25*
