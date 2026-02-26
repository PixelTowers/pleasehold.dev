// ABOUTME: Build configuration for the @pleasehold/trpc package.
// ABOUTME: Produces ESM output from TypeScript source with declaration files.

import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	dts: true,
	clean: true,
	sourcemap: true,
});
