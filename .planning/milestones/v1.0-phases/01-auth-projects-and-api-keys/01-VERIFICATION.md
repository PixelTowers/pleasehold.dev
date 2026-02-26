---
phase: 01-auth-projects-and-api-keys
verified: 2026-02-25T21:30:00Z
status: passed
score: 20/20 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Complete signup -> login -> session persistence -> logout flow"
    expected: "Signup creates account, login redirects to dashboard, refresh keeps user logged in, logout redirects to /login"
    why_human: "Browser session cookie behavior and redirect flow require live execution; cannot verify statically"
  - test: "Create project (waitlist mode) and verify field config defaults"
    expected: "collectName, collectCompany, collectMessage all false after waitlist project creation"
    why_human: "Requires running DB to confirm transaction committed both rows correctly"
  - test: "Create project (demo-booking mode) and verify field config defaults"
    expected: "collectName, collectCompany, collectMessage all true after demo-booking project creation"
    why_human: "Requires running DB to confirm mode-based defaults applied correctly in transaction"
  - test: "Generate API key, copy it, dismiss reveal, verify key never shows again"
    expected: "ph_live_ prefixed key shown once with copy button; after dismiss key is gone and only prefix+start visible in list"
    why_human: "Clipboard behavior and component state clearing require live browser interaction"
  - test: "Revoke an API key and confirm it is immediately disabled"
    expected: "After revoke confirmation, key shows Revoked badge; subsequent API calls with that key should be rejected"
    why_human: "Better Auth enabled=false enforcement requires live API call to confirm rejection behavior"
---

# Phase 1: Auth, Projects, and API Keys Verification Report

**Phase Goal:** Developers can create accounts, set up projects with waitlist or demo-booking mode, configure field collection, and generate scoped API keys -- the identity and access layer that every subsequent phase depends on

**Verified:** 2026-02-25T21:30:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can create an account with email and password via signup page | VERIFIED | `apps/web/src/routes/signup.tsx` calls `authClient.signUp.email({ name, email, password })` with full form handling and error display |
| 2 | User can log in with email and password and be redirected to the dashboard | VERIFIED | `apps/web/src/routes/login.tsx` calls `authClient.signIn.email({ email, password })` and navigates to `/` on success |
| 3 | User session persists across browser refresh without re-authentication | VERIFIED | Better Auth 7-day session configured in `packages/auth/src/config.ts`; tRPC client uses `credentials: 'include'` in `apps/web/src/lib/trpc.ts`; root layout reads `authClient.useSession()` |
| 4 | User can log out from any page and is redirected to /login | VERIFIED | `apps/web/src/routes/__root.tsx` logout button calls `authClient.signOut()` then `navigate({ to: '/login' })` — present on every page via root layout |
| 5 | User can create a project with a name and mode selection (waitlist or demo-booking) | VERIFIED | `packages/trpc/src/routers/project.ts` create mutation accepts `z.enum(['waitlist', 'demo-booking'])`; `apps/web/src/routes/projects/new.tsx` and `CreateProjectFlow` both call `trpc.project.create` |
| 6 | Field config defaults are automatically set based on mode | VERIFIED | `project.create` uses `db.transaction()` to atomically insert project + field config with `isDemoBooking` flag setting all booleans |
| 7 | User can see all their projects in a card grid on the dashboard | VERIFIED | `apps/web/src/routes/index.tsx` calls `useProjects()` hook which calls `trpc.project.list.useQuery()`, renders `<ProjectCard>` grid |
| 8 | User can click into a project and see its overview page | VERIFIED | `$projectId/index.tsx` fetches project via `useProject(projectId)` showing mode badge, stats, quick links |
| 9 | User can toggle field collection settings (name, company, message) from project settings | VERIFIED | `$projectId/settings.tsx` renders `<FieldConfigForm>` which calls `trpc.project.updateFields.useMutation()` on each toggle |
| 10 | User can switch between multiple projects in the dashboard | VERIFIED | Dashboard card grid links each `<ProjectCard>` to `/projects/${project.id}`; "New Project" button navigates to `/projects/new` |
| 11 | Mode cannot be changed after project creation | VERIFIED | `project.update` input schema deliberately excludes `mode` field (comment in code); settings page shows mode as read-only badge with "Cannot be changed after creation" text |
| 12 | First-time user sees a guided creation flow | VERIFIED | `routes/index.tsx` conditionally renders `<CreateProjectFlow>` when `projects.length === 0` |
| 13 | User can generate a project-scoped API key from the project dashboard | VERIFIED | `$projectId/keys.tsx` renders `<ApiKeyCreateDialog>` with "Create Key" button; dialog calls `trpc.apiKey.create.useMutation()` with projectId |
| 14 | Generated API key starts with ph_live_ prefix | VERIFIED | `packages/auth/src/config.ts` configures `apiKey({ defaultPrefix: 'ph_live_', enableMetadata: true })`; create mutation passes `prefix: 'ph_live_'` in body |
| 15 | API key is displayed exactly once on creation with a copy button -- never shown again | VERIFIED | `ApiKeyCreateDialog` stores `createdKey` in React state; shows `<ApiKeyRevealOnce>` on success; `handleDismissKey` clears state; key list only shows `prefix + start + "..."` |
| 16 | User can see a list of their project's API keys showing label, prefix, first 8 chars, and creation date | VERIFIED | `ApiKeyList` renders table with name, `key.prefix + key.start + "..."`, status badge, and `new Date(key.createdAt).toLocaleDateString()` |
| 17 | User can revoke an API key and it becomes disabled | VERIFIED | `ApiKeyList` revoke button triggers confirmation, then calls `trpc.apiKey.revoke.useMutation()`; router calls `auth.api.updateApiKey({ enabled: false })` |
| 18 | API keys are hashed at rest in the database (only start field stores first 8 chars) | VERIFIED | `packages/db/src/schema/auth.ts` apikeys table has `key` (text, hashed by Better Auth) and `start` (text, 8 chars) columns; list query never selects `key` column |
| 19 | Keys have optional user-defined labels | VERIFIED | `apiKey.create` input has `label: z.string().max(50).optional()`; dialog has optional label input |
| 20 | Multiple keys per project are supported | VERIFIED | No unique constraint on projectId in apikeys table; list query returns all keys filtered by metadata.projectId |

**Score:** 20/20 truths verified

---

## Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `packages/db/src/schema/auth.ts` | Better Auth tables: authUsers, sessions, accounts, verifications, apikeys | VERIFIED | All 5 tables defined with correct columns; apikeys has `metadata`, `enabled`, `start`, `key` columns; `pgTable` pattern used |
| `packages/db/src/schema/projects.ts` | Projects table with userId, name, mode columns | VERIFIED | `pgTable('projects', {...})` with text userId FK to authUsers, mode enum `['waitlist', 'demo-booking']`, uuid PK |
| `packages/db/src/schema/field-configs.ts` | Field config table with boolean toggles per project | VERIFIED | `pgTable('project_field_configs', {...})` with `collectName`, `collectCompany`, `collectMessage` boolean columns |
| `packages/auth/src/config.ts` | createAuth factory with emailAndPassword enabled, apiKey plugin with ph_live_ prefix | VERIFIED | `emailAndPassword: { enabled: true }`, `apiKey({ defaultPrefix: 'ph_live_', enableMetadata: true })`, drizzleAdapter wired |
| `apps/api/src/index.ts` | Hono server with auth routes, tRPC mount, CORS, health check | VERIFIED | `app.all('/api/auth/*')`, `app.use('/trpc/*', trpcServer(...))`, `app.get('/health')`, CORS configured |
| `apps/web/src/routes/login.tsx` | Login page with email/password form | VERIFIED | Full form with `authClient.signIn.email(...)`, error display, loading state, link to signup |
| `apps/web/src/routes/signup.tsx` | Signup page with name/email/password form | VERIFIED | Full form with `authClient.signUp.email(...)`, error display, loading state, link to login |
| `packages/trpc/src/routers/project.ts` | Project CRUD: create (transactional), list, getById, update name, updateFields | VERIFIED | All 5 procedures implemented; `db.transaction()` in create; mode excluded from update input |
| `apps/web/src/routes/projects/new.tsx` | Project creation page with name input and mode selector | VERIFIED | Calls `trpc.project.create`, visual mode selector, navigates to project on success |
| `apps/web/src/routes/projects/$projectId/settings.tsx` | Project settings with field config toggles | VERIFIED | Renders `<FieldConfigForm>`, read-only mode badge, editable project name via `project.update` mutation |
| `apps/web/src/components/ProjectCard.tsx` | Card component showing project name, mode, entry count, last activity | VERIFIED | Renders name, mode badge, createdAt/updatedAt, links to project overview |
| `apps/web/src/routes/index.tsx` | Dashboard with card grid or guided creation flow for new users | VERIFIED | Conditional render: `<CreateProjectFlow>` if no projects, `<ProjectCard>` grid otherwise |
| `packages/trpc/src/routers/api-key.ts` | API key lifecycle: create (with projectId metadata), list (filtered by projectId), revoke | VERIFIED | 3 procedures; create uses `auth.api.createApiKey` with metadata; list filters in-memory by metadata; revoke uses `auth.api.updateApiKey({ enabled: false })` |
| `packages/auth/src/verify-project-key.ts` | verifyProjectKey utility that verifies key AND checks metadata.projectId match | VERIFIED | Calls `auth.api.verifyApiKey`, checks `metadata.projectId !== projectId`, returns `{ valid, userId, keyId }` |
| `apps/web/src/routes/projects/$projectId/keys.tsx` | API key management page within project context | VERIFIED | Breadcrumb navigation, "Create Key" button, renders `<ApiKeyList>` and `<ApiKeyCreateDialog>` |
| `apps/web/src/components/ApiKeyRevealOnce.tsx` | One-time key display with copy button (Stripe pattern) | VERIFIED | `navigator.clipboard.writeText(apiKey)`, "Copied!" feedback, "This key will only be shown once" warning, dismiss button |
| `apps/web/src/components/ApiKeyList.tsx` | Table of existing keys showing prefix + start, label, status, revoke action | VERIFIED | Table with label, `prefix + start + "..."`, active/revoked badge, revoke with inline confirmation |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/src/lib/auth-client.ts` | `apps/api` (Better Auth handler) | `createAuthClient({ baseURL: '/api/auth' })` | WIRED | `createAuthClient` called with `baseURL: '/api/auth'`; Vite proxy routes to API server |
| `apps/api/src/index.ts` | `packages/auth/src/config.ts` | `createAuth()` factory call | WIRED | `createAuth({ db, secret, baseUrl, trustedOrigins, ... })` called directly; auth instance used for handler and tRPC context |
| `packages/auth/src/config.ts` | `packages/db/src/schema` | `drizzleAdapter` with schema references | WIRED | `drizzleAdapter(options.db, { provider: 'pg', schema: { user: authUsers, session: sessions, account: accounts, verification: verifications, apikey: apikeys } })` |
| `apps/api/src/index.ts` | `packages/trpc` | tRPC server middleware mounted on `/trpc/*` | WIRED | `trpcServer({ router: appRouter, createContext: ... })` mounted at `/trpc/*`; `createContext` passes db, session, user, auth, requestHeaders |
| `packages/trpc/src/routers/project.ts` | `packages/db/src/schema/projects.ts` | Drizzle queries with ownership guard | WIRED | Every query includes `eq(projects.userId, ctx.user.id)` check; returns NOT_FOUND (not FORBIDDEN) to prevent information leakage |
| `packages/trpc/src/routers/project.ts (create)` | `packages/db/src/schema/field-configs.ts` | Transaction inserting project + field config | WIRED | `ctx.db.transaction(async (tx) => { ...insert projects...insert projectFieldConfigs... })` confirmed |
| `apps/web/src/routes/index.tsx` | `packages/trpc/src/routers/project.ts` | `trpc.project.list` via `useProjects()` hook | WIRED | `useProjects()` calls `trpc.project.list.useQuery()`; results rendered as `<ProjectCard>` grid |
| `apps/web/src/routes/projects/$projectId/settings.tsx` | `packages/trpc/src/routers/project.ts` | `trpc.project.updateFields` in `<FieldConfigForm>` | WIRED | `FieldConfigForm` calls `trpc.project.updateFields.useMutation()` on every toggle change |
| `packages/trpc/src/routers/api-key.ts` | `packages/auth/src/config.ts (apiKey plugin)` | `auth.api.createApiKey` and `auth.api.updateApiKey` | WIRED | `ctx.auth.api.createApiKey(...)` at line 30; `ctx.auth.api.updateApiKey({ enabled: false })` at line 141 |
| `packages/trpc/src/routers/api-key.ts (create)` | `packages/db/src/schema/projects.ts` | Ownership verification before key creation | WIRED | `and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))` checked before `createApiKey` call |
| `packages/auth/src/verify-project-key.ts` | `packages/auth/src/config.ts` | `auth.api.verifyApiKey` + metadata.projectId check | WIRED | `auth.api.verifyApiKey({ body: { key } })` called; `metadata.projectId !== projectId` guard confirmed |
| `apps/web/src/components/ApiKeyRevealOnce.tsx` | `packages/trpc/src/routers/api-key.ts` | Mutation returns full key once; component displays and allows copy | WIRED | `ApiKeyCreateDialog` stores `data.key` from mutation in React state; passes to `<ApiKeyRevealOnce apiKey={createdKey}>`; `navigator.clipboard.writeText(apiKey)` on copy |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AUTH-01 | 01-01 | User can create an account with email and password | SATISFIED | `packages/auth/src/config.ts` has `emailAndPassword: { enabled: true }`; `apps/web/src/routes/signup.tsx` full signup form calling `authClient.signUp.email` |
| AUTH-02 | 01-01 | User session persists across browser refresh | SATISFIED | Better Auth 7-day session configured; `credentials: 'include'` on tRPC client ensures cookie sent; `authClient.useSession()` in root layout restores session state |
| AUTH-03 | 01-01 | User can log out from any page | SATISFIED | Root layout (`__root.tsx`) has logout button calling `authClient.signOut()` + navigate to `/login`; renders on all pages via `<Outlet>` |
| PROJ-01 | 01-02 | User can create a project with a name and mode (waitlist or demo-booking) | SATISFIED | `project.create` tRPC mutation accepts name + mode; `CreateProjectFlow` 3-step flow; `new.tsx` standalone creation page |
| PROJ-02 | 01-02 | User can manage multiple projects from a single account | SATISFIED | `project.list` query returns all user projects; dashboard renders card grid with all projects; no limit enforced |
| PROJ-03 | 01-02 | User can configure which fields to collect per project | SATISFIED | `project.updateFields` mutation accepts 3 boolean toggles; `FieldConfigForm` auto-saves on each toggle; settings page accessible from project overview |
| PROJ-04 | 01-02 | User can switch between projects in the dashboard | SATISFIED | Dashboard card grid links each project card to its overview page; back-to-dashboard navigation on all project pages |
| KEYS-01 | 01-03 | User can generate project-scoped API keys from the dashboard | SATISFIED | Keys page at `/projects/$projectId/keys` with create button; `apiKey.create` verifies project ownership and stores projectId in metadata |
| KEYS-02 | 01-03 | API keys use a recognizable prefix format (`ph_live_...`) | SATISFIED | `defaultPrefix: 'ph_live_'` in Better Auth config; `prefix: 'ph_live_'` passed in `createApiKey` body; key list shows `prefix + start + "..."` |
| KEYS-03 | 01-03 | User can revoke API keys | SATISFIED | `apiKey.revoke` mutation calls `auth.api.updateApiKey({ enabled: false })`; revoke button with inline confirmation in `ApiKeyList`; revoked keys show "Revoked" badge |
| KEYS-04 | 01-03 | API keys are hashed at rest and displayed only once on creation | SATISFIED | `create` mutation returns `result.key` (plaintext, only available at creation); `ApiKeyRevealOnce` shows key once; on dismiss key cleared from state; list query never selects `key` hash column |

**All 11 Phase 1 requirements: SATISFIED**

No orphaned requirements detected. REQUIREMENTS.md traceability table confirms AUTH-01 through KEYS-04 map to Phase 1 only.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/src/routes/index.tsx` | 27 | `window.location.href = '/login'` instead of router navigate | Info | Minor: imperative redirect works but bypasses TanStack Router; no functional impact for auth protection |
| `apps/web/src/routes/projects/new.tsx` | 40 | `window.location.href = '/login'` instead of router navigate | Info | Same pattern as above; consistent but not ideal |

No blockers or warnings found. The `window.location.href` pattern is a minor stylistic issue -- it works correctly but a future cleanup could use `useNavigate` consistently. No stubs, empty implementations, or placeholder returns detected anywhere.

---

## Human Verification Required

### 1. End-to-end auth flow

**Test:** Navigate to `/signup`, create account, verify redirect to dashboard, refresh browser, verify still on dashboard, click logout, verify redirect to `/login`, log back in.

**Expected:** Signup creates account and redirects to `/`; refresh keeps user on dashboard (session cookie persists); logout clears session and redirects to `/login`; login restores session.

**Why human:** Browser session cookie behavior and client-side redirect flow cannot be verified statically.

### 2. Waitlist project field config defaults

**Test:** Create a project with "waitlist" mode; navigate to project settings; inspect field toggles.

**Expected:** `collectName`, `collectCompany`, `collectMessage` all OFF (false) after creation.

**Why human:** Requires running PostgreSQL to confirm the transaction correctly inserted the field config row with mode-based defaults.

### 3. Demo-booking project field config defaults

**Test:** Create a project with "demo-booking" mode; navigate to project settings; inspect field toggles.

**Expected:** `collectName`, `collectCompany`, `collectMessage` all ON (true) after creation.

**Why human:** Same as above -- live DB required.

### 4. API key one-time reveal and copy

**Test:** Generate an API key; verify it shows with `ph_live_` prefix; click copy button; dismiss the dialog; verify key is not shown again in the list (only `ph_live_XXXXXXXX...`).

**Expected:** Key shown exactly once; copy button works; after dismiss only truncated preview visible.

**Why human:** Clipboard API and React state clearing require live browser interaction.

### 5. API key revocation enforcement

**Test:** Generate a key, copy it, revoke it, then attempt to use it in a real API call (e.g., `curl -H "x-api-key: ph_live_..." http://localhost:3000/api/v1/test`).

**Expected:** Revoked key is rejected (Better Auth `enabled=false` should prevent use).

**Why human:** Requires running API server and Better Auth middleware to confirm enforcement behavior.

---

## Gaps Summary

No gaps found. All 20 observable truths are verified. All 11 Phase 1 requirements are satisfied by substantive, wired implementations.

Five items flagged for human verification are behavioral checks that require a running stack, not code gaps. The code that implements these behaviors is complete and correctly wired.

Key deviations documented in SUMMARYs that were verified correct:
- `defaultPrefix` (not `prefix`) in apiKey plugin config -- confirmed in `config.ts` line 74
- `enableMetadata: true` added -- confirmed in `config.ts` line 75
- `updateApiKey({ enabled: false })` used for revocation (no `revokeApiKey` method in Better Auth v1.4.19) -- confirmed in `api-key.ts` line 141
- `$projectId.tsx` is a layout route with `<Outlet>` (not a full page) -- confirmed in file structure

---

_Verified: 2026-02-25T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
