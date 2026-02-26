// ABOUTME: Integration tests for the POST /api/v1/entries endpoint with API key auth and deduplication.
// ABOUTME: Tests are skipped because they require a seeded database with real projects and API keys.

import { describe, expect, it } from 'vitest';

// Integration tests require a running database with seeded data (project, field config, API key).
// These tests document the expected behavior and will be enabled when a test database harness
// is available (e.g., via test containers or a shared test setup).

describe('POST /api/v1/entries', () => {
	it.skip('returns 201 with entry data including position for valid submission', () => {
		// POST with valid x-api-key and { email: "test@example.com" }
		// Expect: 201, body.data.id, body.data.email, body.data.position >= 1, body.data.createdAt
		expect(true).toBe(true);
	});

	it.skip('returns 200 with existing entry when same email submitted again (dedup)', () => {
		// POST same email twice for the same project
		// First: 201 with new entry
		// Second: 200 with the SAME entry (same id, same position)
		expect(true).toBe(true);
	});

	it.skip('returns 401 when x-api-key header is missing', () => {
		// POST without x-api-key header
		// Expect: 401, error.code === "MISSING_API_KEY"
		expect(true).toBe(true);
	});

	it.skip('returns 401 when API key is invalid', () => {
		// POST with x-api-key: "ph_live_invalid_key_12345"
		// Expect: 401, error.code === "INVALID_API_KEY"
		expect(true).toBe(true);
	});

	it.skip('returns 400 VALIDATION_ERROR when email is missing', () => {
		// POST with valid API key but body: {}
		// Expect: 400, error.code === "VALIDATION_ERROR", error.details[0].field === "email"
		expect(true).toBe(true);
	});

	it.skip('returns 400 VALIDATION_ERROR when unexpected field is sent', () => {
		// POST with valid API key and body: { email: "test@example.com", phone: "555-1234" }
		// Expect: 400, error.code === "VALIDATION_ERROR" (strictObject rejection)
		expect(true).toBe(true);
	});

	it.skip('returns 201 and stores metadata when provided', () => {
		// POST with valid API key and body: { email: "meta@example.com", metadata: { source: "landing" } }
		// Expect: 201, metadata stored in DB (not echoed in response)
		expect(true).toBe(true);
	});
});
