# Roadmap: pleasehold.dev

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-02-26)
- **v1.1 QA & Hardening** — Phases 6-9 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) — SHIPPED 2026-02-26</summary>

- [x] Phase 1: Auth, Projects, and API Keys (3/3 plans) — completed 2026-02-25
- [x] Phase 2: Entry Submission API (2/2 plans) — completed 2026-02-25
- [x] Phase 3: Dashboard and Data Management (3/3 plans) — completed 2026-02-25
- [x] Phase 4: Notification System (3/3 plans) — completed 2026-02-26
- [x] Phase 5: Documentation and Self-Hosting (2/2 plans) — completed 2026-02-26

Full details: `milestones/v1.0-ROADMAP.md`

</details>

### v1.1 QA & Hardening

**Milestone Goal:** Manually QA every user flow, fix all bugs and tech debt from v1.0 — leave the product solid before building new features.

- [x] **Phase 6: Code Fixes** - Fix router, integration, and cleanup issues from v1.0 audit
- [ ] **Phase 7: Build and Config** - Fix local build, Docker migrations, and SMTP config clarity
- [ ] **Phase 8: Test Harness** - Enable integration tests for entry submission with seeded DB
- [ ] **Phase 9: QA Verification** - Walk through every E2E flow like a real developer

## Phase Details

### Phase 6: Code Fixes
**Goal**: All known code-level issues from the v1.0 audit are resolved — navigation is type-safe, integration gaps are closed, dead code is removed
**Depends on**: Phase 5 (v1.0 shipped)
**Requirements**: ROUT-01, ROUT-02, INTG-01, INTG-02, CLEN-01, CLEN-02
**Success Criteria** (what must be TRUE):
  1. Unauthenticated users are redirected to login via TanStack Router navigate — no full-page reloads via window.location.href
  2. Clicking an entry in the dashboard navigates using TanStack Router type-safe links — no template string URLs
  3. Worker service in Docker uses the correct API_URL for verification email links (not hardcoded localhost)
  4. Dashboard status filter dropdown includes "pending_verification" and correctly isolates those entries
  5. No dead exports remain in @pleasehold/auth — verifyProjectKey and authMiddleware are removed or wired up
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Fix router redirects, type-safe entry navigation, and pending_verification filter
- [x] 06-02-PLAN.md — Add worker API_URL, remove dead auth exports, proxy /health through nginx

### Phase 7: Build and Config
**Goal**: The build pipeline works locally and in Docker without workarounds, and missing config produces clear guidance instead of silent failure
**Depends on**: Phase 6
**Requirements**: BILD-01, BILD-02, BILD-03
**Success Criteria** (what must be TRUE):
  1. Running `pnpm build --filter @pleasehold/api` succeeds locally and produces a runnable artifact
  2. Docker build does not depend on the gitignored drizzle/ migrations directory — migrations are generated as part of the build or migration step
  3. Starting the API without SMTP_HOST configured produces a clear, actionable warning that tells the developer exactly what will not work and how to fix it
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Add tsup configs for API and worker local builds, improve SMTP missing-config warning
- [ ] 07-02-PLAN.md — Fix Docker migration flow to generate migrations from schema at deploy time

### Phase 8: Test Harness
**Goal**: Integration tests for entry submission are enabled and passing against a real seeded database
**Depends on**: Phase 7 (build must work locally for test runner)
**Requirements**: TEST-01
**Success Criteria** (what must be TRUE):
  1. Running `pnpm test` (or equivalent) executes entry submission integration tests — they are no longer skipped
  2. Tests validate the full entry submission path: API key auth, field validation, deduplication, and queue positioning against a seeded database
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: QA Verification
**Goal**: Every E2E user flow works without surprises when walked through like a real developer would
**Depends on**: Phase 6, Phase 7, Phase 8 (all fixes and test harness in place)
**Requirements**: QA-01, QA-02, QA-03, QA-04, QA-05
**Success Criteria** (what must be TRUE):
  1. A new developer can sign up, create a project, configure fields, generate an API key, submit an entry via curl, and see it in the dashboard — no errors at any step
  2. Submitting an entry triggers notifications on all 5 configured channels (email, Slack, Discord, Telegram, webhook) with correct payloads
  3. Enabling double opt-in, submitting an entry, clicking the verification link in the email, and confirming the status flips to verified — followed by the notification firing — all works end to end
  4. Running `docker-compose up` from a clean state results in a working instance where the API and dashboard are accessible and entries can be submitted
  5. API key auth is enforced (rejected without key), rate limiting triggers at threshold, and a valid key correctly inserts entries
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 6 -> 7 -> 8 -> 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Auth, Projects, and API Keys | v1.0 | 3/3 | Complete | 2026-02-25 |
| 2. Entry Submission API | v1.0 | 2/2 | Complete | 2026-02-25 |
| 3. Dashboard and Data Management | v1.0 | 3/3 | Complete | 2026-02-25 |
| 4. Notification System | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. Documentation and Self-Hosting | v1.0 | 2/2 | Complete | 2026-02-26 |
| 6. Code Fixes | v1.1 | 0/2 | Not started | - |
| 7. Build and Config | v1.1 | 0/2 | Not started | - |
| 8. Test Harness | v1.1 | 0/? | Not started | - |
| 9. QA Verification | v1.1 | 0/? | Not started | - |
