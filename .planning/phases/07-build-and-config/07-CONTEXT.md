# Phase 7: Build and Config - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the build pipeline so it works locally and in Docker without workarounds, and ensure missing optional config (like SMTP) produces clear guidance instead of silent failure. Three specific items from the v1.0 audit: local API build, Docker migrations, and SMTP config clarity.

</domain>

<decisions>
## Implementation Decisions

### Local build strategy
- Use tsup to bundle the API into a single `dist/index.js` file
- `pnpm build --filter @pleasehold/api` must succeed locally and produce a runnable artifact
- Single bundled file — fast startup, simple deployment, matches what Docker builder stage produces

### Claude's Discretion
- Docker migration flow — how to handle the gitignored `drizzle/` directory (generate at build time, runtime, or check in). Pick what works cleanly with the existing Docker Compose setup.
- SMTP warning behavior — how loud the warning should be when SMTP_HOST is missing. The audit says "warn-only" is correct behavior but email silently fails. Make it clear to the developer what won't work and why.
- tsup configuration details — external packages, target, format choices

</decisions>

<specifics>
## Specific Ideas

- The GoldenBerry reference project uses the same stack — check if it has a working tsup config to follow
- Docker builder stage already produces dist/index.js — local build should match that output

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-build-and-config*
*Context gathered: 2026-02-26*
