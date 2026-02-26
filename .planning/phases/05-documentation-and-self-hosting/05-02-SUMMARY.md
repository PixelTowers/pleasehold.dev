---
phase: 05-documentation-and-self-hosting
plan: 02
subsystem: infra
tags: [docker, nginx, docker-compose, turbo-prune, self-hosting]

# Dependency graph
requires:
  - phase: 05-documentation-and-self-hosting
    provides: OpenAPI docs at /doc and /docs endpoints (proxied through nginx)
provides:
  - Multi-stage Dockerfiles for API, worker, and web services using turbo prune
  - Production docker-compose.yml with 6 services and automatic migration
  - nginx reverse proxy config for SPA with API/tRPC/docs passthrough
  - Documented .env.example for self-hosting configuration
affects: []

# Tech tracking
tech-stack:
  added: [docker, nginx, docker-compose]
  patterns: [turbo-prune-multistage, nginx-reverse-proxy, init-container-migrations]

key-files:
  created:
    - apps/api/Dockerfile
    - apps/worker/Dockerfile
    - apps/web/Dockerfile
    - apps/web/nginx.conf
    - .dockerignore
    - docker-compose.yml
  modified:
    - .env.example

key-decisions:
  - "nginx reverse proxy preferred over VITE_API_URL build-time env for API routing"
  - "Migrate service uses builder target from API Dockerfile to reuse installed deps"
  - "Redis port 6379 internal (not 6380 dev mapping) inside Docker network"
  - "Database and Redis not exposed to host in production (only API and web ports mapped)"

patterns-established:
  - "turbo prune --docker multi-stage pattern: base -> pruner -> installer -> builder -> runner"
  - "Init container pattern: migrate service runs once before API starts via service_completed_successfully"
  - "Fail-fast required env vars: ${VAR:?message} syntax in docker-compose.yml"

requirements-completed: [INFR-01, INFR-02]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 5 Plan 2: Docker and Self-Hosting Summary

**Production Docker Compose stack with turbo-prune multi-stage builds, nginx SPA routing, and automatic database migrations**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T09:22:05Z
- **Completed:** 2026-02-26T09:24:14Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Multi-stage Dockerfiles for all 3 services (API, worker, web) using turbo prune for minimal context
- nginx config with SPA fallback routing and reverse proxy for /api, /trpc, /verify, /doc, /docs
- Production docker-compose.yml with 6 services including migrate init container
- Comprehensive .env.example documenting all environment variables with required/optional markers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Dockerfiles, nginx config, and .dockerignore** - `6bad655` (feat)
2. **Task 2: Create production docker-compose.yml and .env.example** - `fd04af7` (feat)

## Files Created/Modified
- `apps/api/Dockerfile` - Multi-stage Docker build for API service using turbo prune
- `apps/worker/Dockerfile` - Multi-stage Docker build for worker service using turbo prune
- `apps/web/Dockerfile` - Multi-stage Docker build for web dashboard with nginx serving static files
- `apps/web/nginx.conf` - nginx config with SPA fallback routing and API/tRPC reverse proxy
- `.dockerignore` - Excludes node_modules, .git, dist, .env from Docker context
- `docker-compose.yml` - Production compose with 6 services + migration init step
- `.env.example` - Documented environment variables for all services (expanded from minimal version)

## Decisions Made
- nginx reverse proxy preferred over VITE_API_URL build-time env for API routing (relative URLs work identically in dev via Vite proxy and prod via nginx proxy)
- Migrate service reuses the `builder` target from API Dockerfile to avoid a separate migration image
- Redis port 6379 used internally (not 6380 dev host mapping) inside Docker network
- Database and Redis ports not exposed to host in production (security -- only API and web mapped)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required. Users copy .env.example to .env, fill in required values, and run `docker compose up`.

## Next Phase Readiness
- Full self-hosting stack complete -- `docker compose up` starts everything
- This is the final plan of Phase 5 (documentation and self-hosting)
- All 5 phases of the v1.0 milestone are now complete

## Self-Check: PASSED

All 7 created files verified present. Both task commits (6bad655, fd04af7) verified in git log.

---
*Phase: 05-documentation-and-self-hosting*
*Completed: 2026-02-26*
