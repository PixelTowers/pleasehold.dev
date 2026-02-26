# QA-04: Docker Self-Hosting Flow Verification Report

**Date:** 2026-02-26
**Tester:** Claude (automated) + Human (visual verification completed)
**Environment:** macOS Darwin 25.3.0, Docker Desktop, Node 22 Alpine containers

## Summary

**Result: 11/11 checks PASSED (10 automated + 1 human verification)**

The Docker self-hosting flow works end-to-end from a clean state. All services build, start, and function correctly. Entry submission through the full Docker stack succeeds. Human verified dashboard accessibility and correctness.

## Pre-Test Setup

- Backed up existing `.env` to `.env.backup-pre-qa`
- Created Docker-specific `.env` with required variables:
  - `POSTGRES_PASSWORD=qatest_secure_pw_2026`
  - `BETTER_AUTH_SECRET=supersecretdevkey1234567890abcdef`
  - Default ports: API=3001, WEB=8080

## Step Results

### Step 1: Clean Environment Preparation
**PASSED**
- Ran `docker compose down -v --remove-orphans`
- Verified ports 3001 and 8080 were free
- Note: Had to kill a running tsx dev server on port 3001

### Step 2: Create .env from Example
**PASSED**
- Added Docker Compose required variables (`POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_USER`)
- Kept SMTP_* empty (tested in Plan 09-03)

### Step 3: Build Docker Compose
**PASSED (after fix)**
- All 4 buildable services compiled successfully: api, worker, web, migrate
- Web bundle: 540 KB (Vite production build, 427 modules)

**Issue Found & Fixed:** Docker builds initially failed because `tsconfig.json` in packages referenced `../../tsconfig.json` (root config), but turbo prune's `--docker` output omits the root tsconfig. Fixed by adding `COPY --from=pruner /app/tsconfig.json ./tsconfig.json` to the builder stage in all three Dockerfiles.

**Issue Found & Fixed:** API crashed at runtime with `TypeError: z7.coerce.boolean(...).meta is not a function`. Root cause: `better-auth@1.4.19` depends on `better-call@1.1.8` which requires `zod@4.3.6`, but the bundled output via tsup was inlining better-auth code that called Zod v4 `.meta()` on a Zod v3 instance. Fixed by:
1. Adding `better-auth` as a direct dependency of `@pleasehold/api`
2. Marking `better-auth` imports as external in `apps/api/tsup.config.ts`

### Step 4: Service Health Checks
**PASSED**

| Service   | Status         | Ports                    |
|-----------|----------------|--------------------------|
| postgres  | Up (healthy)   | 5432 (internal)          |
| redis     | Up (healthy)   | 6379 (internal)          |
| migrate   | Exited (0)     | N/A (one-shot)           |
| api       | Up             | 0.0.0.0:3001->3001/tcp   |
| worker    | Up             | N/A                      |
| web       | Up             | 0.0.0.0:8080->80/tcp     |

### Step 5: API Health Endpoint
**PASSED**
- Direct: `curl http://localhost:3001/health` -> `{"status":"ok"}`
- Proxied: `curl http://localhost:8080/health` -> `{"status":"ok"}`

### Step 6: Web Dashboard Accessible
**PASSED**
- HTTP 200, Content-Type: text/html
- SPA shell served with `<div id="root"></div>` and Vite-bundled JS

### Step 7: OpenAPI Docs
**PASSED**
- `/docs` -> HTTP 200 (Scalar UI)
- `/doc` -> JSON with `openapi: "3.0.0"`, `title: "pleasehold API"`

### Step 8: User, Project, and API Key Creation
**PASSED**
- Signup: Created user `docker-qa@pleasehold.dev` with session token
- Project: Created "Docker Test Project" (id: `287ed370-...`, mode: waitlist)
- API Key: Generated `ph_live_ccBTNTNJ...` key

### Step 9: Entry Submission
**PASSED**
- POST `/api/v1/entries` with `x-api-key` header
- Response: HTTP 201
- Entry: `docker-entry@example.com`, position: 1

### Step 10: Migration Logs
**PASSED**
- `drizzle-kit generate`: 10 tables detected, no schema changes needed
- `drizzle-kit migrate`: Migrations applied successfully
- Benign notices: "schema drizzle already exists, skipping" (expected on re-run)

## Fixes Applied During QA

### Fix 1: Root tsconfig missing in Docker builds
- **Files:** `apps/api/Dockerfile`, `apps/worker/Dockerfile`, `apps/web/Dockerfile`
- **Change:** Added `COPY --from=pruner /app/tsconfig.json ./tsconfig.json` to builder stage
- **Root cause:** `turbo prune --docker` does not include root tsconfig in output

### Fix 2: Zod v3/v4 version conflict in API bundle
- **Files:** `apps/api/tsup.config.ts`, `apps/api/package.json`
- **Change:** Made `better-auth` external in tsup config and added as direct dependency
- **Root cause:** `better-auth` internally uses Zod v4 features (`.meta()`) via `better-call@1.1.8`, but tsup bundled the code with Zod v3 resolution

## Docker Dashboard Verification
**PASSED** - Human verified on 2026-02-26

Human visual verification confirmed:
- Dashboard loads at http://localhost:8080
- "Docker Test Project" appears on dashboard
- Entries visible (docker-entry@example.com)
- Settings tab loads correctly
- Keys tab loads correctly (Docker QA Key visible)
- No console errors
- Navigation between pages is smooth (SPA routing, no full-page reloads)

## Final Result

**11/11 checks PASSED (10 automated + 1 human verification)**

The Docker self-hosting flow works end-to-end. A developer can copy .env.example, fill in required values, run docker-compose up, and have a fully working instance with accessible API and dashboard.
