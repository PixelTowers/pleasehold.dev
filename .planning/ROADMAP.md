# Roadmap: pleasehold.dev

## Overview

pleasehold.dev goes from zero to a shippable, self-hostable API-first waitlist and demo-booking SaaS in five phases. Phase 1 establishes auth, projects, and API key infrastructure -- the identity and access layer everything else depends on. Phase 2 delivers the core value proposition: external developers can POST entries via the public REST API. Phase 3 gives project owners a real dashboard to view, manage, and export their collected entries. Phase 4 adds the async notification system (email, Slack, webhook, Discord, Telegram) that makes pleasehold worth paying for versus a spreadsheet. Phase 5 packages the whole product for distribution with API documentation and Docker Compose self-hosting.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Auth, Projects, and API Keys** - Account management, project CRUD, and API key infrastructure
- [ ] **Phase 2: Entry Submission API** - Public REST endpoint for external developers to submit waitlist and demo-booking entries
- [ ] **Phase 3: Dashboard and Data Management** - Entry browsing, search, filtering, status management, and CSV export
- [ ] **Phase 4: Notification System** - Async delivery of email, Slack, webhook, Discord, and Telegram notifications via background jobs
- [ ] **Phase 5: Documentation and Self-Hosting** - OpenAPI docs, hosted docs page, and Docker Compose distribution

## Phase Details

### Phase 1: Auth, Projects, and API Keys
**Goal**: Developers can create accounts, set up projects with waitlist or demo-booking mode, configure field collection, and generate scoped API keys -- the identity and access layer that every subsequent phase depends on
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, PROJ-01, PROJ-02, PROJ-03, PROJ-04, KEYS-01, KEYS-02, KEYS-03, KEYS-04
**Success Criteria** (what must be TRUE):
  1. User can create an account, log in, and their session persists across browser refresh without re-authentication
  2. User can create a project, choose waitlist or demo-booking mode, and configure which fields to collect (email required, name/company/message/custom optional)
  3. User can switch between multiple projects in the dashboard and each project shows its own configuration
  4. User can generate an API key with a recognizable `ph_live_` prefix, see it displayed once on creation, and the key is hashed at rest in the database
  5. User can revoke an API key and any subsequent API calls using that key are rejected
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD
- [ ] 01-03: TBD

### Phase 2: Entry Submission API
**Goal**: External developers can submit waitlist and demo-booking entries to pleasehold via a simple authenticated REST endpoint, with validation, deduplication, rate limiting, and queue positioning
**Depends on**: Phase 1
**Requirements**: ENTR-01, ENTR-02, ENTR-03, ENTR-04, ENTR-05, ENTR-06
**Success Criteria** (what must be TRUE):
  1. External developer can POST to `/api/v1/entries` with an API key header and receive a created entry with queue position in the response
  2. API rejects submissions that don't match the project's configured field schema and returns clear validation errors
  3. Submitting the same email twice for the same project returns the existing entry (not a duplicate) with its original queue position
  4. API accepts optional metadata JSON (UTM params, referral source) and stores it alongside the entry
  5. Excessive requests from the same API key receive a 429 response with a Retry-After header
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Dashboard and Data Management
**Goal**: Project owners can browse, search, filter, and manage all collected entries through the dashboard, including status tracking and CSV export for downstream workflows
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. User can view all entries in a table with search and filtering, and see entry count and basic stats at a glance
  2. User can click an entry to view all collected fields, metadata, and submission details
  3. User can set entry status (new, contacted, converted, archived) and bulk-select entries to apply status changes
  4. User can export all entries for a project as a CSV file that opens correctly in spreadsheet applications
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Notification System
**Goal**: Developers receive real-time notifications when new entries arrive, delivered asynchronously through their configured channels (email, Slack, webhook, Discord, Telegram) with reliable background job processing
**Depends on**: Phase 2
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07
**Success Criteria** (what must be TRUE):
  1. User can configure one or more notification channels per project (email recipients, Slack webhook URL, generic webhook URL, Discord webhook URL, Telegram bot) from the dashboard
  2. When a new entry is submitted, configured notification channels receive a notification asynchronously without blocking the API response
  3. Webhook notifications include an HMAC signature header that the receiving server can use to verify authenticity
  4. User can enable double opt-in for a project, and submitters receive a verification email before their entry becomes active
  5. Notifications are processed by a separate background worker, and failed deliveries are retried with backoff
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Documentation and Self-Hosting
**Goal**: The product is fully documented for external developers and can be self-hosted by anyone with a single `docker compose up` command
**Depends on**: Phase 1, Phase 2, Phase 3, Phase 4
**Requirements**: DOCS-01, DOCS-02, INFR-01, INFR-02
**Success Criteria** (what must be TRUE):
  1. API has an OpenAPI spec auto-generated from route definitions, accessible at a public URL
  2. A hosted documentation page exists with curl examples, response samples, and error reference for every public endpoint
  3. Running `docker compose up` with a `.env` file starts the full stack (API, worker, dashboard, PostgreSQL, Redis) and the product is usable
  4. All configuration is controlled via environment variables, documented in a `.env.example` file
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth, Projects, and API Keys | 0/3 | Not started | - |
| 2. Entry Submission API | 0/2 | Not started | - |
| 3. Dashboard and Data Management | 0/2 | Not started | - |
| 4. Notification System | 0/3 | Not started | - |
| 5. Documentation and Self-Hosting | 0/2 | Not started | - |
