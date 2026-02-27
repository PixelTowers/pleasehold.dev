// ABOUTME: Integration tests for the verify endpoint's confirmation email enqueueing.
// ABOUTME: Verifies that confirmation_email is enqueued post-verification when sendConfirmationEmail is enabled.

import { OpenAPIHono } from '@hono/zod-openapi';
import { createDb, type Database, entries, projects } from '@pleasehold/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_PROJECT_ID } from '../../test/seed';
import { createVerifyRoute } from './verify';

// Mock the notification queue to spy on enqueue calls
vi.mock('../../lib/notification-queue', () => ({
	enqueueNotification: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
}));

import { enqueueNotification } from '../../lib/notification-queue';

const mockEnqueue = vi.mocked(enqueueNotification);

let app: OpenAPIHono;
let db: Database;

beforeAll(() => {
	const testDatabaseUrl = process.env.TEST_DATABASE_URL;
	if (!testDatabaseUrl) {
		throw new Error('TEST_DATABASE_URL not set. Global setup may have failed.');
	}

	db = createDb(testDatabaseUrl);

	const verifyApp = createVerifyRoute(db);
	app = new OpenAPIHono();
	app.route('/verify', verifyApp);
});

beforeEach(() => {
	mockEnqueue.mockClear();
});

afterAll(async () => {
	await db
		.update(projects)
		.set({ sendConfirmationEmail: false })
		.where(eq(projects.id, TEST_PROJECT_ID));
});

/**
 * Helper that inserts an entry in pending_verification state with a known token.
 */
async function createPendingEntry(email: string, token: string) {
	const [entry] = await db
		.insert(entries)
		.values({
			projectId: TEST_PROJECT_ID,
			email,
			position: 9999,
			status: 'pending_verification',
			verificationToken: token,
			verificationExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
		})
		.returning();
	return entry;
}

describe('GET /verify/:token — confirmation email enqueueing', () => {
	describe('when sendConfirmationEmail is OFF', () => {
		beforeAll(async () => {
			await db
				.update(projects)
				.set({ sendConfirmationEmail: false })
				.where(eq(projects.id, TEST_PROJECT_ID));
		});

		it('enqueues entry_created but NOT confirmation_email after verification', async () => {
			const token = crypto.randomUUID();
			await createPendingEntry('verify-no-confirm@example.com', token);

			const res = await app.request(`/verify/${token}`);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.data.verified).toBe(true);

			const types = mockEnqueue.mock.calls.map((c) => c[0].type);
			expect(types).toContain('entry_created');
			expect(types).not.toContain('confirmation_email');
		});
	});

	describe('when sendConfirmationEmail is ON', () => {
		beforeAll(async () => {
			await db
				.update(projects)
				.set({ sendConfirmationEmail: true })
				.where(eq(projects.id, TEST_PROJECT_ID));
		});

		it('enqueues both entry_created and confirmation_email after verification', async () => {
			const token = crypto.randomUUID();
			const _entry = await createPendingEntry('verify-with-confirm@example.com', token);
			mockEnqueue.mockClear();

			const res = await app.request(`/verify/${token}`);
			expect(res.status).toBe(200);

			const types = mockEnqueue.mock.calls.map((c) => c[0].type);
			expect(types).toContain('entry_created');
			expect(types).toContain('confirmation_email');
		});

		it('passes correct data to confirmation_email enqueue', async () => {
			const token = crypto.randomUUID();
			const entry = await createPendingEntry('verify-confirm-data@example.com', token);
			mockEnqueue.mockClear();

			const res = await app.request(`/verify/${token}`);
			expect(res.status).toBe(200);

			const confirmCall = mockEnqueue.mock.calls.find((c) => c[0].type === 'confirmation_email');
			expect(confirmCall).toBeDefined();
			expect(confirmCall?.[0]).toEqual({
				entryId: entry.id,
				projectId: TEST_PROJECT_ID,
				type: 'confirmation_email',
			});
		});
	});

	it('does not enqueue anything for invalid token', async () => {
		const res = await app.request(`/verify/${crypto.randomUUID()}`);
		expect(res.status).toBe(400);
		expect(mockEnqueue).not.toHaveBeenCalled();
	});

	it('does not enqueue anything for expired token', async () => {
		const token = crypto.randomUUID();
		// Create entry with already-expired token
		await db.insert(entries).values({
			projectId: TEST_PROJECT_ID,
			email: 'verify-expired@example.com',
			position: 9998,
			status: 'pending_verification',
			verificationToken: token,
			verificationExpiresAt: new Date(Date.now() - 1000),
		});

		const res = await app.request(`/verify/${token}`);
		expect(res.status).toBe(400);
		expect(mockEnqueue).not.toHaveBeenCalled();
	});
});
