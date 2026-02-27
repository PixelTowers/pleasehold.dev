// ABOUTME: Vitest configuration for @pleasehold/worker unit tests.
// ABOUTME: Unit tests with module mocking for Resend client and database queries.

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		testTimeout: 10_000,
	},
});
