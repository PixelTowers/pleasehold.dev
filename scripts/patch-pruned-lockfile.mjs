// ABOUTME: Patches turbo-pruned package.json and pnpm-lock.yaml for Docker builds.
// ABOUTME: Strips astro overrides and injects missing zod package entries from scoped overrides.

import { readFileSync, writeFileSync } from 'node:fs';

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

// 2b. Inject missing zod package entries.
// turbo prune omits package entries for versions resolved via scoped overrides
// when those versions differ from the global override.
for (const version of zodVersionsNeeded) {
	const entryPattern = `  zod@${version}: {}`;
	if (!lockfile.includes(entryPattern)) {
		const trimmed = lockfile.trimEnd();
		lockfile = `${trimmed}\n\n${entryPattern}\n`;
		console.log(`Injected missing lockfile entry: zod@${version}`);
	}
}

writeFileSync('pnpm-lock.yaml', lockfile);
