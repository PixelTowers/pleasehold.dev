---
phase: 04-notification-system
verified: 2026-02-26T00:00:00Z
status: passed
score: 27/27 must-haves verified
gaps: []
human_verification:
  - test: "Send an email notification end-to-end with a real SMTP server"
    expected: "Email arrives at configured recipient with correct subject and entry details"
    why_human: "Requires live SMTP credentials; Nodemailer transporter is wired but runtime delivery cannot be verified statically"
  - test: "Post an entry and verify Slack Block Kit message arrives in channel"
    expected: "Slack message shows project name, email, name if present, and position"
    why_human: "Requires a live Slack webhook URL; fetch call is wired but HTTP delivery cannot be verified statically"
  - test: "Post an entry with doubleOptIn enabled and click the verification link in the email"
    expected: "Entry status flips from pending_verification to new; project owner channels receive entry_created notification"
    why_human: "End-to-end email-link flow requires live SMTP and browser; the database update and enqueue logic is verified statically"
  - test: "Navigate to /projects/{id}/notifications in the browser"
    expected: "Page renders with double opt-in toggle, channel list, Add channel dropdown, and correctly styled forms"
    why_human: "React rendering and visual correctness cannot be verified statically; requires a running browser"
  - test: "Add a webhook channel and verify HMAC-SHA256 signature on a real POST"
    expected: "X-PleaseHold-Signature header is present and verifiable; X-PleaseHold-Timestamp header is set"
    why_human: "Crypto correctness is verified by code inspection; actual HTTP delivery to an endpoint requires a live target"
---

# Phase 4: Notification System Verification Report

**Phase Goal:** Developers receive real-time notifications when new entries arrive, delivered asynchronously through their configured channels (email, Slack, webhook, Discord, Telegram) with reliable background job processing
**Verified:** 2026-02-26
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All truths are organized by plan. Combined across all three plans, 27/27 must-have items are verified.

#### Plan 04-01: Foundation

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | notification_channels table exists with type discriminator for email/slack/discord/telegram/webhook and JSONB config column | VERIFIED | `packages/db/src/schema/notification-channels.ts` — `type: text('type', { enum: ['email', 'slack', 'discord', 'telegram', 'webhook'] })`, `config: jsonb('config').notNull().$type<Record<string, unknown>>()` |
| 2 | notification_logs table exists for delivery auditing with status, error, and timing columns | VERIFIED | `packages/db/src/schema/notification-logs.ts` — `status: text('status', { enum: ['pending', 'sent', 'failed'] })`, `error: text('error')`, `sentAt`, `createdAt`, `attemptCount` |
| 3 | entries table has verification_token and verified_at columns for double opt-in support | VERIFIED | `packages/db/src/schema/entries.ts` — `verificationToken`, `verifiedAt`, `verificationExpiresAt`, status enum extended with `pending_verification`, index `entries_verification_token_idx` |
| 4 | Worker process starts, connects to Redis, and listens for jobs on the notifications queue | VERIFIED | `apps/worker/src/index.ts` — `new Worker('notifications', processNotification, { connection, concurrency: 5 })`, startup log, SIGTERM/SIGINT graceful shutdown |
| 5 | API server can enqueue jobs to the notifications BullMQ queue | VERIFIED | `apps/api/src/lib/notification-queue.ts` — `new Queue<NotificationJobData>('notifications', ...)`, `enqueueNotification()` exported and used in entries route |
| 6 | Redis is configured with noeviction policy for BullMQ safety | VERIFIED | `docker-compose.dev.yml` — `command: redis-server --maxmemory-policy noeviction` |
| 7 | Enqueueing a notification job does not block or fail the API response even if Redis is unavailable (fire-and-forget pattern) | VERIFIED | `apps/api/src/routes/v1/entries.ts` lines 81–93 — `.catch((err) => console.error('Failed to enqueue...'))` pattern, no `await` on enqueue |

#### Plan 04-02: Pipeline

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | When an entry is created, a notification job is enqueued to BullMQ without blocking the API response | VERIFIED | `apps/api/src/routes/v1/entries.ts` — fire-and-forget `enqueueNotification({...}).catch(...)` for both `entry_created` and `verification_email` paths |
| 9 | Worker processes entry_created jobs by looking up project channels and dispatching to each enabled channel's sender function | VERIFIED | `apps/worker/src/processor.ts` — fetches entry, project, filters enabled channels with `eq(notificationChannels.enabled, true)`, calls `dispatchToChannel()` for each |
| 10 | Email sender sends formatted notification to configured recipients via Nodemailer | VERIFIED | `apps/worker/src/senders/email.ts` — `transporter.sendMail()` with HTML + plain text body to all recipients |
| 11 | Slack sender POSTs Block Kit message to configured webhook URL | VERIFIED | `apps/worker/src/senders/slack.ts` — `fetch(webhookUrl, ...)` with `blocks: [{ type: 'section', text: { type: 'mrkdwn' } }]` |
| 12 | Discord sender POSTs embed message to configured webhook URL | VERIFIED | `apps/worker/src/senders/discord.ts` — `fetch(webhookUrl, ...)` with `embeds: [{ title: 'New Entry', color: 0x5865f2, fields }]` |
| 13 | Telegram sender POSTs to Bot API sendMessage endpoint with configured bot token and chat ID | VERIFIED | `apps/worker/src/senders/telegram.ts` — `fetch(\`https://api.telegram.org/bot${botToken}/sendMessage\`, ...)` with `parse_mode: 'Markdown'` |
| 14 | Webhook sender POSTs JSON payload with HMAC-SHA256 signature in X-PleaseHold-Signature header and timestamp in X-PleaseHold-Timestamp header | VERIFIED | `apps/worker/src/senders/webhook.ts` — `crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex')`, headers `X-PleaseHold-Signature` and `X-PleaseHold-Timestamp` set |
| 15 | Double opt-in verification endpoint accepts token, validates expiry, flips entry status to new, and enqueues owner notifications | VERIFIED | `apps/api/src/routes/v1/verify.ts` — token lookup, expiry check (`verificationExpiresAt < new Date()`), already-verified check (`verifiedAt`), `db.update(entries).set({ status: 'new', verifiedAt: new Date(), verificationToken: null })`, fire-and-forget `enqueueNotification({ type: 'entry_created' })` |
| 16 | Verification email sender sends confirmation link to submitter email address | VERIFIED | `apps/worker/src/senders/verification-email.ts` — builds URL from `API_URL/verify/${verificationToken}`, `transporter.sendMail()` with styled HTML button |

#### Plan 04-03: UI and Double Opt-In

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 17 | User can add an email notification channel with one or more recipient email addresses | VERIFIED | `NotificationChannelForm.tsx` — `EmailFields` component with add/remove recipient inputs; `notification.ts` router — `emailConfigSchema` validates min 1/max 10 recipients |
| 18 | User can add a Slack channel by pasting an incoming webhook URL | VERIFIED | `NotificationChannelForm.tsx` — `SlackFields` component; `notification.ts` — `slackConfigSchema` validates `https://hooks.slack.com/` prefix |
| 19 | User can add a Discord channel by pasting a webhook URL | VERIFIED | `NotificationChannelForm.tsx` — `DiscordFields`; `notification.ts` — `discordConfigSchema` validates `https://discord.com/api/webhooks/` prefix |
| 20 | User can add a Telegram channel by entering a bot token and chat ID | VERIFIED | `NotificationChannelForm.tsx` — `TelegramFields` with bot token and chat ID inputs, BotFather helper text; `telegramConfigSchema` validates both fields |
| 21 | User can add a generic webhook channel and see the auto-generated HMAC secret displayed once | VERIFIED | `notification.ts` — `crypto.randomBytes(32).toString('hex')` on create, secret returned in response; `notifications.tsx` — `SecretRevealDialog` shown on create mutation success |
| 22 | User can enable or disable individual channels without deleting them | VERIFIED | `notifications.tsx` — `ToggleSwitch` calls `handleToggleEnabled` which calls `updateChannel.mutate({ projectId, channelId, enabled: val })`; `update` procedure in `notification.ts` |
| 23 | User can delete a notification channel | VERIFIED | `notifications.tsx` — delete button with inline confirmation dialog; `deleteChannel.mutate({ projectId, channelId: channel.id })`; `deleteProcedure` in `notification.ts` |
| 24 | User can toggle double opt-in for a project, and new submissions get pending_verification status when enabled | VERIFIED | `notifications.tsx` — double opt-in `ToggleSwitch` with saving/saved/error feedback; `apps/api/src/routes/v1/entries.ts` — `if (project.doubleOptIn)` branch sets status `pending_verification`, generates `verificationToken`, enqueues `verification_email` |
| 25 | Notification settings are accessible from the project navigation | VERIFIED | `apps/web/src/routes/projects/$projectId/index.tsx` — Notifications link card at line 244, shows enabled channel count |

#### Cross-cutting verifications

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 26 | notificationRouter wired into appRouter | VERIFIED | `packages/trpc/src/router.ts` — `notification: notificationRouter` present in `appRouter` |
| 27 | verify route mounted publicly before API key auth middleware | VERIFIED | `apps/api/src/index.ts` lines 34–35 — `app.use('/verify/*', cors({ origin: '*' }))` and `app.route('/verify', createVerifyRoute(db))` registered before `/api/v1/*` middleware chain |

**Score:** 27/27 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/db/src/schema/notification-channels.ts` | notificationChannels table definition | VERIFIED | Exists, substantive (22 lines, all columns present), exported via index barrel |
| `packages/db/src/schema/notification-logs.ts` | notificationLogs table definition | VERIFIED | Exists, substantive (31 lines), FK to channels and entries, delivery tracking columns |
| `apps/worker/src/index.ts` | Worker entry point with BullMQ Worker and graceful shutdown | VERIFIED | Uses real `processNotification` (not placeholder), SIGTERM/SIGINT handlers, Redis policy validation at startup |
| `apps/api/src/lib/notification-queue.ts` | BullMQ Queue singleton and enqueueNotification helper | VERIFIED | Exports `notificationQueue` and `enqueueNotification`, 5 retries, exponential backoff configured |
| `apps/worker/src/processor.ts` | Job dispatcher routing to channel-specific senders | VERIFIED | 219 lines, handles `entry_created` and `verification_email` types, per-channel fan-out with delivery logging, duplicate prevention on retry |
| `apps/worker/src/senders/email.ts` | Email notification sender via Nodemailer | VERIFIED | Exports `sendEmailNotification`, uses shared transporter, HTML + text body |
| `apps/worker/src/senders/slack.ts` | Slack webhook notification sender | VERIFIED | Exports `sendSlackNotification`, Block Kit mrkdwn, native fetch |
| `apps/worker/src/senders/discord.ts` | Discord webhook notification sender | VERIFIED | Exports `sendDiscordNotification`, embed with blurple color 0x5865f2, native fetch |
| `apps/worker/src/senders/telegram.ts` | Telegram Bot API notification sender | VERIFIED | Exports `sendTelegramNotification`, Markdown formatting, error body included in thrown error |
| `apps/worker/src/senders/webhook.ts` | Generic webhook sender with HMAC-SHA256 signature | VERIFIED | Exports `sendWebhookNotification`, `crypto.createHmac`, timestamp+body signing, correct headers |
| `apps/worker/src/senders/verification-email.ts` | Double opt-in verification email sender | VERIFIED | Exports `sendVerificationEmail`, styled HTML button, `API_URL/verify/${token}` URL |
| `apps/api/src/routes/v1/verify.ts` | GET /verify/:token endpoint | VERIFIED | Exports `createVerifyRoute`, all three failure cases return identical generic error, flips status, enqueues entry_created |
| `packages/trpc/src/routers/notification.ts` | Notification channel CRUD tRPC router | VERIFIED | Exports `notificationRouter` with 7 procedures: list, create, update, delete, regenerateSecret, toggleDoubleOptIn, getDoubleOptIn |
| `apps/web/src/routes/projects/$projectId/notifications.tsx` | Notification settings page | VERIFIED | Full channel management UI, double opt-in toggle with status feedback, secret reveal dialog, edit/delete with confirmation |
| `apps/web/src/components/NotificationChannelForm.tsx` | Per-channel-type configuration forms | VERIFIED | 5 channel types rendered, email list management (add/remove), BotFather help text for Telegram, webhook secret note |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/api/src/lib/notification-queue.ts` | Redis | `new Queue('notifications', ...)` | WIRED | BullMQ Queue constructor with connection config from `REDIS_HOST`/`REDIS_PORT` env vars |
| `apps/worker/src/index.ts` | Redis | `new Worker('notifications', ...)` with `maxRetriesPerRequest: null` | WIRED | Connection object includes `maxRetriesPerRequest: null` at line 14, Worker created at line 36 |
| `packages/db/src/schema/notification-channels.ts` | `packages/db/src/schema/projects.ts` | `projectId` foreign key | WIRED | `.references(() => projects.id, { onDelete: 'cascade' })` at line 12 |
| `apps/api/src/routes/v1/entries.ts` | `apps/api/src/lib/notification-queue.ts` | `enqueueNotification()` call after successful insert | WIRED | Imported at line 9, called on both doubleOptIn and standard paths with `.catch()` for fire-and-forget |
| `apps/worker/src/processor.ts` | `apps/worker/src/senders/*` | switch on channel.type dispatching to sender functions | WIRED | `dispatchToChannel()` switch at lines 143–185 covers all 5 channel types |
| `apps/worker/src/senders/webhook.ts` | Node crypto | HMAC-SHA256 signature computation | WIRED | `import crypto from 'node:crypto'`, `crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex')` |
| `apps/api/src/routes/v1/verify.ts` | `apps/api/src/lib/notification-queue.ts` | `enqueueNotification` after successful verification | WIRED | `enqueueNotification({ type: 'entry_created' }).catch(...)` at line 49 |
| `apps/web/src/routes/projects/$projectId/notifications.tsx` | `packages/trpc/src/routers/notification.ts` | `trpc.notification.*` queries and mutations | WIRED | `trpc.notification.list`, `.getDoubleOptIn`, `.create`, `.update`, `.delete`, `.regenerateSecret`, `.toggleDoubleOptIn` all called |
| `packages/trpc/src/routers/notification.ts` | `packages/db/src/schema/notification-channels.ts` | Drizzle queries on notificationChannels | WIRED | `ctx.db.select().from(notificationChannels)`, inserts, updates, deletes throughout |
| `apps/web/src/routes/projects/$projectId/notifications.tsx` | `apps/web/src/components/NotificationChannelForm.tsx` | Component import for channel config forms | WIRED | `import { NotificationChannelForm }` at line 6, rendered for both add and edit flows |
| `packages/trpc/src/routers/notification.ts` | `packages/db/src/schema/projects.ts` | `doubleOptIn` field on projects | WIRED | `ctx.db.update(projects).set({ doubleOptIn: input.enabled })` in `toggleDoubleOptIn`, `project.doubleOptIn` read in `getDoubleOptIn` |
| `apps/api/src/routes/v1/entries.ts` | `packages/db/src/schema/projects.ts` | checks `project.doubleOptIn` to conditionally set `pending_verification` | WIRED | `if (project.doubleOptIn)` at line 66 — project context includes `doubleOptIn` because `api-key-auth.ts` uses `db.query.projects.findFirst({ with: { fieldConfig: true } })` which returns all columns including the new boolean |
| `packages/trpc/src/router.ts` | `packages/trpc/src/routers/notification.ts` | `notification: notificationRouter` in appRouter | WIRED | Line 16: `notification: notificationRouter` |
| `apps/api/src/index.ts` | `apps/api/src/routes/v1/verify.ts` | verify route mounted before API key middleware | WIRED | `app.route('/verify', createVerifyRoute(db))` at line 35, before `/api/v1/*` middleware |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| NOTF-01 | 04-02, 04-03 | User can configure email notification recipients per project | SATISFIED | `notification.ts` create/update with `emailConfigSchema` (min 1, max 10 recipients); UI form in `NotificationChannelForm.tsx` |
| NOTF-02 | 04-02, 04-03 | User can configure a webhook URL with HMAC signature verification per project | SATISFIED | `sendWebhookNotification` with HMAC-SHA256; `notification.ts` auto-generates secret on create, masks in list, regeneratable; one-time reveal dialog in UI |
| NOTF-03 | 04-02, 04-03 | User can configure a Slack incoming webhook URL per project | SATISFIED | `sendSlackNotification` with Block Kit; `slackConfigSchema` validates URL prefix; `SlackFields` in UI |
| NOTF-04 | 04-02, 04-03 | User can configure a Discord webhook URL per project | SATISFIED | `sendDiscordNotification` with embed; `discordConfigSchema` validates URL prefix; `DiscordFields` in UI |
| NOTF-05 | 04-02, 04-03 | User can configure a Telegram bot notification per project | SATISFIED | `sendTelegramNotification` via Bot API; `telegramConfigSchema` requires botToken + chatId; `TelegramFields` in UI |
| NOTF-06 | 04-01, 04-02 | Notifications are delivered asynchronously via background jobs | SATISFIED | BullMQ queue in API (fire-and-forget), Worker in separate `apps/worker` package, Redis with noeviction policy, 5 retries with exponential backoff |
| NOTF-07 | 04-02, 04-03 | User can enable double opt-in (email verification before entry is active) | SATISFIED | `toggleDoubleOptIn` tRPC mutation + UI toggle; entry route sets `pending_verification` + `verificationToken`; `/verify/:token` endpoint flips to `new`; `sendVerificationEmail` delivers confirmation link |

All 7 requirements for Phase 4 (NOTF-01 through NOTF-07) are satisfied. No orphaned requirements found — all 7 IDs appeared in plans 04-02 and 04-03 frontmatter (NOTF-06 additionally in 04-01).

---

### Anti-Patterns Found

No blockers or warnings found. All sender functions have real implementations:
- No `return null`, empty return stubs, or TODO-only bodies found
- No placeholder processors — `processNotification` is the real dispatcher (219 lines)
- Fire-and-forget pattern is correct: `.catch()` on enqueue, no `await`, API response not blocked
- Verification endpoint uses a single generic error response for all failure cases (correct security pattern, not a stub)
- The `mailer.ts` startup warning for missing `SMTP_HOST` is a deliberate operational guard, not a stub

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/worker/src/senders/mailer.ts` | 11-13 | `console.warn` if SMTP_HOST unset | Info | Correct behavior — warns operator, does not crash. Email delivery requires SMTP config at runtime. |

---

### Human Verification Required

#### 1. Email delivery end-to-end

**Test:** Configure an email channel with a real SMTP server (e.g., Mailgun sandbox) and submit an entry via `POST /api/v1/entries`. Check the recipient inbox.
**Expected:** Email arrives with subject "New entry on {projectName}: {email}", HTML table showing email, name, position.
**Why human:** Nodemailer transporter creation and `sendMail()` are wired correctly in code, but runtime delivery depends on live SMTP credentials that cannot be verified statically.

#### 2. Slack notification delivery

**Test:** Configure a Slack channel with a real incoming webhook URL and submit an entry.
**Expected:** Slack message appears in the target channel with Block Kit mrkdwn formatting and correct entry details.
**Why human:** `fetch()` to the webhook URL is wired but HTTP response from Slack cannot be tested statically.

#### 3. Double opt-in full flow

**Test:** Enable double opt-in for a project, submit an entry, click the verification link in the email.
**Expected:** Entry status transitions from `pending_verification` to `new`; project owner channels receive an `entry_created` notification.
**Why human:** Requires live SMTP for the verification email and a browser to click the link; the database update and enqueue logic are verified statically.

#### 4. Notification settings page rendering

**Test:** Navigate to `/projects/{id}/notifications` in a running browser with a valid session.
**Expected:** Page renders with the double opt-in toggle, channel list (empty or with channels), Add channel dropdown, per-type forms with correct helper text.
**Why human:** React rendering and Tailwind/inline styles cannot be verified statically; TanStack Router route registration and form interactivity require a live browser.

#### 5. Webhook HMAC signature verification

**Test:** Configure a webhook channel, submit an entry, inspect the POST received at the endpoint.
**Expected:** `X-PleaseHold-Signature` and `X-PleaseHold-Timestamp` headers present; signature verifiable with the HMAC-SHA256 algorithm and the stored secret.
**Why human:** HMAC computation code is correct by inspection, but actual HTTP delivery to a real endpoint and signature re-computation require a live environment.

---

### Gaps Summary

No gaps. All 27 must-have items across three plans are verified at all three levels (exists, substantive, wired). All 7 requirements (NOTF-01 through NOTF-07) are satisfied.

The five items in Human Verification are all runtime/browser/external-service concerns that cannot be verified through static code analysis. The automated portion of verification is fully complete.

---

_Verified: 2026-02-26_
_Verifier: Claude (gsd-verifier)_
