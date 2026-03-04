// ABOUTME: Patches turbo-pruned package.json and pnpm-lock.yaml for Docker builds.
// ABOUTME: Strips astro overrides and injects missing zod package entries from scoped overrides.
//
// WHY THIS EXISTS:
// We run dual zod versions (v4 global + v3 for @tanstack/router-* and astro) via pnpm overrides.
// turbo prune has a bug where it omits `packages:` and `snapshots:` entries from pnpm-lock.yaml
// for versions resolved via scoped overrides (e.g. `@tanstack/router-generator>zod: ^3.25.76`)
// when they differ from the global override. This causes `pnpm install --frozen-lockfile` to fail
// with ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY inside Docker builds.
//
// Additionally, astro (which also needs zod v3) is never Docker-built, so its overrides must be
// stripped from both package.json and the lockfile header to avoid ERR_PNPM_LOCKFILE_CONFIG_MISMATCH.
//
// WHEN CAN THIS BE REMOVED:
// This script can be deleted once BOTH conditions are met:
//   1. @tanstack/router-generator and @tanstack/router-plugin ship zod v4 support
//      (check: `npm view @tanstack/router-generator dependencies.zod`)
//   2. turbo prune correctly handles scoped pnpm overrides
//      (track: https://github.com/vercel/turborepo/issues — no specific issue filed yet)
// Once zod is unified to a single version, the overrides and this script are unnecessary.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

// 1. Read package.json overrides before stripping, to know which zod versions are needed
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const zodVersionsNeeded = new Set();

if (pkg.pnpm?.overrides) {
	const overrides = pkg.pnpm.overrides;

	// Collect all zod version specs from overrides (e.g. "^3.25.76" -> "3.25.76")
	for (const [key, value] of Object.entries(overrides)) {
		if (key === 'zod' || key.endsWith('>zod')) {
			const version = value.replace(/^[\^~>=<]*/, '');
			zodVersionsNeeded.add(version);
		}
	}

	// Strip astro-scoped overrides (astro is never Docker-built)
	for (const key of Object.keys(overrides)) {
		if (key.startsWith('astro')) {
			delete overrides[key];
		}
	}
	writeFileSync('package.json', JSON.stringify(pkg, null, 2));
}

// 2. Patch the lockfile: strip astro overrides from header, inject missing zod entries
let lockfile = readFileSync('pnpm-lock.yaml', 'utf8');

// 2a. Strip astro lines from the overrides: section
const lines = lockfile.split('\n');
const out = [];
let i = 0;
while (i < lines.length) {
	if (lines[i] === 'overrides:') {
		out.push(lines[i]);
		i++;
		while (i < lines.length && lines[i].startsWith('  ')) {
			if (!lines[i].includes('astro')) {
				out.push(lines[i]);
			}
			i++;
		}
	} else {
		out.push(lines[i]);
		i++;
	}
}
lockfile = out.join('\n');

// 2b. Inject missing zod package and snapshot entries.
// turbo prune omits package entries for versions resolved via scoped overrides
// when those versions differ from the global override.
// We read integrity hashes from the original (unpruned) lockfile so nothing is hardcoded.
const originalLockPath = '/tmp/original-pnpm-lock.yaml';
const originalLockfile = existsSync(originalLockPath)
	? readFileSync(originalLockPath, 'utf8')
	: '';

for (const version of zodVersionsNeeded) {
	const pkgEntry = `  zod@${version}:`;
	const snapshotEntry = `  zod@${version}: {}`;

	// Check if the packages: section already has this entry
	if (!lockfile.includes(pkgEntry)) {
		// Extract the resolution line from the original lockfile
		let resolution = '';
		if (originalLockfile) {
			const entryIdx = originalLockfile.indexOf(`  zod@${version}:\n    resolution:`);
			if (entryIdx !== -1) {
				const resStart = originalLockfile.indexOf('resolution:', entryIdx);
				const resEnd = originalLockfile.indexOf('\n', resStart);
				resolution = originalLockfile.slice(resStart, resEnd).trim();
			}
		}

		if (!resolution) {
			console.warn(`WARNING: Could not find resolution for zod@${version}, skipping packages entry`);
			continue;
		}

		// Inject into the packages: section (before snapshots:)
		const snapshotsIdx = lockfile.indexOf('\nsnapshots:');
		if (snapshotsIdx !== -1) {
			const before = lockfile.slice(0, snapshotsIdx);
			const after = lockfile.slice(snapshotsIdx);
			lockfile = `${before}\n${pkgEntry}\n    ${resolution}\n${after}`;
			console.log(`Injected packages entry: zod@${version}`);
		}
	}

	// Check if the snapshots: section already has this entry
	if (!lockfile.includes(snapshotEntry)) {
		// Append to end of file (snapshots section is last)
		const trimmed = lockfile.trimEnd();
		lockfile = `${trimmed}\n\n${snapshotEntry}\n`;
		console.log(`Injected snapshots entry: zod@${version}`);
	}
}

writeFileSync('pnpm-lock.yaml', lockfile);
