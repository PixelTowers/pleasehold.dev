// ABOUTME: Integration tests for free-plan monthly entry limit enforcement (1,000 entries/month).
// ABOUTME: Verifies 429 at limit, 200 for duplicates at limit, pro bypass, and self-hosted bypass.

import { OpenAPIHono } from '@hono/zod-openapi';
import { createAuth } from '@pleasehold/auth';
import { createDb, type Database, entries, subscriptions } from '@pleasehold/db';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type ApiKeyVariables, apiKeyAuth } from '../../middleware/api-key-auth';
import { getTestApiKey, TEST_PROJECT_ID, TEST_USER_ID } from '../../test/seed';
import { entriesRoute } from './entries';

let app: OpenAPIHono<{ Variables: ApiKeyVariables }>;
let db: Database;
let testApiKey: string;

beforeAll(async () => {
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
		disableApiKeyRateLimit: true,
	});

	app = new OpenAPIHono<{ Variables: ApiKeyVariables }>();
	app.use('/api/v1/*', apiKeyAuth(auth, db));
	app.route('/api/v1/entries', entriesRoute);
});

afterAll(async () => {
	// Clean up: remove bulk-inserted entries and subscription row
	await db.delete(entries).where(eq(entries.projectId, TEST_PROJECT_ID));
	await db.delete(subscriptions).where(eq(subscriptions.userId, TEST_USER_ID));
});

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

describe('Entry limit enforcement', () => {
	describe('free plan with billing enabled', () => {
		beforeAll(async () => {
			// Enable billing for these tests
			process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';

			// Ensure a free subscription exists
			await db
				.insert(subscriptions)
				.values({ userId: TEST_USER_ID, plan: 'free' })
				.onConflictDoNothing();

			// Clear any existing entries
			await db.delete(entries).where(eq(entries.projectId, TEST_PROJECT_ID));
		});

		it('returns 201 when under the monthly limit', async () => {
			const res = await postEntry(
				{ email: 'limit-under@example.com' },
				{ 'x-api-key': testApiKey },
			);
			expect(res.status).toBe(201);
		});

		it('returns 429 ENTRY_LIMIT_REACHED when at the 1,000 entry limit', async () => {
			// Bulk insert entries to hit the limit using generate_series
			await db.execute(
				sql`INSERT INTO entries (project_id, email, position, status)
					SELECT ${TEST_PROJECT_ID}, 'bulk-' || i || '@example.com', i, 'new'
					FROM generate_series(1, 1000) AS i
					ON CONFLICT DO NOTHING`,
			);

			const res = await postEntry(
				{ email: 'limit-exceeded@example.com' },
				{ 'x-api-key': testApiKey },
			);
			expect(res.status).toBe(429);

			const body = await res.json();
			expect(body.error.code).toBe('ENTRY_LIMIT_REACHED');
		});

		it('returns 200 for duplicate entry even at limit (dedup is not blocked)', async () => {
			// The "bulk-1@example.com" entry already exists from the previous test
			const res = await postEntry({ email: 'bulk-1@example.com' }, { 'x-api-key': testApiKey });
			expect(res.status).toBe(200);
		});
	});

	describe('pro plan with billing enabled', () => {
		beforeAll(async () => {
			process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';

			// Upgrade to pro
			await db
				.update(subscriptions)
				.set({ plan: 'pro' })
				.where(eq(subscriptions.userId, TEST_USER_ID));
		});

		it('returns 201 regardless of entry count (no limit for pro)', async () => {
			const res = await postEntry(
				{ email: 'pro-unlimited@example.com' },
				{ 'x-api-key': testApiKey },
			);
			expect(res.status).toBe(201);
		});

		afterAll(async () => {
			// Reset to free
			await db
				.update(subscriptions)
				.set({ plan: 'free' })
				.where(eq(subscriptions.userId, TEST_USER_ID));
		});
	});

	describe('self-hosted (no STRIPE_SECRET_KEY)', () => {
		const originalKey = process.env.STRIPE_SECRET_KEY;

		beforeAll(() => {
			delete process.env.STRIPE_SECRET_KEY;
		});

		it('returns 201 regardless of entry count (billing disabled)', async () => {
			const res = await postEntry(
				{ email: 'selfhosted-ok@example.com' },
				{ 'x-api-key': testApiKey },
			);
			expect(res.status).toBe(201);
		});

		afterAll(() => {
			if (originalKey) {
				process.env.STRIPE_SECRET_KEY = originalKey;
			}
		});
	});
});
