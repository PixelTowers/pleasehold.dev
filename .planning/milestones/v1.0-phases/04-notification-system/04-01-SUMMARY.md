---
phase: 04-notification-system
plan: 01
subsystem: database, infra, api
tags: [bullmq, redis, drizzle, notifications, worker, ioredis, nodemailer]

# Dependency graph
requires:
  - phase: 02-entry-api
    provides: entries table schema and projects table for foreign keys
provides:
  - notification_channels table with 5 channel types and JSONB config
  - notification_logs table for delivery auditing
  - entries verification columns (verificationToken, verifiedAt, verificationExpiresAt)
  - BullMQ Worker package (apps/worker) with Redis connection and graceful shutdown
  - BullMQ Queue singleton (notification-queue.ts) with enqueueNotification helper
  - Redis configured with noeviction policy for BullMQ safety
affects: [04-notification-system]

# Tech tracking
tech-stack:
  added: [bullmq, ioredis, nodemailer]
  patterns: [BullMQ worker/queue split, fire-and-forget enqueue, Redis maxmemory-policy validation]

key-files:
  created:
    - packages/db/src/schema/notification-channels.ts
    - packages/db/src/schema/notification-logs.ts
    - apps/worker/package.json
    - apps/worker/tsconfig.json
    - apps/worker/src/index.ts
    - apps/api/src/lib/notification-queue.ts
  modified:
    - packages/db/src/schema/entries.ts
    - packages/db/src/schema/relations.ts
    - packages/db/src/schema/index.ts
    - apps/api/package.json
    - docker-compose.dev.yml
    - turbo.json
    - pnpm-lock.yaml

key-decisions:
  - "Worker and API share Redis connection config via REDIS_HOST/REDIS_PORT env vars with localhost:6380 defaults"
  - "Worker validates Redis maxmemory-policy at startup but warns instead of crashing for dev flexibility"
  - "Queue default job options: 5 attempts with exponential backoff starting at 5s, auto-cleanup at 1000 completed/5000 failed"
  - "Worker tsconfig extends root config matching API pattern for consistency"

patterns-established:
  - "BullMQ queue/worker split: Queue singleton in API (lib/notification-queue.ts), Worker in separate package (apps/worker)"
  - "Redis policy validation: worker checks maxmemory-policy at startup and warns"
  - "Notification job data interface: {entryId, projectId, type} for all notification jobs"

requirements-completed: [NOTF-06]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 4 Plan 1: Notification Foundation Summary

**BullMQ notification queue infrastructure with notification_channels/notification_logs schema tables and worker package scaffold**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T07:37:56Z
- **Completed:** 2026-02-26T07:40:55Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created notification_channels table with type discriminator for email/slack/discord/telegram/webhook and JSONB config column
- Created notification_logs table for delivery auditing with status, error, attempt count, and timing columns
- Extended entries table with verificationToken, verifiedAt, verificationExpiresAt columns and pending_verification status
- Built complete apps/worker package with BullMQ Worker listening on 'notifications' queue, concurrency of 5, and graceful shutdown
- Created notification-queue.ts in API with Queue singleton and fire-and-forget enqueueNotification helper
- Configured Docker Compose Redis with --maxmemory-policy noeviction for BullMQ safety

## Task Commits

Each task was committed atomically:

1. **Task 1: Create notification_channels, notification_logs tables and extend entries schema** - `e9b0cf7` (feat)
2. **Task 2: Create worker package, BullMQ queue, Docker and Turbo config** - `873055e` (feat)

## Files Created/Modified
- `packages/db/src/schema/notification-channels.ts` - Notification channels table with 5 channel types and JSONB config
- `packages/db/src/schema/notification-logs.ts` - Delivery audit logs with status tracking
- `packages/db/src/schema/entries.ts` - Extended with verification columns and pending_verification status
- `packages/db/src/schema/relations.ts` - Wired notification channels and logs relations
- `packages/db/src/schema/index.ts` - Barrel export includes new tables
- `apps/worker/package.json` - Worker package manifest with bullmq, ioredis, nodemailer deps
- `apps/worker/tsconfig.json` - TypeScript config extending root
- `apps/worker/src/index.ts` - Worker entry point with BullMQ Worker and Redis validation
- `apps/api/src/lib/notification-queue.ts` - Queue singleton with enqueueNotification helper
- `apps/api/package.json` - Added bullmq and ioredis dependencies
- `docker-compose.dev.yml` - Redis configured with noeviction maxmemory-policy
- `turbo.json` - Added REDIS and SMTP env vars to passThroughEnv
- `pnpm-lock.yaml` - Updated lockfile with new dependencies

## Decisions Made
- Worker and API share Redis connection config via REDIS_HOST/REDIS_PORT env vars with localhost:6380 defaults matching docker-compose port mapping
- Worker validates Redis maxmemory-policy at startup but only warns (does not crash) for dev flexibility
- Queue default job options: 5 attempts with exponential backoff starting at 5s, auto-cleanup at 1000 completed/5000 failed jobs
- Worker tsconfig extends root config matching API pattern for consistency across apps

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None for this plan - SMTP credentials noted in plan frontmatter but only needed when Plan 04-02 wires actual email sending.

## Next Phase Readiness
- Foundation ready for Plan 04-02 to build channel senders and wire the notification pipeline
- Worker placeholder processor ready to be replaced with actual dispatch logic
- All schema tables in place for channel configuration and delivery logging

## Self-Check: PASSED

All 6 created files verified present. Both task commits (e9b0cf7, 873055e) verified in git history. Full workspace typecheck passes across all 6 packages.

---
*Phase: 04-notification-system*
*Completed: 2026-02-26*
