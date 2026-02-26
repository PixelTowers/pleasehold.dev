---
phase: 07-build-and-config
verified: 2026-02-26T15:05:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 7: Build and Config Verification Report

**Phase Goal:** The build pipeline works locally and in Docker without workarounds, and missing config produces clear guidance instead of silent failure
**Verified:** 2026-02-26T15:05:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                   | Status     | Evidence                                                                                   |
|----|---------------------------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------|
| 1  | `pnpm build --filter @pleasehold/api` succeeds locally and produces `apps/api/dist/index.js`           | VERIFIED   | Build ran clean (565ms, 4 tasks). dist/index.js is 905 KB with createRequire shim.        |
| 2  | `pnpm build --filter @pleasehold/worker` succeeds locally and produces `apps/worker/dist/index.js`     | VERIFIED   | Build ran clean (17ms). dist/index.js is 96 KB.                                            |
| 3  | Starting the API or worker without SMTP_HOST logs a detailed warning naming affected features and vars  | VERIFIED   | mailer.ts warns on missing SMTP_HOST with multi-line message listing both broken features and all 5 required env vars. |
| 4  | Docker migrate service does not depend on the gitignored drizzle/ directory                             | VERIFIED   | docker-compose.yml migrate command is `sh -c "pnpm db:generate && pnpm db:migrate"`.      |
| 5  | Running docker compose up from a clean clone runs migrations successfully (flow is self-contained)      | VERIFIED   | generate step reads schema source (packages/db/src/schema/index.ts via drizzle.config.ts) and produces SQL before apply step. No pre-existing drizzle/ required. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                   | Expected                                       | Status   | Details                                                                                     |
|--------------------------------------------|------------------------------------------------|----------|---------------------------------------------------------------------------------------------|
| `apps/api/tsup.config.ts`                  | tsup build config for API service              | VERIFIED | Contains defineConfig, node22 target, noExternal for workspace packages, createRequire shim |
| `apps/worker/tsup.config.ts`               | tsup build config for worker service           | VERIFIED | Contains defineConfig, node22 target, noExternal for workspace packages, createRequire shim |
| `apps/worker/src/senders/mailer.ts`        | SMTP transporter with actionable warning       | VERIFIED | Contains SMTP_HOST check, multi-line console.warn with feature list and all env vars        |
| `docker-compose.yml`                       | Migrate service with generate-then-apply flow  | VERIFIED | migrate.command is `sh -c "pnpm db:generate && pnpm db:migrate"`                           |
| `packages/db/drizzle.config.ts`            | Drizzle Kit config pointing to schema source   | VERIFIED | schema: './src/schema/index.ts', out: './drizzle', dialect: 'postgresql'                   |

### Key Link Verification

| From                              | To                                     | Via                                                              | Status   | Details                                                                           |
|-----------------------------------|----------------------------------------|------------------------------------------------------------------|----------|-----------------------------------------------------------------------------------|
| `apps/api/package.json`           | `apps/api/tsup.config.ts`              | `"build": "tsup"` invokes tsup which auto-discovers config file  | WIRED    | build script is `"tsup"` and config file exists at expected path                  |
| `apps/worker/package.json`        | `apps/worker/tsup.config.ts`           | `"build": "tsup"` invokes tsup which auto-discovers config file  | WIRED    | build script is `"tsup"` and config file exists at expected path                  |
| `docker-compose.yml (migrate)`    | `packages/db/drizzle.config.ts`        | `pnpm db:generate` reads drizzle.config.ts for schema location   | WIRED    | drizzle.config.ts points to `./src/schema/index.ts`; generate step wired         |
| `docker-compose.yml (migrate)`    | `packages/db/drizzle/` (runtime)       | `pnpm db:migrate` reads generated SQL and applies to PostgreSQL  | WIRED    | command chains generate then migrate; generate produces the SQL migrate consumes  |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                        | Status    | Evidence                                                                            |
|-------------|-------------|------------------------------------------------------------------------------------|-----------|-------------------------------------------------------------------------------------|
| BILD-01     | 07-01-PLAN  | Missing SMTP_HOST produces clear actionable guidance (not silent failure)          | SATISFIED | mailer.ts console.warn lists affected features and all 5 SMTP env vars with examples |
| BILD-02     | 07-01-PLAN  | `pnpm build --filter @pleasehold/api` works locally with proper tsup config       | SATISFIED | Build confirmed clean; dist/index.js produced at 905 KB                             |
| BILD-03     | 07-02-PLAN  | Drizzle migrations handled in Docker build (not dependent on gitignored directory) | SATISFIED | migrate service chains db:generate before db:migrate; no pre-existing drizzle/ needed |

No orphaned requirements — REQUIREMENTS.md traceability table maps BILD-01, BILD-02, BILD-03 to Phase 7, all three are claimed by plans in this phase, and all are satisfied.

### Anti-Patterns Found

None. All five modified/created files were scanned (apps/api/tsup.config.ts, apps/worker/tsup.config.ts, apps/worker/src/senders/mailer.ts, docker-compose.yml, .gitignore). No TODO, FIXME, PLACEHOLDER, HACK, or XXX markers found. No empty implementations, no stub returns.

### Human Verification Required

#### 1. Docker build end-to-end from clean clone

**Test:** Clone the repo fresh, `cd` into it, run `docker compose up`, and observe migration logs.
**Expected:** The migrate service should print Drizzle generation output followed by migration apply output — no errors about missing migration files. API and web should become accessible.
**Why human:** Cannot simulate a clean Docker build environment or verify the builder stage's filesystem state programmatically from the host.

#### 2. SMTP warning visibility at startup

**Test:** Start the worker with SMTP_HOST unset (e.g., `SMTP_HOST= pnpm --filter @pleasehold/worker dev`) and observe console output.
**Expected:** The `[pleasehold] SMTP is not configured` multi-line block appears in logs at startup, clearly lists email notifications and double opt-in verification as broken, and lists all five env vars.
**Why human:** The warning fires at module load time; verifying the exact log rendering and readability in a real terminal requires a running process.

### Gaps Summary

No gaps. All automated checks passed.

- Build configs are substantive (not stubs): both tsup.config.ts files have all required fields including node22 target, noExternal workspace bundling, and createRequire banner shim.
- Both build artifacts are real: API dist/index.js is 905 KB, worker dist/index.js is 96 KB — not empty placeholders.
- Wiring is complete: both package.json build scripts call `tsup` directly, and tsup auto-discovers config files by convention.
- Docker migration fix is correct: the chained command `sh -c "pnpm db:generate && pnpm db:migrate"` is present and the drizzle.config.ts is wired to the schema source.
- SMTP warning is actionable: the warning fires on missing SMTP_HOST, names both affected features (email notifications, double opt-in), and lists all five required environment variables with example values.
- All four commits documented in the SUMMARYs (c0ad0dd, 0e194e7, 969cb41, 0f0c7e0) verified present in git history.
- No deviations from plan. No anti-patterns.

---

_Verified: 2026-02-26T15:05:00Z_
_Verifier: Claude (gsd-verifier)_
