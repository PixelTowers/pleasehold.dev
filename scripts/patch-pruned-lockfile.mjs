// ABOUTME: Patches turbo-pruned package.json and pnpm-lock.yaml for Docker builds.
// ABOUTME: Strips astro overrides and injects missing zod package entries from scoped overrides.

import { readFileSync, writeFileSync } from 'node:fs';

// 1. Strip astro-scoped overrides from package.json (astro is never Docker-built)
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (pkg.pnpm?.overrides) {
	const overrides = pkg.pnpm.overrides;
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

// 2b. Find zod versions referenced in the lockfile body but missing from packages section.
// turbo prune sometimes omits package entries for versions resolved via scoped overrides.
const zodRefPattern = /zod@(\d+\.\d+\.\d+)/g;
const referencedVersions = new Set();
for (const match of lockfile.matchAll(zodRefPattern)) {
	referencedVersions.add(match[1]);
}

for (const version of referencedVersions) {
	const entryPattern = `  zod@${version}: {}`;
	if (!lockfile.includes(entryPattern)) {
		// Inject the missing entry before the last non-empty line
		// pnpm-lock.yaml packages are at the end, sorted alphabetically
		const trimmed = lockfile.trimEnd();
		lockfile = `${trimmed}\n\n${entryPattern}\n`;
		console.log(`Injected missing lockfile entry: zod@${version}`);
	}
}

writeFileSync('pnpm-lock.yaml', lockfile);
