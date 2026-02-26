# Phase 4: Notification System - Research

**Researched:** 2026-02-26
**Domain:** Background job processing, multi-channel notifications (email, Slack, webhook, Discord, Telegram), HMAC signature verification, double opt-in email verification
**Confidence:** HIGH (BullMQ and Nodemailer verified via official docs; webhook APIs verified via official platform docs; architecture patterns verified against existing codebase)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NOTF-01 | User can configure email notification recipients per project | New `notification_channels` table with `type='email'` rows storing recipient list as JSON array; tRPC `notification.upsertChannel` mutation; dashboard settings UI |
| NOTF-02 | User can configure a webhook URL with HMAC signature verification per project | `notification_channels` row with `type='webhook'`, stores URL + auto-generated HMAC secret; webhook sender computes `crypto.createHmac('sha256', secret)` on payload body; signature sent in `X-PleaseHold-Signature` header |
| NOTF-03 | User can configure a Slack incoming webhook URL per project | `notification_channels` row with `type='slack'`; sender POSTs JSON `{ text, blocks }` to Slack webhook URL via native `fetch()` |
| NOTF-04 | User can configure a Discord webhook URL per project | `notification_channels` row with `type='discord'`; sender POSTs JSON `{ content, embeds }` to Discord webhook URL via native `fetch()` |
| NOTF-05 | User can configure a Telegram bot notification per project | `notification_channels` row with `type='telegram'` storing bot token + chat ID; sender POSTs to `https://api.telegram.org/bot<token>/sendMessage` via native `fetch()` |
| NOTF-06 | Notifications are delivered asynchronously via background jobs | BullMQ queue (`notifications`) with Redis connection; entry submission route enqueues job after successful insert; separate worker process picks up jobs and dispatches to channel-specific senders |
| NOTF-07 | User can enable double opt-in (email verification before entry is active) | Boolean `doubleOptIn` flag on project; new `verification_token` + `verified_at` columns on entries table; entry created with `status='pending_verification'`; verification email sent via BullMQ job; click-through endpoint flips status to `new` |

</phase_requirements>

---

## Summary

Phase 4 adds the async notification pipeline that transforms pleasehold from a data-collection tool into a real-time awareness system. When a new entry is submitted via the Phase 2 REST API, the system enqueues a notification job to a BullMQ queue backed by the existing Redis instance (already running in `docker-compose.dev.yml` on port 6380). A separate worker process (`apps/worker`) picks up jobs and dispatches notifications to each channel the project owner has configured: email via Nodemailer, Slack/Discord/Telegram via native `fetch()` to their respective webhook/bot APIs, and generic webhooks with HMAC-SHA256 signature verification.

The notification channel configuration lives in a new `notification_channels` table (one row per channel per project, with a JSONB `config` column for channel-specific settings). The dashboard settings page gets a new "Notifications" section where owners can add, edit, and remove channels. Double opt-in (NOTF-07) is the most complex feature: it adds verification state tracking to the entries table and a public verification endpoint that confirms email ownership before the entry becomes active.

The architecture is intentionally simple: one BullMQ queue, one worker with channel-specific sender functions, exponential backoff retries (5 attempts, starting at 5 seconds), and a `notification_logs` table for delivery auditing. No heavy SDKs are needed for any channel -- Slack, Discord, and Telegram are all plain HTTP POST calls with different JSON body shapes. Node 22's built-in `fetch()` and `crypto` modules handle all HTTP and HMAC operations without external dependencies beyond BullMQ, ioredis, and Nodemailer.

**Primary recommendation:** Add BullMQ + ioredis + Nodemailer as dependencies, create an `apps/worker` process that runs alongside the API server, add a `notification_channels` table to the DB schema, and hook the entry submission route to enqueue notification jobs after successful inserts. Keep channel senders as plain functions (not classes) that accept a channel config and entry payload -- this makes them trivially testable and composable.

---

## Standard Stack

### Core (new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `bullmq` | ^5.x | Redis-backed job queue | Industry standard for Node.js background jobs; built on Redis Streams; supports retries, backoff, concurrency, events ([BullMQ docs](https://docs.bullmq.io/)) |
| `ioredis` | ^5.x | Redis client (BullMQ peer dependency) | Required by BullMQ; provides connection pooling, auto-reconnect, cluster support |
| `nodemailer` | ^6.x | Email transport (SMTP) | Zero-dependency email library; standard for Node.js email sending; supports HTML + plain text ([Nodemailer](https://nodemailer.com/)) |

### Core (already installed, reused)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hono` | ^4.12.2 | HTTP server (verification endpoint) | Already serves API; add `/api/v1/verify/:token` route |
| `drizzle-orm` | ^0.45.1 | New tables + queries | Already used for all schema work |
| `zod` | ^3.25.76 | Input validation for channel configs | Already used in tRPC routers |
| Node.js `crypto` | built-in | HMAC-SHA256 computation | No external dependency needed; `crypto.createHmac` + `crypto.timingSafeEqual` |
| Node.js `fetch` | built-in (Node 22) | HTTP calls to Slack/Discord/Telegram | No external HTTP client needed; project requires Node >= 22 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BullMQ | `pg-boss` (Postgres-backed) | Avoids Redis dependency but loses Redis Streams performance; pleasehold already has Redis running |
| BullMQ | `graphile-worker` (Postgres-backed) | Same tradeoff; Redis is already in the stack and BullMQ is more widely adopted |
| Nodemailer | Resend SDK / Postmark SDK | Vendor-specific; Nodemailer is transport-agnostic (works with any SMTP provider including self-hosted) |
| Native `fetch()` | `@slack/webhook` SDK | SDK is 50KB+ for a single POST call; `fetch()` is sufficient and already available |
| Native `fetch()` | `discord.js` | Massive library for a single webhook POST; completely unnecessary |
| Native `fetch()` | `telegraf` / `node-telegram-bot-api` | Full bot frameworks for a single `sendMessage` call; overkill |

**Installation:**
```bash
# apps/worker (new package)
pnpm add bullmq ioredis nodemailer
pnpm add @types/nodemailer -D

# apps/api (add BullMQ for job enqueue only)
pnpm add bullmq ioredis

# packages/db (no new deps -- just new schema files)
```

---

## Architecture Patterns

### Recommended Project Structure

```
pleasehold/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── index.ts                    # Add notification queue init + verification route
│   │       ├── routes/v1/
│   │       │   ├── entries.ts              # Modified: enqueue notification job after insert
│   │       │   └── verify.ts              # New: email verification endpoint for double opt-in
│   │       └── lib/
│   │           └── notification-queue.ts   # Queue singleton + enqueue helper
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       │   └── NotificationChannelForm.tsx  # Channel config forms
│   │       └── routes/projects/$projectId/
│   │           └── notifications.tsx       # Notification settings page
│   └── worker/                            # New: background job processor
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                   # Worker entry point
│           ├── processor.ts               # Job dispatcher (routes to channel senders)
│           └── senders/
│               ├── email.ts               # Nodemailer sender
│               ├── slack.ts               # Slack webhook sender
│               ├── discord.ts             # Discord webhook sender
│               ├── telegram.ts            # Telegram Bot API sender
│               ├── webhook.ts             # Generic webhook + HMAC sender
│               └── verification-email.ts  # Double opt-in verification email sender
├── packages/
│   └── db/
│       └── src/schema/
│           ├── notification-channels.ts   # New table
│           └── entries.ts                 # Modified: add verification columns
```

### Pattern 1: BullMQ Queue + Worker Separation

**What:** The API server (producer) enqueues jobs; a separate worker process (consumer) processes them.
**When to use:** Any async work that should not block the API response.

```typescript
// Source: https://docs.bullmq.io/guide/connections
// apps/api/src/lib/notification-queue.ts
import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6380),
};

export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
});

export interface NotificationJobData {
  entryId: string;
  projectId: string;
  type: 'entry_created' | 'verification_email';
}

export async function enqueueNotification(data: NotificationJobData) {
  await notificationQueue.add(data.type, data);
}
```

```typescript
// Source: https://docs.bullmq.io/guide/workers
// apps/worker/src/index.ts
import { Worker } from 'bullmq';
import { processNotification } from './processor';

const worker = new Worker('notifications', processNotification, {
  connection: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6380),
    maxRetriesPerRequest: null, // REQUIRED for workers
  },
  concurrency: 5,
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

// Graceful shutdown
const shutdown = async () => {
  await worker.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

### Pattern 2: Channel-Specific Sender Functions

**What:** Each notification channel has a pure function that takes config + payload and performs delivery.
**When to use:** For all five channel types (email, Slack, Discord, Telegram, webhook).

```typescript
// apps/worker/src/senders/slack.ts
export interface SlackChannelConfig {
  webhookUrl: string;
}

export async function sendSlackNotification(
  config: SlackChannelConfig,
  entry: { email: string; name?: string; position: number; projectName: string },
) {
  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `New ${entry.projectName} signup: ${entry.email}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*New entry on ${entry.projectName}*\nEmail: ${entry.email}${entry.name ? `\nName: ${entry.name}` : ''}\nPosition: #${entry.position}`,
          },
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
  }
}
```

### Pattern 3: HMAC Webhook Signature

**What:** Generic webhook payloads are signed with a per-channel HMAC secret. The receiving server can verify authenticity.
**When to use:** NOTF-02 -- generic webhook channel.

```typescript
// Source: https://hookdeck.com/webhooks/guides/how-to-implement-sha256-webhook-signature-verification
// apps/worker/src/senders/webhook.ts
import crypto from 'node:crypto';

export interface WebhookChannelConfig {
  url: string;
  secret: string; // auto-generated on channel creation, displayed once to user
}

export async function sendWebhookNotification(
  config: WebhookChannelConfig,
  payload: Record<string, unknown>,
) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signaturePayload = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', config.secret)
    .update(signaturePayload)
    .digest('hex');

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PleaseHold-Signature': signature,
      'X-PleaseHold-Timestamp': timestamp,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
  }
}
```

### Pattern 4: Entry Submission Hook (Producer Side)

**What:** After a successful new entry insert, enqueue a notification job.
**When to use:** Modification to `apps/api/src/routes/v1/entries.ts`.

```typescript
// apps/api/src/routes/v1/entries.ts (modification)
// After successful insert (insertResult.length > 0):
if (insertResult.length > 0) {
  const entry = insertResult[0];

  // Fire-and-forget: enqueue notification job without blocking response
  enqueueNotification({
    entryId: entry.id,
    projectId: project.id,
    type: 'entry_created',
  }).catch((err) => console.error('Failed to enqueue notification:', err));

  return c.json({ data: { /* ... */ } }, 201);
}
```

### Pattern 5: Notification Channel Schema

**What:** Single table for all channel types with a discriminated JSONB config column.
**When to use:** For storing per-project notification settings.

```typescript
// packages/db/src/schema/notification-channels.ts
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const notificationChannels = pgTable('notification_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['email', 'slack', 'discord', 'telegram', 'webhook'],
  }).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Pattern 6: Double Opt-In Verification Flow

**What:** Entries require email confirmation before becoming active. Submitter receives an email with a verification link.
**When to use:** NOTF-07 -- when project owner enables double opt-in.

```
Submitter POSTs entry
  → Entry created with status='pending_verification'
  → Verification token generated (crypto.randomUUID())
  → Token stored on entry row (verification_token column, expires in 48h)
  → Verification email enqueued (BullMQ job type='verification_email')
  → API responds with entry + status='pending_verification'

Submitter clicks verification link
  → GET /api/v1/verify/:token
  → Token looked up, expiry checked
  → Entry status flipped to 'new', verification_token cleared
  → Redirect to a success page or JSON success response
  → Entry-created notification NOW enqueued for project owner channels
```

### Anti-Patterns to Avoid

- **Sending notifications synchronously in the request handler:** Blocks the API response. Even a single slow webhook URL makes the entire submission take seconds. Always enqueue and return immediately.
- **Using a single notification_channels row for all channels:** Each channel type needs its own row with its own enabled flag. A project might want email ON but Slack OFF.
- **Storing HMAC webhook secrets in plaintext in job payloads:** The worker should read the secret from the database at delivery time, not from the job data. Job data may be visible in monitoring tools.
- **Skipping the timestamp in HMAC signatures:** Without a timestamp, captured signatures can be replayed indefinitely. Include a timestamp in the signed payload and document the 5-minute tolerance window.
- **Using heavy SDKs for simple webhook POSTs:** `@slack/webhook`, `discord.js`, `telegraf` are all massive libraries for what amounts to a single HTTP POST call per notification. Use native `fetch()`.
- **Running the worker in the same process as the API:** A slow or crashing worker should not take down the API server. Separate processes with separate resource limits.
- **Not validating Redis `maxmemory-policy` at startup:** BullMQ requires `noeviction`. The default `allkeys-lru` silently drops queued jobs under memory pressure. Check at startup and log a warning.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job queue with retries/backoff | Custom Redis pub/sub + retry logic | BullMQ | Handles at-least-once delivery, exponential backoff, job events, dead letter, concurrency limits; ~3000 lines of battle-tested code |
| Email sending + SMTP | Raw `net.Socket` SMTP implementation | Nodemailer | Handles TLS, authentication, connection pooling, encoding, attachments; zero-dependency |
| HMAC computation | Custom hash function | Node.js `crypto.createHmac` | Built-in, audited, uses OpenSSL under the hood; `crypto.timingSafeEqual` prevents timing attacks |
| Job scheduling/cron | Custom `setInterval` polling | BullMQ repeatable jobs | If future requirements need periodic checks; already available in BullMQ |
| Redis connection management | Custom reconnect logic | ioredis auto-reconnect | Exponential backoff reconnection built into ioredis; BullMQ relies on it |

**Key insight:** The entire notification pipeline requires only three new npm packages (BullMQ, ioredis, Nodemailer). All five channel senders are plain `fetch()` calls or Nodemailer transporter calls -- there is no need for any channel-specific SDK.

---

## Common Pitfalls

### Pitfall 1: Redis maxmemory-policy Not Set to noeviction

**What goes wrong:** Under memory pressure, Redis evicts BullMQ's internal keys (job data, queue metadata). Jobs silently disappear. Notifications are never delivered.
**Why it happens:** The default Redis policy is `allkeys-lru` or `volatile-lru`, which evicts keys when maxmemory is reached. BullMQ's keys look like any other keys to Redis.
**How to avoid:** Validate Redis `maxmemory-policy` at worker startup. Run `INFO memory` or `CONFIG GET maxmemory-policy` and log a warning if not `noeviction`. Add `maxmemory-policy noeviction` to the Redis config in docker-compose.
**Warning signs:** Job counts in BullMQ dashboard don't match expected submissions; notifications stop arriving under load.

### Pitfall 2: Worker maxRetriesPerRequest Not Set to null

**What goes wrong:** BullMQ throws an exception at startup: "maxRetriesPerRequest must be null."
**Why it happens:** ioredis defaults `maxRetriesPerRequest` to 20. BullMQ Workers require it set to `null` because they need infinite retry behavior for blocking Redis commands (BRPOPLPUSH).
**How to avoid:** Always pass `maxRetriesPerRequest: null` in the connection options when creating Worker instances. Queue instances (producer side) can keep the default.
**Warning signs:** Worker process crashes immediately on startup with a clear error message.

### Pitfall 3: Notification Enqueue Blocking the API Response

**What goes wrong:** If the Redis connection is down, `queue.add()` hangs or throws, and the entry submission returns a 500 error even though the entry was successfully created in PostgreSQL.
**Why it happens:** The enqueue call is awaited in the request handler without a timeout or catch.
**How to avoid:** Use fire-and-forget: `.catch(err => console.error(...))` on the enqueue promise. The entry is the primary value; notification delivery is best-effort. If Redis is temporarily down, the entry still succeeds and the notification is lost (acceptable for v1; compensated by the notification_logs audit trail for future retry).
**Warning signs:** Entry submissions fail with Redis connection errors despite PostgreSQL being healthy.

### Pitfall 4: HMAC Signature Without Timestamp Enables Replay Attacks

**What goes wrong:** An attacker captures a webhook delivery and replays it hours later. The receiving server accepts it as valid because the HMAC signature is still correct.
**Why it happens:** The signature covers only the body, not a timestamp. There's no freshness guarantee.
**How to avoid:** Include a Unix timestamp in the signed payload (`${timestamp}.${body}`). Send the timestamp in a `X-PleaseHold-Timestamp` header. Document that receivers should reject signatures older than 5 minutes.
**Warning signs:** Webhook consumers see duplicate events with identical signatures at different times.

### Pitfall 5: Double Opt-In Verification Token Leaks Entry Existence

**What goes wrong:** An attacker submits arbitrary emails and uses the verification endpoint to probe which emails are already in the system.
**Why it happens:** Different response codes for "token not found" vs. "token expired" vs. "already verified" reveal information.
**How to avoid:** Return the same generic response for all failure cases: `{ message: "Verification link is invalid or expired" }`. Do not distinguish between "email not submitted" and "already verified."
**Warning signs:** Different HTTP status codes or error messages for different verification failure modes.

### Pitfall 6: Nodemailer Transport Not Configured Causes Silent Failures

**What goes wrong:** The worker starts and processes email notification jobs, but no emails are actually sent. The transport is created with empty credentials.
**Why it happens:** SMTP environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) are not set. Nodemailer doesn't throw on creation -- it throws on `sendMail()`.
**How to avoid:** Validate SMTP configuration at worker startup. If email channel is configured for any project but SMTP env vars are missing, log a clear warning. The worker should still process other channel types.
**Warning signs:** Email notification jobs fail with "ECONNREFUSED" or authentication errors.

---

## Code Examples

### BullMQ Queue Creation with Production Settings

```typescript
// Source: https://docs.bullmq.io/guide/going-to-production
import { Queue } from 'bullmq';

export const notificationQueue = new Queue('notifications', {
  connection: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6380),
  },
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,    // 5s, 10s, 20s, 40s, 80s
    },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
});
```

### BullMQ Worker with Graceful Shutdown

```typescript
// Source: https://docs.bullmq.io/guide/workers
import { Worker, type Job } from 'bullmq';

const worker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    // Dispatch to channel-specific senders based on job data
    await processNotification(job.data);
  },
  {
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6380),
      maxRetriesPerRequest: null,
    },
    concurrency: 5,
  },
);

worker.on('error', (err) => console.error('Worker error:', err));

const shutdown = async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

### Nodemailer Email Sender

```typescript
// Source: https://nodemailer.com/
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT ?? 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmailNotification(
  recipients: string[],
  entry: { email: string; name?: string; position: number; projectName: string },
) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'notifications@pleasehold.dev',
    to: recipients.join(', '),
    subject: `New entry on ${entry.projectName}: ${entry.email}`,
    text: `New entry received:\n\nEmail: ${entry.email}${entry.name ? `\nName: ${entry.name}` : ''}\nPosition: #${entry.position}`,
    html: `<h2>New entry on ${entry.projectName}</h2><p><strong>Email:</strong> ${entry.email}</p>${entry.name ? `<p><strong>Name:</strong> ${entry.name}</p>` : ''}<p><strong>Position:</strong> #${entry.position}</p>`,
  });
}
```

### Discord Webhook Sender

```typescript
// Source: https://docs.discord.com/developers/resources/webhook
export async function sendDiscordNotification(
  webhookUrl: string,
  entry: { email: string; name?: string; position: number; projectName: string },
) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `New entry on **${entry.projectName}**`,
      embeds: [
        {
          title: 'New Entry',
          fields: [
            { name: 'Email', value: entry.email, inline: true },
            ...(entry.name ? [{ name: 'Name', value: entry.name, inline: true }] : []),
            { name: 'Position', value: `#${entry.position}`, inline: true },
          ],
          color: 0x5865f2, // Discord blurple
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status}`);
  }
}
```

### Telegram Bot API Sender

```typescript
// Source: https://core.telegram.org/bots/api#sendmessage
export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  entry: { email: string; name?: string; position: number; projectName: string },
) {
  const text = `New entry on *${entry.projectName}*\n\nEmail: ${entry.email}${entry.name ? `\nName: ${entry.name}` : ''}\nPosition: #${entry.position}`;

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Telegram API failed: ${response.status} ${JSON.stringify(error)}`);
  }
}
```

### Verification Email for Double Opt-In

```typescript
// apps/worker/src/senders/verification-email.ts
export async function sendVerificationEmail(
  transporter: nodemailer.Transporter,
  entry: { email: string; verificationToken: string; projectName: string },
) {
  const verifyUrl = `${process.env.API_URL}/api/v1/verify/${entry.verificationToken}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@pleasehold.dev',
    to: entry.email,
    subject: `Confirm your submission to ${entry.projectName}`,
    text: `Please confirm your submission by clicking: ${verifyUrl}\n\nThis link expires in 48 hours.`,
    html: `<h2>Confirm your submission</h2><p>Click the button below to confirm your submission to <strong>${entry.projectName}</strong>:</p><p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Confirm Submission</a></p><p style="color:#6b7280;font-size:0.875rem;">This link expires in 48 hours.</p>`,
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bull (npm `bull`) | BullMQ (npm `bullmq`) | 2021-2022 | BullMQ uses Redis Streams (not lists); better performance, TypeScript-first, active development |
| Custom job tables in PostgreSQL | BullMQ with Redis | N/A | Redis Streams handle job lifecycle, visibility timeouts, and retry state natively |
| Heavy SDK per notification channel | Native `fetch()` for webhooks | Node 18+ (2022) | No need for `@slack/webhook`, `discord.js`, `telegraf` for simple one-way POST calls |
| Separate Redis library (node-redis) | ioredis | 2023+ | ioredis is BullMQ's required driver; better cluster support, auto-reconnect |

**Deprecated/outdated:**
- `bull` (npm): Predecessor to BullMQ; still functional but BullMQ is the recommended successor with better TypeScript support and Redis Streams architecture
- `agenda` (MongoDB-backed): Not applicable -- project uses PostgreSQL + Redis, not MongoDB
- `node-redis` as BullMQ driver: BullMQ requires ioredis specifically

---

## Open Questions

1. **SMTP provider for production email sending**
   - What we know: Nodemailer is transport-agnostic and works with any SMTP server (Mailgun, SendGrid, Postmark, AWS SES, self-hosted)
   - What's unclear: Which SMTP provider the project will use in production
   - Recommendation: Use environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) so the provider is swappable. For local dev, use Mailpit or similar SMTP capture tool. Decision can be deferred to deployment time.

2. **Webhook secret display pattern**
   - What we know: Generic webhook channels need an HMAC secret that the receiver uses to verify signatures
   - What's unclear: Whether to auto-generate the secret (like API keys -- shown once) or let the user provide their own
   - Recommendation: Auto-generate with `crypto.randomBytes(32).toString('hex')` and show once on creation (Stripe pattern, matching the existing API key UX). User can regenerate if needed.

3. **Notification log retention policy**
   - What we know: Need a `notification_logs` table for delivery auditing and debugging
   - What's unclear: How long to retain logs; whether to expose them in the dashboard
   - Recommendation: Store last 30 days of logs with a periodic cleanup job. Show delivery status in dashboard as a simple success/failure indicator per channel. Full log details available for debugging.

4. **Double opt-in redirect destination**
   - What we know: Verification link needs to redirect somewhere after confirming
   - What's unclear: Whether to redirect to a pleasehold-hosted thank-you page or allow project owners to configure a custom redirect URL
   - Recommendation: Default to a simple JSON response `{ verified: true }` for the API-first ethos. Optionally allow a `redirectUrl` in project config for owners who want to redirect to their own page.

---

## Sources

### Primary (HIGH confidence)
- [BullMQ Official Documentation](https://docs.bullmq.io/) — Workers, connections, retries, going to production
- [BullMQ Going to Production Guide](https://docs.bullmq.io/guide/going-to-production) — Redis noeviction, maxRetriesPerRequest, graceful shutdown
- [BullMQ Retry Documentation](https://docs.bullmq.io/guide/retrying-failing-jobs) — Exponential backoff configuration with code examples
- [Nodemailer Official Site](https://nodemailer.com/) — SMTP transport, sendMail API, configuration
- [Slack Incoming Webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks) — POST format, JSON body structure, Block Kit
- [Discord Webhook API](https://docs.discord.com/developers/resources/webhook) — Execute endpoint, embeds, content limits
- [Telegram Bot API sendMessage](https://core.telegram.org/bots/api#sendmessage) — Endpoint format, required parameters, parse_mode
- Existing codebase: `apps/api/src/routes/v1/entries.ts`, `docker-compose.dev.yml`, `packages/db/src/schema/`

### Secondary (MEDIUM confidence)
- [Hookdeck HMAC Signature Guide](https://hookdeck.com/webhooks/guides/how-to-implement-sha256-webhook-signature-verification) — SHA-256 HMAC implementation pattern, timestamp inclusion
- [Authgear HMAC Guide](https://www.authgear.com/post/generate-verify-hmac-signatures) — Node.js crypto.createHmac usage, timingSafeEqual

### Tertiary (LOW confidence)
- SMTP provider selection — deferred to deployment; Nodemailer works with any provider
- Telegram rate limits — documented as ~30 messages/second/chat but exact current limits not verified against official source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — BullMQ, ioredis, Nodemailer all verified via official docs; versions confirmed against npm
- Architecture: HIGH — Producer/consumer pattern is textbook BullMQ; webhook formats verified against platform docs
- Channel sender implementations: HIGH — Slack, Discord, Telegram webhook formats verified against official documentation
- HMAC webhook signing: HIGH — Standard SHA-256 HMAC pattern verified via multiple authoritative sources
- Double opt-in flow: MEDIUM — Pattern is well-established but implementation details (redirect behavior, token format) require decisions
- Pitfalls: HIGH — Redis noeviction concern already identified in STATE.md; maxRetriesPerRequest documented in BullMQ production guide

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (BullMQ and channel APIs are stable; recheck only if upgrading major versions)
