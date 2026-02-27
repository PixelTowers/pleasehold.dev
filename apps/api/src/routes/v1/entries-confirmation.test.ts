// ABOUTME: Integration tests for confirmation email enqueueing logic in POST /api/v1/entries.
// ABOUTME: Verifies that confirmation_email jobs are enqueued when sendConfirmationEmail is enabled on the project.

import { OpenAPIHono } from '@hono/zod-openapi';
import { createAuth } from '@pleasehold/auth';
import { createDb, type Database, projects } from '@pleasehold/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ApiKeyVariables, apiKeyAuth } from '../../middleware/api-key-auth';
import { getTestApiKey, TEST_PROJECT_ID } from '../../test/seed';
import { entriesRoute } from './entries';

// Mock the notification queue to spy on enqueue calls
vi.mock('../../lib/notification-queue', () => ({
	enqueueNotification: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
}));

// Import the mock after vi.mock so we get the mocked version
import { enqueueNotification } from '../../lib/notification-queue';

const mockEnqueue = vi.mocked(enqueueNotification);

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
		disableApiKeyRateLimit: true,
	});

	app = new OpenAPIHono<{ Variables: ApiKeyVariables }>();
	app.use('/api/v1/*', apiKeyAuth(auth, db));
	app.route('/api/v1/entries', entriesRoute);
});

beforeEach(() => {
	mockEnqueue.mockClear();
});

afterAll(async () => {
	// Reset project back to default state
	await db
		.update(projects)
		.set({ sendConfirmationEmail: false, doubleOptIn: false })
		.where(eq(projects.id, TEST_PROJECT_ID));
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

describe('POST /api/v1/entries — confirmation email enqueueing', () => {
	describe('when sendConfirmationEmail is OFF (default)', () => {
		beforeAll(async () => {
			await db
				.update(projects)
				.set({ sendConfirmationEmail: false, doubleOptIn: false })
				.where(eq(projects.id, TEST_PROJECT_ID));
		});

		it('enqueues entry_created but NOT confirmation_email', async () => {
			const res = await postEntry(
				{ email: 'confirm-off-test@example.com' },
				{ 'x-api-key': testApiKey },
			);
			expect(res.status).toBe(201);

			// Should have exactly one enqueue call: entry_created
			const calls = mockEnqueue.mock.calls;
			const types = calls.map((c) => c[0].type);
			expect(types).toContain('entry_created');
			expect(types).not.toContain('confirmation_email');
		});
	});

	describe('when sendConfirmationEmail is ON, doubleOptIn is OFF', () => {
		beforeAll(async () => {
			await db
				.update(projects)
				.set({ sendConfirmationEmail: true, doubleOptIn: false })
				.where(eq(projects.id, TEST_PROJECT_ID));
		});

		it('enqueues both entry_created and confirmation_email', async () => {
			mockEnqueue.mockClear();

			const res = await postEntry(
				{ email: 'confirm-on-test@example.com' },
				{ 'x-api-key': testApiKey },
			);
			expect(res.status).toBe(201);

			const calls = mockEnqueue.mock.calls;
			const types = calls.map((c) => c[0].type);
			expect(types).toContain('entry_created');
			expect(types).toContain('confirmation_email');
		});

		it('passes correct data to confirmation_email enqueue', async () => {
			mockEnqueue.mockClear();

			const res = await postEntry(
				{ email: 'confirm-data-test@example.com' },
				{ 'x-api-key': testApiKey },
			);
			expect(res.status).toBe(201);
			const body = await res.json();

			const confirmCall = mockEnqueue.mock.calls.find((c) => c[0].type === 'confirmation_email');
			expect(confirmCall).toBeDefined();
			expect(confirmCall?.[0]).toEqual({
				entryId: body.data.id,
				projectId: TEST_PROJECT_ID,
				type: 'confirmation_email',
			});
		});
	});

	describe('when doubleOptIn is ON, sendConfirmationEmail is ON', () => {
		beforeAll(async () => {
			await db
				.update(projects)
				.set({ sendConfirmationEmail: true, doubleOptIn: true })
				.where(eq(projects.id, TEST_PROJECT_ID));
		});

		it('enqueues verification_email but NOT confirmation_email at submission time', async () => {
			mockEnqueue.mockClear();

			const res = await postEntry(
				{ email: 'doi-confirm-test@example.com' },
				{ 'x-api-key': testApiKey },
			);
			expect(res.status).toBe(201);

			const calls = mockEnqueue.mock.calls;
			const types = calls.map((c) => c[0].type);
			expect(types).toContain('verification_email');
			expect(types).not.toContain('confirmation_email');
			expect(types).not.toContain('entry_created');
		});
	});
});
