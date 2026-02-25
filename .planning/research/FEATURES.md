# Feature Research

**Domain:** API-first waitlist and demo-booking SaaS (developer tools)
**Researched:** 2026-02-25
**Confidence:** MEDIUM-HIGH

Research based on competitor analysis of GetWaitlist, Waitlister, LaunchList, Prefinery, KickoffLabs, QueueForm, Waitwhile, FormSpark, and open-source alternatives (Entrybase, Headless Waitlist, Better Auth Waitlist). Also informed by adjacent products: Cal.com, Calendly (demo booking), and SubmitJSON/FormSpark (form backends).

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. For an API-first developer tool, the "user" is a developer integrating the product.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Email collection via REST API** | The entire product premise. A POST endpoint that accepts at minimum an email address. Every competitor has this. | LOW | Plain REST with API key auth. Must return a clear JSON response. GetWaitlist doesn't even require auth on theirs -- pleasehold should require API key auth for spam protection. |
| **API key authentication** | Developers expect project-scoped API keys. GetWaitlist is unauthenticated (weakness). Stripe, Prefinery, Waitlister all use keys. Without this, anyone can POST garbage to your endpoint. | MEDIUM | Hash keys with prefix (e.g., `ph_live_...`, `ph_test_...`). Store hashed, display once on creation. Per-project scoping is standard. |
| **Configurable fields** | Developers need to control what they collect: email-only, email+name, email+name+company, custom fields. Prefinery supports 15+ fields per user. GetWaitlist supports first_name, last_name, phone, metadata, and custom Q&A. | MEDIUM | Schema-driven field config per project. Store as JSONB. Support text, email, select, and textarea types at minimum. |
| **Two modes: waitlist vs. demo-booking** | This is pleasehold's core concept. The difference is field defaults (demo requests collect company/message) and notification framing ("New waitlist signup" vs. "New demo request from Acme Corp"). | LOW | Config flag on the project entity, not separate product surfaces. Affects default fields and notification templates. |
| **Dashboard to view entries** | Every competitor has a web dashboard to browse, search, and manage collected entries. Developers need to see who signed up. | MEDIUM | Sortable/filterable table. Show all collected fields. Pagination. Basic search by email/name. |
| **Email notifications** | When someone joins the waitlist or requests a demo, the project owner needs to know. Email notification is the baseline every competitor provides. | MEDIUM | BullMQ job on new entry. Configurable per-project: on/off, recipient email(s). Use Resend or similar transactional email service. |
| **Webhook notifications** | Developers expect to pipe events into their own systems. Waitlister, Prefinery, GetWaitlist, FormSpark all offer webhooks. This is table stakes for API-first products. | MEDIUM | POST to configured URL on new entry. Include HMAC SHA-256 signature for verification. Retry with exponential backoff (3 attempts). Support `entry.created` event at minimum. |
| **CSV export** | Every competitor offers data export. Developers will want to pull their data out for analysis, CRM import, or migration. Lock-in without export is a dealbreaker for developer tools. | LOW | Export all entries for a project as CSV. Include all fields. Add to dashboard as a button. |
| **Duplicate detection** | GetWaitlist returns the existing signup when a duplicate email is submitted rather than creating a new entry. This is expected behavior -- nobody wants duplicate entries cluttering their list. | LOW | Unique constraint on (project_id, email). Return existing entry on duplicate submission with appropriate status code (200 vs 201). |
| **Rate limiting on public API** | Any public-facing API endpoint needs rate limiting to prevent abuse. FormSpark, HubSpot, and every serious API product implements this. | MEDIUM | Per-API-key rate limiting using Redis. Sensible defaults (e.g., 60 requests/minute per key). Return 429 with Retry-After header. |
| **Entry count / basic stats** | GetWaitlist exposes `total_signups` and `current_signups` on its API. Dashboard users expect to see how many people are on their waitlist at a glance. | LOW | Count on dashboard home. Trend over time is a differentiator, but raw count is table stakes. |
| **Self-hosting via Docker** | Explicit project requirement. The open-source developer tools market (Cal.com, Supabase, Plausible) has set the expectation that serious open-source tools run with `docker compose up`. | MEDIUM | docker-compose.yml with API, web dashboard, PostgreSQL, Redis. Environment variable configuration. |
| **API documentation** | Developers will not use an undocumented API. GetWaitlist, Waitlister, FormSpark all have clear API docs. For an API-first product, docs ARE the product. | MEDIUM | OpenAPI spec auto-generated from Hono routes. Hosted docs page (can be part of landing site). Include curl examples and response samples. |
| **Spam / bot protection** | FormSpark added enhanced spam classification. Headless Waitlist uses Arcjet for email validation. Disposable email detection and basic bot filtering are expected. | MEDIUM | Validate email format server-side. Optional: block disposable email domains (maintain or use a library for the list). Rate limiting handles volumetric abuse. Honeypot field support in API. |

### Differentiators (Competitive Advantage)

Features that set pleasehold apart. Not required for launch, but create the competitive moat.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **API-first, no widget** | Every competitor (GetWaitlist, LaunchList, Waitlister, QueueForm) is widget-first with API as an afterthought. pleasehold is the reverse: API-first with no embeddable UI. This attracts developers who want full control over their frontend. GetWaitlist's API is unauthenticated and read-heavy; pleasehold's is write-first and authenticated. | LOW (it's a design philosophy, not a feature to build) | The entire positioning. Market as "the Stripe of waitlists" -- you build the UI, we handle the backend. No JavaScript snippet to embed. Just HTTP. |
| **Open source / self-hostable** | Only Entrybase (9 GitHub stars) and a handful of toy projects are open source in this space. Prefinery, GetWaitlist, Waitlister, LaunchList are all closed-source SaaS. Being genuinely open source (like Cal.com for scheduling) is a massive differentiator. | MEDIUM (already a project constraint) | MIT or AGPL license. Real self-hosting story, not "open core with crippled free tier." This is the Cal.com playbook applied to waitlists. |
| **Slack notifications** | Prefinery, Waitlister, and FormSpark offer Slack integration. For developer teams, Slack is where they live. Getting a "New demo request from jane@acme.com" in a Slack channel is high-value and sticky. | LOW | Slack incoming webhook URL configured per-project. Format a rich message with entry details. Deliver via same BullMQ job pipeline as email/webhook. |
| **Test mode / sandbox API keys** | Stripe pioneered `test_` vs `live_` key prefixes. No waitlist competitor offers this. Developers testing their integration shouldn't pollute their real waitlist. | LOW | `ph_test_` keys that write to a separate flag/partition. Test entries visible in dashboard with a "test" badge. Trivial to implement but signals developer empathy. |
| **Entry metadata / custom JSON** | GetWaitlist supports a `metadata` JSON object on signups. Most competitors only support fixed fields. Letting developers attach arbitrary JSON (UTM params, referral source, A/B test variant, page URL) is powerful for developer workflows. | LOW | JSONB column on entry table. Accept `metadata` object in POST body. Display in dashboard entry detail view. Searchable is a future enhancement. |
| **Double opt-in / email verification** | GetWaitlist supports `uses_signup_verification`. GDPR best practice (legally required in Germany, Austria, Switzerland). Most competitors offer it. Sends a confirmation email before the entry is "active." | MEDIUM | Verification token flow: entry created as "unverified," email sent with confirm link, entry marked "verified" on click. Configurable per-project (on/off). |
| **Multi-project support** | A single pleasehold account can manage multiple waitlists/demo forms across different products. Prefinery supports this as "campaigns." Most tools assume one waitlist per account at lower tiers. | LOW | Already implied by project-scoped API keys. Dashboard shows project switcher. This is an architectural decision, not a feature to bolt on. |
| **Bulk actions on entries** | Mark entries as "contacted," "converted," "archived." Simple status management that CRMs do but waitlist tools mostly don't. | MEDIUM | Status enum on entries (new, contacted, converted, archived). Bulk select + action in dashboard. Useful for demo-booking mode where sales follows up manually. |
| **Entry position / queue number** | GetWaitlist tracks `priority` for each signup. LaunchList and QueueForm gamify this with referral-based position advancement. Even without referrals, showing "You are #47 on the waitlist" is a common pattern. | LOW | Auto-incrementing position per project. Returned in API response so developers can show it in their UI. Position is informational, not used for referral mechanics (that's an anti-feature for v1). |
| **OpenAPI / Swagger spec** | Most waitlist tools have informal docs. Providing a machine-readable OpenAPI spec means developers can auto-generate clients in any language. Signals API maturity. | LOW | Generate from Hono route definitions. Serve at `/api/openapi.json`. Reference in docs. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. pleasehold should explicitly NOT build these, at least not in v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Embeddable widget / JavaScript snippet** | Every competitor offers a drop-in widget. Seems like table stakes. | This is pleasehold's core differentiator. Adding a widget means maintaining frontend code for every framework, dealing with CSS conflicts, bundle size, CORS, and iframe issues. It dilutes the API-first positioning. GetWaitlist, LaunchList, and Waitlister already dominate the widget space. | Provide excellent API docs with copy-paste code examples for React, Vue, vanilla JS, and curl. The developer builds their own form; that's the point. |
| **Referral / viral loop system** | LaunchList, QueueForm, KickoffLabs, and Prefinery all have referral mechanics where users move up by referring others. It's the #1 "growth hack" feature in this space. | Referral systems are complex: tracking cookies, unique referral links, fraud detection, leaderboard ranking algorithms, reward tiers. Prefinery has 17 years of experience here. Building a mediocre referral system is worse than not having one. It's also orthogonal to pleasehold's value prop (API backend, not growth marketing). | Expose the data needed for developers to build their own referral logic: entry creation timestamps, referral source via metadata, and webhook events. Don't build the referral engine. |
| **Email marketing / drip campaigns** | Prefinery offers "unlimited email automations." GetWaitlist has email marketing built in. QueueForm has email sequences. | Email marketing is an entire product category (Resend, Loops, ConvertKit, Mailchimp). Building a mediocre email editor, template system, send scheduling, and deliverability monitoring is a massive distraction. | Provide webhook notifications so developers can pipe new entries to their preferred email tool. Expose a clean API to query entries for integration with existing email platforms. |
| **Landing page builder** | KickoffLabs, QueueForm, and Waitlister offer built-in landing page builders/templates. | Landing page builders are commoditized. Developers using an API-first tool have their own site already. Building a page builder means maintaining a drag-and-drop editor, template library, hosting, and custom domains. Enormous scope for marginal value. | The Astro landing site for pleasehold.dev itself serves as marketing. Developers integrate the API into THEIR landing pages. |
| **Calendar / scheduling integration** | Demo booking naturally leads to "just connect to Google Calendar." Cal.com and Calendly dominate this space with deep calendar integrations. | Calendar integration is a product in itself. OAuth flows for Google/Outlook, timezone handling, availability windows, conflict resolution, rescheduling, cancellation. Cal.com has raised millions to solve this. pleasehold captures intent ("I want a demo"); the owner follows up manually or uses their own scheduling tool. | Clearly position demo-booking mode as "intent capture, not scheduling." In notification templates, include a CTA like "Schedule a call with [name] at [email]." |
| **Real-time updates (WebSocket/SSE)** | Dashboard could show entries appearing in real time. Feels modern. | WebSocket infrastructure adds complexity (connection management, reconnection logic, state sync). For a dashboard that most users check a few times a day, polling or manual refresh is fine. The juice isn't worth the squeeze for v1. | Manual refresh button. Optional: polling every 30s on the dashboard entries page. Add real-time later if user demand emerges. |
| **Payment processing / paid waitlist** | Some waitlist tools let you charge for priority access or early access deposits. | Payment adds PCI compliance concerns, Stripe integration complexity, refund handling, and tax implications. Completely orthogonal to the core value prop. | Out of scope. If users want paid waitlists, they can use the webhook to trigger a Stripe Checkout session in their own backend. |
| **Mobile app** | Waitwhile has a mobile app. Users might want push notifications on their phone. | Building and maintaining iOS + Android apps (or even React Native) for a dashboard that works fine as a responsive web app is massive overhead. Cal.com just launched their iOS app in Jan 2026 after years of development. | Responsive dashboard that works on mobile browsers. Slack notifications serve as the "mobile push" equivalent. |
| **AI features** | Cal.com has AI scheduling assistants. Trendy to add "AI" to everything. | AI features require LLM integration, prompt engineering, ongoing cost management, and the features are often gimmicky. A waitlist/demo-booking backend doesn't have a natural AI use case. | Skip entirely. If anything, AI-friendly means having a clean API that AI agents can call -- which pleasehold already is by being API-first. |

---

## Feature Dependencies

```
[Auth & Accounts]
    └──requires──> [Dashboard Infrastructure]
                       └──requires──> [Entry Viewing]
                       └──requires──> [Project Management]

[Project Management]
    └──requires──> [API Key Generation]
                       └──requires──> [Public REST API]
                                          └──requires──> [Entry Submission]

[Entry Submission]
    └──requires──> [Configurable Fields]
    └──requires──> [Duplicate Detection]
    └──requires──> [Rate Limiting]

[Entry Submission] ──triggers──> [Notification System]
    └──branch──> [Email Notifications]
    └──branch──> [Webhook Notifications]
    └──branch──> [Slack Notifications]

[Notification System]
    └──requires──> [BullMQ Job Queue]

[CSV Export] ──requires──> [Entry Viewing]

[Double Opt-in] ──requires──> [Entry Submission] + [Email Notifications]

[Test Mode Keys] ──requires──> [API Key Generation]

[Bulk Actions] ──requires──> [Entry Viewing]

[Self-Hosting] ──requires──> [All Core Infrastructure]
```

### Dependency Notes

- **API Key Generation requires Project Management:** Keys are scoped to projects. You need projects before you can issue keys.
- **Public REST API requires API Key Generation:** The submission endpoint authenticates via API key. Key infra must exist first.
- **Notification System requires BullMQ:** All notifications (email, webhook, Slack) are delivered asynchronously via the job queue. Redis + BullMQ must be set up before any notification channel works.
- **Double Opt-in requires Email Notifications:** Verification emails are sent through the same email pipeline. Email must work before verification can be layered on.
- **Test Mode Keys enhance API Key Generation:** Test keys are a variant of regular keys. The key system must exist first, then test mode is a flag/partition addition.
- **CSV Export requires Entry Viewing:** Export is a projection of the same data the dashboard displays. The data access layer must exist.
- **Self-Hosting requires everything:** Docker compose bundles the whole stack. It's built last (or continuously) once all services are defined.

---

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate that developers will use an API-first waitlist/demo-booking backend.

- [ ] **Auth & account creation** -- Developers need to sign up and log in. Better Auth handles this.
- [ ] **Project creation with mode selection** -- Create a project, choose "waitlist" or "demo-booking" mode.
- [ ] **Configurable fields per project** -- Choose which fields to collect (email required, name/company/message optional, custom fields).
- [ ] **API key generation** -- Generate project-scoped API keys from the dashboard.
- [ ] **Public REST API for entry submission** -- `POST /api/v1/entries` with API key auth. Accept configured fields. Return entry with position.
- [ ] **Duplicate detection** -- Return existing entry for duplicate email submissions.
- [ ] **Rate limiting** -- Per-key rate limiting on the public API.
- [ ] **Dashboard entry viewer** -- Browse, search, and view all collected entries.
- [ ] **Email notifications** -- Notify project owner(s) when new entries arrive.
- [ ] **Webhook notifications** -- POST to a configured URL with HMAC signature on new entries.
- [ ] **CSV export** -- Export all entries as CSV from the dashboard.
- [ ] **API documentation** -- OpenAPI spec + hosted docs with curl examples.
- [ ] **Basic spam protection** -- Email format validation, rate limiting, disposable email blocking.
- [ ] **Docker compose self-hosting** -- `docker compose up` runs the full stack.

### Add After Validation (v1.x)

Features to add once the core is working and real developers are using it.

- [ ] **Slack notifications** -- Add when users request it. Low complexity, high value for developer teams.
- [ ] **Test mode / sandbox keys** -- Add when developers report annoyance testing against their live waitlist.
- [ ] **Double opt-in / email verification** -- Add when GDPR compliance becomes a user concern or when targeting European markets.
- [ ] **Entry metadata (custom JSON)** -- Add when power users want to attach UTM params or custom data.
- [ ] **Bulk status actions** -- Add when demo-booking users need to track which leads they've contacted.
- [ ] **Entry position in API response** -- Add when developers ask for queue position to display in their UI.
- [ ] **Multi-user team access** -- Add when teams (not just solo developers) adopt the product.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Advanced analytics dashboard** -- Signups over time, conversion funnel, source tracking. Defer because basic counts suffice for validation.
- [ ] **Zapier / Make integration** -- Native integration marketplace listing. Defer because webhooks cover 90% of automation needs.
- [ ] **Custom email templates for notifications** -- Let project owners customize notification email content. Defer because default templates work for v1.
- [ ] **GDPR data deletion API** -- Programmatic entry deletion for compliance. Defer to v2 but design the data model to support it from day one.
- [ ] **Audit log** -- Track who did what in the dashboard. Defer because it's enterprise-grade complexity.
- [ ] **Multiple notification rules** -- Different notifications for different entry types or field values. Defer because single notification config is sufficient initially.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Public REST API for entry submission | HIGH | MEDIUM | P1 |
| API key generation (project-scoped) | HIGH | MEDIUM | P1 |
| Auth & account creation | HIGH | MEDIUM | P1 |
| Project creation (waitlist/demo mode) | HIGH | LOW | P1 |
| Configurable fields per project | HIGH | MEDIUM | P1 |
| Dashboard entry viewer | HIGH | MEDIUM | P1 |
| Email notifications | HIGH | MEDIUM | P1 |
| Webhook notifications | HIGH | MEDIUM | P1 |
| Rate limiting | HIGH | MEDIUM | P1 |
| Duplicate detection | HIGH | LOW | P1 |
| CSV export | MEDIUM | LOW | P1 |
| API documentation (OpenAPI) | HIGH | LOW | P1 |
| Spam/bot protection | MEDIUM | MEDIUM | P1 |
| Docker compose self-hosting | HIGH | MEDIUM | P1 |
| Slack notifications | MEDIUM | LOW | P2 |
| Test mode / sandbox keys | MEDIUM | LOW | P2 |
| Double opt-in / email verification | MEDIUM | MEDIUM | P2 |
| Entry metadata (custom JSON) | MEDIUM | LOW | P2 |
| Bulk status actions | MEDIUM | MEDIUM | P2 |
| Entry position in API response | LOW | LOW | P2 |
| Multi-user team access | MEDIUM | HIGH | P2 |
| Advanced analytics | MEDIUM | HIGH | P3 |
| Zapier/Make integration | LOW | MEDIUM | P3 |
| Custom email templates | LOW | MEDIUM | P3 |
| GDPR deletion API | MEDIUM | LOW | P3 |
| Audit log | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | GetWaitlist | Prefinery | LaunchList | Waitlister | FormSpark | pleasehold (plan) |
|---------|-------------|-----------|------------|------------|-----------|-------------------|
| **Primary model** | Widget-first, API secondary | Widget + API | Widget-first | Widget + API | Form backend | API-first, no widget |
| **Auth on public API** | None (unauthenticated) | API key (paid tier) | Webhook-based | API key (paid tier) | Form ID in URL | API key (all tiers) |
| **Custom fields** | Q&A + metadata JSON | 15+ fields | Standard fields | Standard + custom | Any HTML form field | Schema-driven per project |
| **Referral system** | Yes (viral loop) | Advanced (17yr mature) | Gamified rewards | Basic referrals | No | No (by design) |
| **Email marketing** | Built-in | Unlimited automations | Welcome emails | Welcome + broadcast | No | No (use webhooks) |
| **Webhook support** | No (API polling) | Yes | Yes (Zapier) | Yes + HMAC signing | Yes | Yes + HMAC signing |
| **Slack notification** | No | Yes | Yes (via Zapier) | Yes | Yes (via Zapier) | Yes (native) |
| **Analytics** | Basic counts | 55+ data points | 15 data points | Basic + Pro tier | Submission count | Basic counts (v1) |
| **CSV export** | Unknown | Yes | Yes | Yes | Yes (CSV + JSON) | Yes |
| **Self-hostable** | No | No | No | No | No | Yes (Docker) |
| **Open source** | No | No | No | No | No | Yes |
| **Landing page builder** | No | No (by design) | No | Yes | No | No (by design) |
| **Double opt-in** | Yes | Unknown | Unknown | Unknown | No | Planned (v1.x) |
| **Test/sandbox mode** | No | No | No | No | No | Planned (v1.x) |
| **Pricing** | Free + paid tiers | $49-499/mo | $29-79 one-time | Free + $19 one-time | Pay per submission | Free (self-host) + hosted |
| **Demo booking mode** | No (waitlist only) | No (waitlist only) | No (waitlist only) | No (waitlist only) | Generic forms | Yes (native mode) |

### Key Competitive Gaps pleasehold Fills

1. **No open-source, self-hostable option exists** in the waitlist space. Entrybase has 9 GitHub stars and is barely functional. pleasehold would be the first real open-source waitlist tool, following the Cal.com playbook.

2. **No API-first tool exists.** Every competitor is widget-first. Developers who want full control over their frontend have to reverse-engineer widget APIs or use generic form backends like FormSpark (which has no waitlist-specific features).

3. **No tool combines waitlist + demo-booking.** Every waitlist tool is waitlist-only. Demo booking requires a separate tool (Calendly, Cal.com) or a generic form. pleasehold offers both modes on the same platform.

4. **Authenticated public APIs are rare.** GetWaitlist's API is completely unauthenticated. Most tools treat the API as a secondary concern. pleasehold's API-key-authenticated REST API is a better developer experience.

5. **Test/sandbox mode doesn't exist** in any competitor. Developers testing integrations pollute their real data.

---

## Sources

- [GetWaitlist](https://getwaitlist.com/) -- API docs, feature analysis (MEDIUM confidence)
- [GetWaitlist API Docs](https://getwaitlist.com/docs/api-docs/waitlist) -- Endpoint details, field support (HIGH confidence, official docs)
- [GetWaitlist Signup API](https://getwaitlist.com/docs/api-docs/waiter) -- Signup endpoint details (HIGH confidence, official docs)
- [Prefinery](https://www.prefinery.com/) -- Feature comparison, pricing (MEDIUM confidence)
- [Prefinery Feature Comparison](https://www.prefinery.com/blog/waitlist-software-comparison-how-prefinery-stacks-up-against-the-competition/) -- Detailed competitor analysis (MEDIUM confidence)
- [Prefinery Pre-Launch Tools Comparison](https://www.prefinery.com/blog/pre-launch-email-signup-tools-a-comprehensive-comparison-for-2025/) -- Feature matrix across tools (MEDIUM confidence)
- [LaunchList](https://getlaunchlist.com/) -- Features, pricing model (MEDIUM confidence)
- [Waitlister](https://waitlister.me/) -- Feature overview, pricing (MEDIUM confidence)
- [QueueForm](https://www.queueform.com/) -- Viral referral features (MEDIUM confidence)
- [FormSpark](https://formspark.io/) -- Form backend features (MEDIUM confidence)
- [Waitwhile](https://waitwhile.com/) -- Queue management features (MEDIUM confidence, different market segment)
- [GitHub Waitlist Topic](https://github.com/topics/waitlist) -- Open source landscape (HIGH confidence)
- [Headless Waitlist (GitHub)](https://github.com/topics/waitlist) -- Open source with email validation + rate limiting (MEDIUM confidence)
- [Cal.com vs Calendly](https://fluentbooking.com/articles/cal-com-vs-calendly/) -- Demo booking space overview (MEDIUM confidence)
- [GetApp Waitlist Software](https://www.getapp.com/customer-management-software/waitlist/f/api/) -- Market overview (LOW confidence, aggregator)

---
*Feature research for: API-first waitlist and demo-booking SaaS*
*Researched: 2026-02-25*
