// ABOUTME: Integration tests for tRPC notification settings: toggleSendConfirmationEmail and getSendConfirmationEmail.
// ABOUTME: Uses tRPC createCaller with a real seeded PostgreSQL database to verify toggle persistence and ownership checks.

import { createDb, type Database, projects } from '@pleasehold/db';
import { appRouter, type Context } from '@pleasehold/trpc';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TEST_PROJECT_ID, TEST_USER_ID } from '../../test/seed';

let db: Database;

function makeContext(userId: string): Context {
	return {
		db,
		session: {
			id: 'test-session',
			userId,
			expiresAt: new Date(Date.now() + 86400000),
		} as Context['session'],
		user: { id: userId, email: 'owner@test.com', name: 'Test User' } as Context['user'],
		auth: {} as Context['auth'],
		requestHeaders: new Headers(),
	};
}

beforeAll(() => {
	const testDatabaseUrl = process.env.TEST_DATABASE_URL;
	if (!testDatabaseUrl) {
		throw new Error('TEST_DATABASE_URL not set. Global setup may have failed.');
	}
	db = createDb(testDatabaseUrl);
});

beforeEach(async () => {
	// Reset project to default state before each test
	await db
		.update(projects)
		.set({ sendConfirmationEmail: false })
		.where(eq(projects.id, TEST_PROJECT_ID));
});

afterAll(async () => {
	await db
		.update(projects)
		.set({ sendConfirmationEmail: false })
		.where(eq(projects.id, TEST_PROJECT_ID));
});

describe('notification.getSendConfirmationEmail', () => {
	it('returns false by default', async () => {
		const caller = appRouter.createCaller(makeContext(TEST_USER_ID));
		const result = await caller.notification.getSendConfirmationEmail({
			projectId: TEST_PROJECT_ID,
		});
		expect(result).toEqual({ sendConfirmationEmail: false });
	});

	it('throws NOT_FOUND for non-existent project', async () => {
		const caller = appRouter.createCaller(makeContext(TEST_USER_ID));
		await expect(
			caller.notification.getSendConfirmationEmail({
				projectId: '00000000-0000-4000-8000-000000000099',
			}),
		).rejects.toThrow('Project not found');
	});

	it('throws NOT_FOUND when user does not own the project', async () => {
		const caller = appRouter.createCaller(makeContext('other-user-id'));
		await expect(
			caller.notification.getSendConfirmationEmail({ projectId: TEST_PROJECT_ID }),
		).rejects.toThrow('Project not found');
	});
});

describe('notification.toggleSendConfirmationEmail', () => {
	it('enables sendConfirmationEmail and returns new value', async () => {
		const caller = appRouter.createCaller(makeContext(TEST_USER_ID));

		const result = await caller.notification.toggleSendConfirmationEmail({
			projectId: TEST_PROJECT_ID,
			enabled: true,
		});
		expect(result).toEqual({ sendConfirmationEmail: true });

		// Verify it persisted
		const check = await caller.notification.getSendConfirmationEmail({
			projectId: TEST_PROJECT_ID,
		});
		expect(check.sendConfirmationEmail).toBe(true);
	});

	it('disables sendConfirmationEmail after being enabled', async () => {
		const caller = appRouter.createCaller(makeContext(TEST_USER_ID));

		await caller.notification.toggleSendConfirmationEmail({
			projectId: TEST_PROJECT_ID,
			enabled: true,
		});

		const result = await caller.notification.toggleSendConfirmationEmail({
			projectId: TEST_PROJECT_ID,
			enabled: false,
		});
		expect(result).toEqual({ sendConfirmationEmail: false });

		const check = await caller.notification.getSendConfirmationEmail({
			projectId: TEST_PROJECT_ID,
		});
		expect(check.sendConfirmationEmail).toBe(false);
	});

	it('throws NOT_FOUND when user does not own the project', async () => {
		const caller = appRouter.createCaller(makeContext('other-user-id'));
		await expect(
			caller.notification.toggleSendConfirmationEmail({
				projectId: TEST_PROJECT_ID,
				enabled: true,
			}),
		).rejects.toThrow('Project not found');
	});
});
