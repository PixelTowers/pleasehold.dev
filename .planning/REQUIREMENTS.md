# Requirements: pleasehold.dev

**Defined:** 2026-02-26
**Core Value:** Developers can add a waitlist or demo-booking form to any landing page in minutes by hitting an API — no backend work, no form infrastructure, just a token and a POST request.

## v1.1 Requirements

Requirements for QA & Hardening milestone. Each maps to roadmap phases.

### QA Flows

- [ ] **QA-01**: Developer can complete full signup → project → field config → API key → entry submission → dashboard view flow without errors
- [ ] **QA-02**: Notification pipeline delivers to all 5 channels (email, Slack, Discord, Telegram, webhook) when entries are submitted
- [ ] **QA-03**: Double opt-in email verification flow works end to end (enable → submit → email → click verify → status flips → notification fires)
- [ ] **QA-04**: Self-hosting via `docker-compose up` works (migrate → API + web accessible → entries can be submitted)
- [ ] **QA-05**: API key security works correctly (generate → POST with key → rate limit enforced → auth validated → entry inserted)

### Integration Fixes

- [x] **INTG-01**: Worker service has `API_URL` env var in docker-compose.yml so verification email links use the correct host
- [x] **INTG-02**: Dashboard status filter includes `pending_verification` so those entries can be isolated

### Tech Debt — Router

- [x] **ROUT-01**: Unauthenticated redirects use TanStack Router `navigate` instead of `window.location.href`
- [x] **ROUT-02**: Entry navigation uses TanStack Router type-safe links instead of template strings

### Tech Debt — Testing

- [ ] **TEST-01**: Integration tests for entry submission route are enabled with a seeded database harness

### Tech Debt — Build & Config

- [ ] **BILD-01**: Missing SMTP_HOST produces clear actionable guidance (not silent failure)
- [ ] **BILD-02**: `pnpm build --filter @pleasehold/api` works locally with proper tsup config
- [x] **BILD-03**: Drizzle migrations are properly handled in Docker build (not dependent on gitignored directory)

### Tech Debt — Cleanup

- [x] **CLEN-01**: Dead exports (`verifyProjectKey`, `authMiddleware`) removed from `@pleasehold/auth`
- [x] **CLEN-02**: `/health` endpoint proxied through nginx and accessible via web service

## Future Requirements

None — v1.1 is a hardening milestone, not a feature milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated E2E test suite | v1.1 is manual QA — automated E2E is a future milestone |
| Performance testing | Focus is correctness, not performance |
| New features | Hardening only — new features wait for v1.2+ |
| CI/CD pipeline | Not in scope for this pass |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| QA-01 | Phase 9 | Pending |
| QA-02 | Phase 9 | Pending |
| QA-03 | Phase 9 | Pending |
| QA-04 | Phase 9 | Pending |
| QA-05 | Phase 9 | Pending |
| INTG-01 | Phase 6 | Complete |
| INTG-02 | Phase 6 | Complete |
| ROUT-01 | Phase 6 | Complete |
| ROUT-02 | Phase 6 | Complete |
| TEST-01 | Phase 8 | Pending |
| BILD-01 | Phase 7 | Pending |
| BILD-02 | Phase 7 | Pending |
| BILD-03 | Phase 7 | Complete |
| CLEN-01 | Phase 6 | Complete |
| CLEN-02 | Phase 6 | Complete |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation*
