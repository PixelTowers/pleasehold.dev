# pleasehold

API-first waitlist and demo-booking service. Add a signup form to any landing page in minutes — just an API key and a POST request. No backend work, no form infrastructure.

Developers build their own frontend forms; pleasehold handles the backend: entry capture, deduplication, notifications, and a management dashboard.

Open source. Self-hostable via Docker.

## Quick Start (Docker)

```bash
git clone https://github.com/PixelTowers/pleasehold.dev.git
cd pleasehold.dev
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and BETTER_AUTH_SECRET at minimum
docker compose up
```

Dashboard: [http://localhost:8080](http://localhost:8080)
API: [http://localhost:3001](http://localhost:3001)
API docs: [http://localhost:3001/docs](http://localhost:3001/docs)

## How It Works

1. **Sign up** at the dashboard and create a project (waitlist or demo-booking mode)
2. **Generate an API key** (`ph_live_...`) scoped to your project
3. **Configure fields** — choose what to collect (email, name, company, message, custom metadata)
4. **POST entries** from your frontend form to the REST API
5. **Get notified** via email, Slack, Discord, Telegram, or webhook
6. **Manage entries** in the dashboard — search, filter, bulk actions, CSV export

## API Usage

Submit an entry with a single HTTP request:

```bash
curl -X POST https://your-api.example.com/api/v1/entries \
  -H "Content-Type: application/json" \
  -H "x-api-key: ph_live_your_key_here" \
  -d '{
    "email": "user@example.com",
    "name": "Jane Doe",
    "company": "Acme Inc",
    "message": "Interested in early access",
    "metadata": { "referral": "twitter", "plan": "pro" }
  }'
```

Response:

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "name": "Jane Doe",
    "company": "Acme Inc",
    "position": 42,
    "createdAt": "2026-01-15T09:30:00.000Z"
  }
}
```

- **Deduplication** — duplicate emails return `200` with the existing entry (idempotent)
- **Rate limiting** — 60 requests/min per API key
- **Dynamic validation** — fields are validated against your project's field configuration
- **Double opt-in** — optional email verification before entries become active

Interactive API documentation is available at `/docs` (powered by Scalar).

## Local Development

### Prerequisites

- Node.js >= 22
- pnpm 10+
- PostgreSQL 16
- Redis 7

### Setup

```bash
# Start infrastructure (PostgreSQL on :5434, Redis on :6380)
docker compose -f docker-compose.dev.yml up -d

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env — set DATABASE_URL to postgresql://pleasehold:pleasehold@localhost:5434/pleasehold

# Run database migrations
pnpm db:generate
pnpm db:migrate

# Start all services
pnpm dev
```

This runs the API server, web dashboard, and background worker concurrently via Turborepo.

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Run Biome linting and formatting checks |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm clean` | Remove build artifacts and node_modules |

## Architecture

```
pleasehold/
├── apps/
│   ├── api/           Hono server — REST API + tRPC + auth + OpenAPI docs
│   ├── web/           React 19 SPA — dashboard (Vite + TanStack Router)
│   └── worker/        BullMQ processor — notifications + background jobs
├── packages/
│   ├── db/            Drizzle ORM schema + PostgreSQL client
│   ├── auth/          Better Auth configuration
│   └── trpc/          tRPC routers + context
├── docker-compose.yml          Production stack
├── docker-compose.dev.yml      Dev infrastructure (Postgres + Redis)
└── .env.example                Environment template
```

### Design Decisions

- **Dual API** — REST for external developers (simple HTTP + API key), tRPC for the dashboard (type-safe RPC with session auth)
- **Single Hono server** — REST routes, tRPC, and auth share one process, one DB pool
- **Separate worker process** — BullMQ runs in `apps/worker` so long-running notification delivery doesn't block the API
- **API-first, no widget** — developers build their own forms and get full control over the UX
- **Path-specific CORS** — `origin: *` on `/api/v1/*` for external devs, restricted origin on `/trpc/*` and `/api/auth/*`
- **Rate limiting before auth** — prevents DB floods from unauthenticated garbage requests

### Notification Pipeline

Entry submission triggers an async fan-out through BullMQ:

1. Entry inserted → `notification-dispatch` job enqueued
2. Worker reads project notification channels
3. Per-channel delivery jobs enqueued (`email-send`, `slack-notify`, `webhook-dispatch`, etc.)
4. Each channel retries independently with exponential backoff (48-hour window)
5. Webhooks are signed with HMAC-SHA256

Supported channels: **Email**, **Slack**, **Discord**, **Telegram**, **Webhook**

## Dashboard

The web dashboard provides:

- **Project management** — create and configure projects, toggle waitlist/demo-booking mode
- **Entry table** — paginated list with search, status filters, and bulk actions
- **Entry detail** — view full submission data, update status
- **API keys** — generate and revoke project-scoped keys
- **Notifications** — configure channels per project
- **CSV export** — download entries for external tools

Routes use TanStack Router with file-based routing and type-safe navigation.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password (Docker Compose) |
| `BETTER_AUTH_SECRET` | Yes | 32+ character string for session signing |
| `DATABASE_URL` | Dev only | PostgreSQL connection string (Docker builds it from `POSTGRES_*`) |
| `API_URL` | No | Public API URL (default: `http://localhost:3001`) |
| `WEB_URL` | No | Public dashboard URL (default: `http://localhost:8080`) |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth app secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `SMTP_HOST` | No | SMTP server for email notifications + double opt-in |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `SMTP_FROM` | No | Sender email address |

## Tech Stack

- **Runtime:** Node.js 22, TypeScript 5.7
- **API:** [Hono](https://hono.dev) + [tRPC 11](https://trpc.io) + [Zod](https://zod.dev)
- **Database:** PostgreSQL 16 via [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** [Better Auth](https://www.better-auth.com) (email/password + GitHub/Google OAuth)
- **Jobs:** [BullMQ](https://bullmq.io) + Redis 7
- **Frontend:** React 19 + [Vite](https://vite.dev) + [TanStack Router](https://tanstack.com/router) + [TanStack Table](https://tanstack.com/table)
- **API Docs:** [Scalar](https://scalar.com) (auto-generated from OpenAPI spec)
- **Monorepo:** pnpm + [Turborepo](https://turbo.build)
- **Code Quality:** [Biome](https://biomejs.dev) + [Vitest](https://vitest.dev)
- **Deployment:** Docker multi-stage builds + nginx reverse proxy

## Self-Hosting Notes

The Docker Compose stack runs five services:

| Service | Purpose |
|---------|---------|
| `postgres` | Data storage (persistent volume) |
| `redis` | Job queue + rate limiting (`noeviction` policy required) |
| `migrate` | One-shot migration runner (exits after completion) |
| `api` | Hono API server (port 3001) |
| `worker` | BullMQ notification processor |
| `web` | React dashboard + nginx reverse proxy (port 8080) |

The `web` service includes an nginx reverse proxy that routes `/api/*`, `/trpc/*`, and `/health` to the API container. The dashboard SPA handles all other routes client-side.

Migrations run automatically on startup via the `migrate` service before the API and worker start.
