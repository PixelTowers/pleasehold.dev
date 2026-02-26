# Phase 1: Auth, Projects, and API Keys - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Account management (signup, login, sessions), project CRUD with waitlist/demo-booking mode selection, field configuration per project, and API key infrastructure (generation, display, revocation). This is the identity and access layer that every subsequent phase depends on. Entry submission, notifications, and data management are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Authentication
- Email/password signup + GitHub OAuth + Google OAuth (Better Auth handles all three)
- Sessions persist across browser refresh
- Logout available from any page

### API Key Design
- Better Auth `apiKey` plugin handles key lifecycle (generation, hashing, verification)
- Keys are user-scoped in Better Auth; store `projectId` in key metadata to achieve project scoping
- Key prefix: `ph_live_` — recognizable format for developers
- Show key once on creation with a copy button (Stripe pattern) — never displayed again
- Keys hashed at rest in database
- Multiple keys per project allowed (staging, production, different services)
- Keys have optional user-defined labels ("production", "staging", "chris-local")
- Revoked keys immediately reject subsequent API calls

### Field Configuration
- Predefined toggle-based fields: email (always required), name, company, message
- No custom field builder — toggle presets only
- Text-only field types
- Smart mode defaults:
  - Waitlist mode: email only enabled by default
  - Demo-booking mode: email + name + company + message enabled by default
- Owner can change which fields are enabled after creation
- API strictly validates submissions: reject any fields the project doesn't expect (return error, don't silently drop)

### Project Settings
- Mode (waitlist vs demo-booking) is locked on creation — cannot be changed after
- Project has a name and mode as core properties
- To change mode, create a new project

### Dashboard Onboarding
- First login: guided creation flow walks user through creating their first project step-by-step
- Returning users: project list as card grid showing project name, mode, entry count, last activity
- Each project has an overview page with stats, quick links (settings, API keys, entries), and recent activity

### Claude's Discretion
- Dashboard styling and layout details (spacing, typography, color scheme)
- Exact guided creation flow steps and UI
- API key list presentation in project settings
- Error messages and validation feedback copy
- Empty state designs

</decisions>

<specifics>
## Specific Ideas

- API key UX should feel like Stripe's key management — clean, show once, copy button, labeled keys in a list
- GoldenBerry codebase is the architectural reference for Better Auth setup, tRPC patterns, and Drizzle schema design
- Card grid for projects should show enough info at a glance to pick the right project without clicking into each one

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-auth-projects-and-api-keys*
*Context gathered: 2026-02-25*
