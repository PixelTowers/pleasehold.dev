// ABOUTME: Vitest configuration for unit tests that don't require a real database.
// ABOUTME: Runs without the global DB setup, for testing handlers with mocked dependencies.

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/webhooks/**/*.test.ts', 'src/routes/openapi-spec.test.ts'],
		testTimeout: 10_000,
	},
});
