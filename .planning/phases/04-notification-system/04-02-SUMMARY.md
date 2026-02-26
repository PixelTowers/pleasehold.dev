---
phase: 04-notification-system
plan: 02
subsystem: worker, api
tags: [nodemailer, slack, discord, telegram, webhook, hmac, bullmq, notifications, verification]

# Dependency graph
requires:
  - phase: 04-notification-system
    provides: notification_channels/notification_logs schema, BullMQ worker scaffold, queue singleton
provides:
  - 5 channel sender functions (email, Slack, Discord, Telegram, webhook with HMAC-SHA256)
  - Verification email sender for double opt-in flow
  - Job processor that dispatches to channel-specific senders with delivery logging
  - Entry submission notification hook (fire-and-forget enqueue)
  - Public /verify/:token endpoint for email verification
affects: [04-notification-system]

# Tech tracking
tech-stack:
  added: []
  patterns: [channel sender dispatch, HMAC-SHA256 webhook signing, fire-and-forget enqueue, double opt-in verification]

key-files:
  created:
    - apps/worker/src/types.ts
    - apps/worker/src/senders/mailer.ts
    - apps/worker/src/senders/email.ts
    - apps/worker/src/senders/slack.ts
    - apps/worker/src/senders/discord.ts
    - apps/worker/src/senders/telegram.ts
    - apps/worker/src/senders/webhook.ts
    - apps/worker/src/senders/verification-email.ts
    - apps/worker/src/processor.ts
    - apps/api/src/routes/v1/verify.ts
  modified:
    - apps/worker/src/index.ts
    - apps/worker/package.json
    - apps/api/src/routes/v1/entries.ts
    - apps/api/src/index.ts
    - pnpm-lock.yaml

key-decisions:
  - "Shared Nodemailer transporter singleton (mailer.ts) avoids creating multiple SMTP connections across email senders"
  - "Verify route mounted at /verify (not /api/v1/verify) before API key middleware chain so it is public"
  - "All verification failure cases return identical generic error to prevent token enumeration"
  - "drizzle-orm added as direct worker dependency at ^0.45.1 to match db package version and avoid type conflicts"

patterns-established:
  - "Channel sender dispatch: processor switch on channel.type routes to per-channel sender function"
  - "HMAC-SHA256 webhook signing: timestamp.body signed with channel secret, sent in X-PleaseHold-Signature header"
  - "Fire-and-forget enqueue: .catch(console.error) pattern for non-blocking notification queueing"
  - "Duplicate notification prevention: processor checks notification_logs for existing 'sent' record before dispatch"

requirements-completed: [NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07]

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 4 Plan 2: Notification Pipeline Summary

**Five channel senders (email/Slack/Discord/Telegram/webhook), BullMQ job processor with delivery logging, entry submission notification hook, and double opt-in verification endpoint**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T07:44:03Z
- **Completed:** 2026-02-26T07:47:57Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Created 5 channel-specific notification senders with correct API formats (Slack Block Kit, Discord embeds, Telegram Bot API, webhook HMAC-SHA256)
- Built job processor that fan-outs entry_created jobs to all enabled channels with per-channel delivery logging and duplicate prevention on retry
- Hooked entry submission route to fire-and-forget notification enqueue for new entries only
- Created public /verify/:token endpoint for double opt-in email verification that flips status and enqueues owner notifications

## Task Commits

Each task was committed atomically:

1. **Task 1: Create all channel sender functions and the job processor** - `5e13c1a` (feat)
2. **Task 2: Hook entry submission to enqueue notifications and create verification endpoint** - `d45f914` (feat)

## Files Created/Modified
- `apps/worker/src/types.ts` - Shared EntryPayload interface for all senders
- `apps/worker/src/senders/mailer.ts` - Nodemailer transporter singleton from SMTP env vars
- `apps/worker/src/senders/email.ts` - Email notification sender with HTML and plain text
- `apps/worker/src/senders/slack.ts` - Slack webhook sender with Block Kit mrkdwn blocks
- `apps/worker/src/senders/discord.ts` - Discord webhook sender with embed fields and blurple color
- `apps/worker/src/senders/telegram.ts` - Telegram Bot API sender with Markdown formatting
- `apps/worker/src/senders/webhook.ts` - Generic webhook sender with HMAC-SHA256 timestamp signature
- `apps/worker/src/senders/verification-email.ts` - Double opt-in confirmation email with styled button
- `apps/worker/src/processor.ts` - Job processor dispatching to channel senders with delivery logging
- `apps/worker/src/index.ts` - Replaced placeholder processor with real processNotification
- `apps/worker/package.json` - Added drizzle-orm dependency
- `apps/api/src/routes/v1/entries.ts` - Added fire-and-forget enqueueNotification after new inserts
- `apps/api/src/routes/v1/verify.ts` - Public verification endpoint with token validation
- `apps/api/src/index.ts` - Mounted verify route with permissive CORS before API key middleware
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Shared Nodemailer transporter singleton (mailer.ts) avoids creating multiple SMTP connections across the two email senders
- Verify route mounted at /verify (not under /api/v1/) so it bypasses API key auth middleware entirely -- submitters clicking email links do not have API keys
- All verification failure cases (not found, expired, already verified) return the same generic error message to prevent token enumeration attacks
- drizzle-orm added as direct worker dependency at ^0.45.1 to match the db package version exactly, preventing type conflicts from phantom duplicate resolution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added drizzle-orm as direct worker dependency**
- **Found during:** Task 1 (channel senders and processor)
- **Issue:** processor.ts imports `eq` and `and` from drizzle-orm but the worker package only had @pleasehold/db as a dependency. TypeScript could not resolve drizzle-orm types.
- **Fix:** Added drizzle-orm ^0.45.1 to worker package.json dependencies, matching the db package version exactly to prevent type conflicts from mismatched phantom versions
- **Files modified:** apps/worker/package.json, pnpm-lock.yaml
- **Verification:** pnpm turbo typecheck --filter=@pleasehold/worker passes
- **Committed in:** 5e13c1a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for compilation. No scope creep.

## Issues Encountered
None beyond the drizzle-orm dependency resolution documented above.

## User Setup Required
None for this plan -- SMTP credentials needed for actual email delivery but not for compilation/typecheck.

## Next Phase Readiness
- Complete notification pipeline wired: entry -> queue -> worker -> channel senders
- Ready for Plan 04-03 to add notification channel CRUD management endpoints and project-level settings
- All sender functions tested via typecheck; runtime testing requires SMTP and webhook targets

## Self-Check: PASSED

All 10 created files verified present. Both task commits (5e13c1a, d45f914) verified in git history. enqueueNotification confirmed in entries.ts. createVerifyRoute confirmed in index.ts. Full workspace typecheck passes across all 6 packages.

---
*Phase: 04-notification-system*
*Completed: 2026-02-26*
