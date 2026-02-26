// ABOUTME: Vitest configuration for @pleasehold/api integration tests.
// ABOUTME: Uses global setup to create/seed/teardown a fresh PostgreSQL test database per run.

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globalSetup: './src/test/setup.ts',
		testTimeout: 15_000,
	},
});
