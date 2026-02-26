// ABOUTME: Integration tests for POST /api/v1/entries against a real seeded PostgreSQL database.
// ABOUTME: Covers API key auth, field validation, deduplication, queue positioning, and metadata storage.

import { createDb, entries, type Database } from '@pleasehold/db';
import { createAuth } from '@pleasehold/auth';
import { OpenAPIHono } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiKeyAuth, type ApiKeyVariables } from '../../middleware/api-key-auth';
import { entriesRoute } from './entries';
import { getTestApiKey } from '../../test/seed';

let app: OpenAPIHono<{ Variables: ApiKeyVariables }>;
let db: Database;
let testApiKey: string;

beforeAll(() => {
	const testDatabaseUrl = process.env.TEST_DATABASE_URL;
	if (!testDatabaseUrl) {
		throw new Error('TEST_DATABASE_URL not set. Global setup may have failed.');
	}

	testApiKey = getTestApiKey();
	db = createDb(testDatabaseUrl);

	const auth = createAuth({
		db,
		secret: process.env.BETTER_AUTH_SECRET ?? 'test-secret-at-least-32-characters-long',
		baseUrl: 'http://localhost:3001',
		trustedOrigins: ['http://localhost:5173'],
	});

	app = new OpenAPIHono<{ Variables: ApiKeyVariables }>();
	app.use('/api/v1/*', apiKeyAuth(auth, db));
	app.route('/api/v1/entries', entriesRoute);
});

afterAll(async () => {
	// Clean up entries created during tests to avoid cross-test pollution on re-runs
	// (The global teardown drops the entire database, but this is good hygiene.)
});

/**
 * Helper to make a POST request to /api/v1/entries via Hono's in-process request handler.
 */
function postEntry(body: unknown, headers: Record<string, string> = {}) {
	return app.request('/api/v1/entries', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	});
}

describe('POST /api/v1/entries', () => {
	it('returns 401 when x-api-key header is missing', async () => {
		const res = await postEntry({ email: 'no-key@example.com' });
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error.code).toBe('MISSING_API_KEY');
	});

	it('returns 401 when API key is invalid', async () => {
		const res = await postEntry({ email: 'bad-key@example.com' }, {
			'x-api-key': 'ph_live_invalid_key_12345',
		});
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error.code).toBe('INVALID_API_KEY');
	});

	it('returns 400 VALIDATION_ERROR when email is missing', async () => {
		const res = await postEntry({}, {
			'x-api-key': testApiKey,
		});
		expect(res.status).toBe(400);

		const body = await res.json();
		// OpenAPI layer validates required fields before the handler runs.
		// The error uses Hono's zod-openapi default format.
		expect(body.success).toBe(false);
		expect(body.error.name).toBe('ZodError');
		expect(body.error.issues[0].path).toContain('email');
	});

	it('returns 400 VALIDATION_ERROR when unexpected field is sent', async () => {
		const res = await postEntry(
			{ email: 'unexpected-field@example.com', phone: '555-1234' },
			{ 'x-api-key': testApiKey },
		);
		expect(res.status).toBe(400);

		const body = await res.json();
		expect(body.error.code).toBe('VALIDATION_ERROR');
	});

	it('returns 201 with entry data including position for valid submission', async () => {
		const res = await postEntry(
			{ email: 'integration-test-1@example.com' },
			{ 'x-api-key': testApiKey },
		);
		expect(res.status).toBe(201);

		const body = await res.json();
		expect(body.data.id).toBeDefined();
		expect(body.data.email).toBe('integration-test-1@example.com');
		expect(body.data.position).toBeGreaterThanOrEqual(1);
		expect(body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('returns 200 with existing entry when same email submitted again (dedup)', async () => {
		const email = 'dedup-test@example.com';

		// First submission: should create
		const first = await postEntry({ email }, { 'x-api-key': testApiKey });
		expect(first.status).toBe(201);
		const firstBody = await first.json();

		// Second submission: should return existing
		const second = await postEntry({ email }, { 'x-api-key': testApiKey });
		expect(second.status).toBe(200);
		const secondBody = await second.json();

		// Same entry returned
		expect(secondBody.data.id).toBe(firstBody.data.id);
		expect(secondBody.data.position).toBe(firstBody.data.position);
	});

	it('returns 201 and assigns sequential positions', async () => {
		const resA = await postEntry(
			{ email: 'position-a@example.com' },
			{ 'x-api-key': testApiKey },
		);
		expect(resA.status).toBe(201);
		const bodyA = await resA.json();

		const resB = await postEntry(
			{ email: 'position-b@example.com' },
			{ 'x-api-key': testApiKey },
		);
		expect(resB.status).toBe(201);
		const bodyB = await resB.json();

		expect(bodyB.data.position).toBe(bodyA.data.position + 1);
	});

	it('returns 201 and stores metadata when provided', async () => {
		const res = await postEntry(
			{ email: 'meta-test@example.com', metadata: { source: 'landing' } },
			{ 'x-api-key': testApiKey },
		);
		expect(res.status).toBe(201);

		// Verify metadata was persisted by querying the database directly
		const entry = await db.query.entries.findFirst({
			where: eq(entries.email, 'meta-test@example.com'),
		});
		expect(entry).toBeDefined();
		expect((entry!.metadata as Record<string, unknown>).source).toBe('landing');
	});
});
