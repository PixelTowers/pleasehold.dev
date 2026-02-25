# Pitfalls Research

**Domain:** API-first waitlist/demo-booking SaaS (open source, self-hostable)
**Researched:** 2026-02-25
**Confidence:** HIGH (multiple verified sources per pitfall)

## Critical Pitfalls

### Pitfall 1: API Keys Exposed in Client-Side Code

**What goes wrong:**
Developers integrating pleasehold embed their API key directly in frontend JavaScript. The key is visible in browser DevTools, page source, or bundled JS. Attackers extract the key and spam the waitlist with fake entries, exhaust rate limits, or harvest data from the project.

**Why it happens:**
pleasehold is API-first with no embeddable widget. Developers POST from their frontend forms directly to the pleasehold API. Unlike server-side integrations, browser-based calls inherently expose the API key. The product's simplicity ("just a token and a POST") actively encourages this pattern.

**How to avoid:**
- Design API keys with two tiers from day one: **publishable keys** (limited to entry submission only, rate-limited per IP, domain-restricted via allowed origins) and **secret keys** (full CRUD, dashboard operations, never sent to browsers).
- Enforce allowed-origin restrictions on publishable keys so they only work from the developer's registered domains.
- Add IP-based rate limiting on the submission endpoint regardless of API key validity.
- Document the publishable vs. secret key distinction prominently in API docs.

**Warning signs:**
- No distinction between "read" and "write" key capabilities in the schema.
- API key grants access to both submission and data retrieval endpoints.
- No domain/origin restriction field on the API key model.

**Phase to address:**
Phase 1 (Foundation) -- API key model and authentication middleware must enforce this split from the start. Retrofitting key scoping after launch is a breaking change for every integrator.

---

### Pitfall 2: Missing Tenant Data Isolation (Cross-Project Data Leaks)

**What goes wrong:**
A bug in query filtering exposes one developer's waitlist entries to another developer. Every database query that forgets a `WHERE project_id = ?` clause becomes a data leak. In a product handling user PII (emails, names, companies), this is a compliance and trust catastrophe.

**Why it happens:**
With shared-database multi-tenancy (which is correct for pleasehold's scale), tenant isolation is enforced purely through application-level query filtering. Drizzle ORM does not automatically inject tenant scoping -- every query must include it manually. As the codebase grows, it only takes one forgotten filter in one new feature.

**How to avoid:**
- Create a data access layer (DAL) that wraps all entry/project queries and injects `project_id` filtering automatically. Never query the entries table directly from route handlers.
- Use Drizzle's `.$dynamic()` or query builder patterns to create base queries that always include the project scope.
- Add integration tests that specifically assert cross-tenant isolation: create two projects, insert entries in both, verify that queries for project A never return project B's data.
- Use PostgreSQL Row-Level Security (RLS) as a defense-in-depth layer if the product grows beyond MVP.

**Warning signs:**
- Route handlers contain raw Drizzle queries against the entries table without going through a scoped DAL.
- No integration tests covering cross-tenant data boundaries.
- "Quick fix" queries added during debugging that bypass the DAL.

**Phase to address:**
Phase 1 (Foundation) -- The DAL pattern must be established when the first database queries are written. Adding it later requires auditing and rewriting every existing query.

---

### Pitfall 3: BullMQ Redis Misconfiguration Causing Lost Notifications

**What goes wrong:**
Notifications (email, Slack, webhooks) silently disappear. Redis evicts BullMQ keys under memory pressure, workers lose locks and jobs become "stalled" permanently, or completed jobs accumulate unbounded until Redis OOMs.

**Why it happens:**
Redis defaults to `allkeys-lru` eviction policy. BullMQ requires `noeviction`. This is well-documented in BullMQ's production guide but easy to miss because Redis "works" initially with default settings -- the failure only appears under load or over time. Additionally, workers that don't handle graceful shutdown create stalled jobs that may never recover.

**How to avoid:**
- Set `maxmemory-policy noeviction` in Redis configuration and validate this at application startup (fail-fast if misconfigured).
- Configure job auto-removal: `removeOnComplete: { age: 86400, count: 1000 }` and `removeOnFail: { age: 604800 }` to prevent unbounded growth.
- Set `maxRetriesPerRequest: null` on worker Redis connections to prevent IORedis from throwing on reconnect.
- Implement graceful shutdown: listen for SIGINT/SIGTERM, call `worker.close()`, and wait for active jobs to complete.
- In docker-compose.yml, configure Redis with explicit maxmemory and noeviction policy, and configure container health checks.

**Warning signs:**
- No Redis configuration in docker-compose.yml beyond the default image.
- No job removal configuration on queue definitions.
- Workers created without `maxRetriesPerRequest: null`.
- No graceful shutdown handler in the API process.

**Phase to address:**
Phase 2 (Notifications) -- Must be correct from the moment BullMQ is introduced. The docker-compose.yml Redis service needs proper configuration, and the worker setup needs production-ready defaults.

---

### Pitfall 4: Webhook Delivery Without Retry, Idempotency, or Failure Visibility

**What goes wrong:**
Developer configures a webhook URL. pleasehold fires it once. The developer's server is temporarily down. The webhook is lost forever. The developer never knows they missed an entry. When webhooks do retry, the developer's endpoint processes the same entry twice, creating duplicate records in their system.

**Why it happens:**
Webhook delivery seems simple ("just POST to a URL") but production-grade delivery requires exponential backoff retries, dead-letter queues, delivery status tracking, idempotency keys, and timeout handling. Most MVP implementations skip all of these, creating a system that works in demos but fails silently in production.

**How to avoid:**
- Implement exponential backoff with jitter: delays of 10s, 30s, 1m, 5m, 30m, 2h (6 attempts over ~3 hours).
- Include an `X-Webhook-ID` header with a unique event ID so receivers can deduplicate.
- Include an `X-Webhook-Signature` header (HMAC-SHA256 of the payload with a per-project signing secret) so receivers can verify authenticity.
- Store delivery attempts with status codes in a `webhook_deliveries` table, visible in the dashboard.
- After all retries exhausted, mark as failed and surface in dashboard with a "retry" button.
- Set a strict timeout (10 seconds) on outgoing webhook requests to prevent worker stalls.

**Warning signs:**
- No `webhook_deliveries` or `notification_logs` table in the schema.
- Webhook dispatch is a fire-and-forget HTTP call with no retry logic.
- No signing secret field on the project/webhook configuration model.
- No timeout on the outgoing fetch/HTTP client.

**Phase to address:**
Phase 2 (Notifications) -- Webhook delivery architecture must be designed with retries from the start. Bolting on retry logic and delivery tracking after the initial implementation requires reworking the entire job processing pipeline.

---

### Pitfall 5: No Rate Limiting on Public Submission Endpoint

**What goes wrong:**
The `POST /api/v1/entries` endpoint has no rate limiting. An attacker (or bot) floods a developer's waitlist with thousands of fake entries. The developer's notification channels (email, Slack) are overwhelmed with spam. Redis/BullMQ queues back up. The database fills with junk data that is difficult to distinguish from real signups.

**Why it happens:**
Rate limiting is often deferred as a "later" concern. The submission endpoint is designed to be simple and low-friction. But this endpoint is public-facing (called from unknown frontend forms across the internet) and is the primary attack surface. Without rate limiting, it's trivially abusable.

**How to avoid:**
- Implement tiered rate limiting from Phase 1:
  - Per-IP: 5 submissions per minute (prevents scripted abuse).
  - Per-API-key: 100 submissions per minute (prevents key compromise floods).
  - Global: 1000 submissions per minute per project (backstop).
- Use Redis for rate limit state (already available for BullMQ).
- Return `429 Too Many Requests` with `Retry-After` header.
- Add optional CAPTCHA/challenge support for developers who want extra protection.
- Consider email uniqueness constraints per project to prevent duplicate submissions.

**Warning signs:**
- The submission endpoint has no middleware between authentication and the handler.
- No rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) in API responses.
- Redis is only used for BullMQ, not for rate limiting state.

**Phase to address:**
Phase 1 (Foundation) -- Rate limiting middleware must exist on the public submission endpoint before any external developer integrates. Adding it later risks breaking existing integrations that depend on unlimited submission rates.

---

### Pitfall 6: GDPR/Privacy Non-Compliance as a Data Processor

**What goes wrong:**
pleasehold collects PII (emails, names, company names) on behalf of its customers (the developers). Under GDPR, pleasehold is a data processor, and the developers are data controllers. Without proper handling, pleasehold violates GDPR requirements for both itself and its customers, exposing both parties to regulatory risk.

**Why it happens:**
Developer tools that "just store emails" underestimate their regulatory obligations. GDPR applies to any service processing EU residents' data regardless of where the service is hosted. The self-hosted option adds complexity: who is the processor when the developer runs the software themselves?

**How to avoid:**
- Design data models with deletion in mind from day one: hard-delete capabilities for entries, not just soft-delete.
- Implement a data export endpoint (CSV is already planned -- ensure it exports ALL data for a given entry, including metadata).
- Add a data deletion API endpoint so developers can programmatically purge specific entries.
- Store only what's needed: never log full entry payloads in application logs.
- Encrypt PII at rest in the database (email addresses at minimum).
- Add a retention policy configuration per project: auto-delete entries older than N days.
- For the hosted version: prepare a Data Processing Agreement (DPA) template.

**Warning signs:**
- No "delete entry" endpoint in the API design.
- Application logs contain email addresses or entry data.
- No discussion of data retention in project configuration options.
- Entry data stored in plain text without encryption consideration.

**Phase to address:**
Phase 1 (Foundation) -- Data model must support deletion and export from the start. The entry schema should include a `created_at` timestamp (for retention policies) and the DAL must support complete purging. Retrofitting deletion into a schema that assumes data is permanent requires migration headaches.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single API key type (no pub/secret split) | Simpler auth implementation | Every integrator must choose between security and convenience; breaking change to fix | Never -- design two key types from day one |
| Inline notification dispatch (no job queue) | Faster initial implementation | Submission endpoint latency spikes, no retry capability, no delivery tracking | Never -- BullMQ is already in the stack |
| Hardcoded email templates | Ship notifications faster | Every template change requires a code deploy; self-hosters can't customize | MVP only -- add configurable templates in Phase 3 |
| No API versioning (no `/v1/` prefix) | Cleaner URLs | Every breaking change affects all integrators simultaneously; no migration path | Never -- add `/v1/` prefix from the first endpoint |
| Skipping webhook signature verification | Faster webhook setup for developers | Developers can't verify webhook authenticity; security-conscious users won't adopt | Never -- HMAC signing is cheap to implement |
| Environment variables for all config | Simple Docker setup | Dozens of env vars become unmanageable; no validation, silent misconfiguration | MVP only -- add a config file option for self-hosters by Phase 3 |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Email (Resend/SES/SMTP) | Sending from an unverified domain; no SPF/DKIM setup | Require domain verification before enabling email notifications; document DNS requirements; use a verified default sender for the hosted version |
| Slack | Using incoming webhook URLs (which can be revoked without notification) without status checking | Store webhook URL, test connectivity on save, handle 404/410 responses gracefully, surface broken integrations in dashboard |
| Redis | Using default Redis config without persistence; losing all queued jobs on restart | Enable AOF persistence, set `maxmemory-policy noeviction`, configure in docker-compose.yml |
| PostgreSQL | Not setting connection pool limits; exhausting connections under load | Use a connection pooler or set explicit pool size (10-20 for API, 5 for workers); configure `max_connections` in PostgreSQL |
| Docker Compose networking | Hardcoding `localhost` for service connections | Use Docker service names (`redis`, `postgres`) as hostnames; document that `localhost` doesn't work in Docker networking |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded entry listing (no pagination) | Dashboard freezes loading entries; API response times spike | Default pagination (50 items) on all list endpoints; cursor-based pagination for large datasets | 1,000+ entries per project |
| Synchronous notification dispatch in request handler | Submission endpoint latency grows with each notification channel | Always dispatch notifications via BullMQ jobs; return 201 immediately after entry creation | First integration with slow webhook endpoint |
| No database indexes on frequently filtered columns | Queries slow down as entry count grows | Add indexes on `(project_id, created_at)`, `(project_id, email)`, `(api_key)` from the start | 10,000+ entries across projects |
| Loading all entries for CSV export into memory | OOM errors on large exports; worker crashes | Stream results using database cursor; write CSV rows incrementally | 50,000+ entries in a single export |
| Single BullMQ queue for all notification types | Slow webhook deliveries (retrying failed endpoints) block email/Slack notifications | Use separate queues: `email`, `slack`, `webhook` with independent concurrency | First webhook endpoint with >5s response time |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| API key stored in plain text in database | Database breach exposes all API keys; attacker can impersonate any developer's project | Hash API keys (SHA-256) before storage; only show full key once at creation time; store a prefix for identification |
| No CORS restriction on submission endpoint | Any website can submit entries to any project if they have the API key | Enforce `Access-Control-Allow-Origin` based on allowed origins configured per API key |
| Webhook payloads contain full entry data sent over HTTP | Man-in-the-middle attacks can intercept PII in transit | Always use HTTPS for webhook delivery; refuse to deliver to HTTP URLs; include HMAC signature |
| No input validation on custom fields | XSS payloads stored in entries displayed in dashboard; SQL injection via malicious field values | Validate and sanitize all input; escape output in dashboard; enforce field type constraints and length limits |
| Secret keys in docker-compose.yml committed to git | Self-hosters accidentally push credentials to public repos | Use `.env` file with `.env.example` template; never put real values in docker-compose.yml; document this prominently |
| No brute-force protection on authentication endpoints | Attacker brute-forces developer account passwords | Rate limit login attempts per IP (5 per minute); implement account lockout after 10 failures; Better Auth may handle this -- verify |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| API key shown only in a flash message after creation | Developer copies it wrong or misses it; must regenerate | Show key in a dedicated modal with a copy button; only dismiss when user confirms they saved it |
| No feedback when notifications fail | Developer thinks everything works; misses waitlist signups for days | Dashboard badge showing failed notification count; email alert after 3+ consecutive failures |
| Requiring account creation before seeing the product | Developers bounce before understanding the value | Public API docs and a sandbox/playground mode; let developers try a submission before creating an account |
| No entry deduplication feedback | Same email submitted twice shows as two entries; developer's waitlist count is inflated | Return a clear response distinguishing "new entry" (201) from "already exists" (200/409); add dedup toggle per project |
| Unclear error messages on API responses | Developer wastes time debugging integrations | Return structured errors: `{ "error": { "code": "RATE_LIMITED", "message": "...", "retry_after": 60 } }` |
| No onboarding flow showing integration code | Developer reads docs, switches to IDE, copies wrong endpoint | Dashboard shows project-specific integration snippets with the actual API key and endpoint pre-filled |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **API Key Authentication:** Often missing key rotation (revoke old, generate new without downtime) -- verify that multiple active keys per project are supported
- [ ] **Entry Submission:** Often missing input validation on custom fields -- verify max field count, max field value length, and type enforcement
- [ ] **Email Notifications:** Often missing bounce/complaint handling -- verify that invalid email addresses don't keep triggering send attempts
- [ ] **Webhook Delivery:** Often missing timeout handling -- verify that a hanging webhook endpoint doesn't block the worker indefinitely
- [ ] **CSV Export:** Often missing proper escaping -- verify that entries containing commas, quotes, and newlines export correctly
- [ ] **Dashboard Entry List:** Often missing search/filter -- verify that developers can search by email or filter by date range
- [ ] **Docker Self-Hosting:** Often missing health checks -- verify that `docker-compose ps` shows healthy services and containers restart on failure
- [ ] **API Documentation:** Often missing error response examples -- verify that every endpoint documents its error cases, not just success
- [ ] **Database Migrations:** Often missing rollback plan -- verify that each migration can be reversed (manually, since Drizzle lacks auto-rollback)

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| API keys exposed (no pub/secret split) | HIGH | Issue new key types via migration; deprecate old keys with a sunset period; notify all developers; provide migration guide |
| Cross-tenant data leak discovered | HIGH | Immediate incident response; audit all queries; implement DAL if missing; notify affected developers; consider RLS as additional safety layer |
| BullMQ Redis data loss (wrong eviction policy) | MEDIUM | Fix Redis config; lost jobs cannot be recovered; replay from `entries` table by re-enqueueing notifications for entries created during the outage window |
| Webhook deliveries silently failing | MEDIUM | Add delivery tracking table; backfill delivery status for recent entries; add dashboard visibility; notify affected developers |
| Spam flood on submission endpoint | LOW-MEDIUM | Add rate limiting; purge spam entries (need criteria to distinguish from real); consider requiring email verification step |
| GDPR deletion request with no delete capability | HIGH | Emergency implementation of delete endpoint; manual database surgery in the interim; potential regulatory exposure during the gap |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| API key client-side exposure | Phase 1 (Foundation) | Two key types in schema; publishable key restricted to submission endpoint only; integration test confirming secret key required for data access |
| Cross-tenant data isolation | Phase 1 (Foundation) | DAL with automatic project_id scoping; integration tests with two projects asserting no data leakage |
| BullMQ Redis misconfiguration | Phase 2 (Notifications) | Redis config in docker-compose.yml includes `noeviction`; startup check validates Redis policy; worker has graceful shutdown |
| Webhook delivery reliability | Phase 2 (Notifications) | Delivery tracking table exists; retry logic with exponential backoff; dashboard shows delivery status; webhook signing implemented |
| Rate limiting on submissions | Phase 1 (Foundation) | Rate limit middleware on submission endpoint; `429` responses with `Retry-After`; rate limit headers in all responses |
| GDPR/privacy compliance | Phase 1 (Foundation) | Delete endpoint exists; no PII in logs; data export works; retention policy field on project model |
| Email deliverability | Phase 2 (Notifications) | Domain verification flow for email notifications; SPF/DKIM documentation; separate transactional email handling from notification processing |
| Drizzle migration safety | Phase 1 (Foundation) | Migration files committed to git; never use `push` in production; CI validates migrations run cleanly against a fresh database |
| No API versioning | Phase 1 (Foundation) | All public endpoints under `/v1/` prefix from day one |
| Input validation gaps | Phase 1 (Foundation) | Zod schemas on all input; max lengths enforced; integration tests with malicious payloads |

## Sources

- [BullMQ Going to Production Guide](https://docs.bullmq.io/guide/going-to-production) -- Official documentation on production configuration requirements (HIGH confidence)
- [BullMQ Troubleshooting](https://docs.bullmq.io/guide/troubleshooting) -- Common issues with missing locks and environment variables (HIGH confidence)
- [API Keys: The Complete 2025 Guide](https://dev.to/hamd_writer_8c77d9c88c188/api-keys-the-complete-2025-guide-to-security-management-and-best-practices-3980) -- API key security best practices (MEDIUM confidence)
- [Stop Leaking API Keys: BFF Pattern](https://blog.gitguardian.com/stop-leaking-api-keys-the-backend-for-frontend-bff-pattern-explained/) -- Client-side API key exposure patterns (MEDIUM confidence)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) -- REST API security fundamentals (HIGH confidence)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) -- Migration management and rollback limitations (HIGH confidence)
- [WorkOS Multi-Tenant Architecture Guide](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture) -- Tenant isolation patterns (MEDIUM confidence)
- [Docker Compose Secrets Best Practices](https://docs.docker.com/compose/how-tos/use-secrets/) -- Docker secret management (HIGH confidence)
- [Docker Compose Environment Variable Best Practices](https://docs.docker.com/compose/how-tos/environment-variables/best-practices/) -- Configuration management (HIGH confidence)
- [Webhook Best Practices Guide](https://inventivehq.com/blog/webhook-best-practices-guide) -- Webhook delivery patterns (MEDIUM confidence)
- [Hookdeck: Webhooks at Scale](https://hookdeck.com/blog/webhooks-at-scale) -- Production webhook delivery lessons (MEDIUM confidence)
- [GDPR Compliance for B2B SaaS](https://complydog.com/blog/gdpr-compliance-checklist-complete-guide-b2b-saas-companies) -- GDPR compliance requirements for SaaS (MEDIUM confidence)
- [Hono CORS Middleware](https://hono.dev/docs/middleware/builtin/cors) -- CORS configuration for Hono (HIGH confidence)
- [Hono CORS Vary Header Vulnerability](https://advisories.gitlab.com/pkg/npm/hono/GHSA-q7jf-gf43-6x6p/) -- Known security issue requiring Hono >=4.10.3 (HIGH confidence)
- [Cloudflare Rate Limiting Best Practices](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/) -- Rate limiting patterns (HIGH confidence)
- [Zuplo: 10 Best Practices for API Rate Limiting](https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025) -- Rate limiting implementation (MEDIUM confidence)
- [Mailgun: State of Email Deliverability 2025](https://www.mailgun.com/blog/deliverability/state-of-deliverability-takeaways/) -- Email deliverability landscape (MEDIUM confidence)
- [FusionAuth: Building Self-Hostable Applications](https://fusionauth.io/blog/building-self-hostable-application) -- Self-hosting architecture patterns (MEDIUM confidence)

---
*Pitfalls research for: pleasehold.dev -- API-first waitlist/demo-booking SaaS*
*Researched: 2026-02-25*
