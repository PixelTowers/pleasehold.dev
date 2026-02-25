# Requirements: pleasehold.dev

**Defined:** 2026-02-25
**Core Value:** Developers can add a waitlist or demo-booking form to any landing page in minutes by hitting an API — no backend work, no form infrastructure, just a token and a POST request.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can create an account with email and password
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **AUTH-03**: User can log out from any page

### Projects

- [ ] **PROJ-01**: User can create a project with a name and mode (waitlist or demo-booking)
- [ ] **PROJ-02**: User can manage multiple projects from a single account
- [ ] **PROJ-03**: User can configure which fields to collect per project (email required, name/company/message optional, custom fields)
- [ ] **PROJ-04**: User can switch between projects in the dashboard

### API Keys

- [ ] **KEYS-01**: User can generate project-scoped API keys from the dashboard
- [ ] **KEYS-02**: API keys use a recognizable prefix format (`ph_live_...`)
- [ ] **KEYS-03**: User can revoke API keys
- [ ] **KEYS-04**: API keys are hashed at rest and displayed only once on creation

### Entry Submission

- [ ] **ENTR-01**: External user can submit an entry via `POST /api/v1/entries` with API key auth
- [ ] **ENTR-02**: API validates submitted fields against project configuration
- [ ] **ENTR-03**: Duplicate email submissions return the existing entry (not a new one)
- [ ] **ENTR-04**: API accepts optional metadata JSON (UTM params, referral source, etc.)
- [ ] **ENTR-05**: API returns entry with queue position in response
- [ ] **ENTR-06**: Rate limiting enforced per API key (429 with Retry-After header)

### Dashboard

- [ ] **DASH-01**: User can browse, search, and filter entries in a table view
- [ ] **DASH-02**: User can view entry details (all collected fields + metadata)
- [ ] **DASH-03**: User can see entry count and basic stats at a glance
- [ ] **DASH-04**: User can export all entries as CSV
- [ ] **DASH-05**: User can set entry status (new, contacted, converted, archived)
- [ ] **DASH-06**: User can bulk-select entries and apply status changes

### Notifications

- [ ] **NOTF-01**: User can configure email notification recipients per project
- [ ] **NOTF-02**: User can configure a webhook URL with HMAC signature verification per project
- [ ] **NOTF-03**: User can configure a Slack incoming webhook URL per project
- [ ] **NOTF-04**: User can configure a Discord webhook URL per project
- [ ] **NOTF-05**: User can configure a Telegram bot notification per project
- [ ] **NOTF-06**: Notifications are delivered asynchronously via background jobs
- [ ] **NOTF-07**: User can enable double opt-in (email verification before entry is active)

### Documentation

- [ ] **DOCS-01**: API has an OpenAPI spec auto-generated from route definitions
- [ ] **DOCS-02**: Hosted docs page with curl examples and response samples

### Infrastructure

- [ ] **INFR-01**: Product runs via `docker compose up` with PostgreSQL and Redis
- [ ] **INFR-02**: Environment variables control all configuration for self-hosting

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### API Extras

- **TEST-01**: Test/sandbox API keys (`ph_test_...`) that don't pollute real data
- **SPAM-01**: Disposable email domain blocking
- **SPAM-02**: Honeypot field support in API

### Dashboard Extras

- **ANAL-01**: Signups over time chart
- **TEAM-01**: Multi-user team access to projects

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Embeddable widget / JS snippet | API-first positioning — developers build their own forms |
| Referral / viral loop system | Deep, mature feature space — expose data for devs to build their own |
| Email marketing / drip campaigns | Use webhooks to pipe to existing email tools |
| Landing page builder | Developers already have their own sites |
| Calendar integration | pleasehold captures intent, owner follows up manually |
| Payment processing | Not core to waitlist/demo value |
| Mobile app | Responsive web dashboard + Slack/Discord notifications suffice |
| Real-time WebSocket/SSE | Manual refresh / polling is fine for v1 |
| AI features | API-first design is already AI-agent friendly |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| PROJ-01 | Phase 1 | Pending |
| PROJ-02 | Phase 1 | Pending |
| PROJ-03 | Phase 1 | Pending |
| PROJ-04 | Phase 1 | Pending |
| KEYS-01 | Phase 1 | Pending |
| KEYS-02 | Phase 1 | Pending |
| KEYS-03 | Phase 1 | Pending |
| KEYS-04 | Phase 1 | Pending |
| ENTR-01 | Phase 2 | Pending |
| ENTR-02 | Phase 2 | Pending |
| ENTR-03 | Phase 2 | Pending |
| ENTR-04 | Phase 2 | Pending |
| ENTR-05 | Phase 2 | Pending |
| ENTR-06 | Phase 2 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| DASH-05 | Phase 3 | Pending |
| DASH-06 | Phase 3 | Pending |
| NOTF-01 | Phase 4 | Pending |
| NOTF-02 | Phase 4 | Pending |
| NOTF-03 | Phase 4 | Pending |
| NOTF-04 | Phase 4 | Pending |
| NOTF-05 | Phase 4 | Pending |
| NOTF-06 | Phase 4 | Pending |
| NOTF-07 | Phase 4 | Pending |
| DOCS-01 | Phase 5 | Pending |
| DOCS-02 | Phase 5 | Pending |
| INFR-01 | Phase 5 | Pending |
| INFR-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after roadmap creation*
