// ABOUTME: Seed function that inserts a user, project, field config, and API key into the test database.
// ABOUTME: Uses Better Auth's server-side API to create a properly hashed API key for integration tests.

import type { createAuth } from '@pleasehold/auth';
import { authUsers, type Database, projectFieldConfigs, projects } from '@pleasehold/db';

export const TEST_USER_ID = 'test-user-1';
export const TEST_PROJECT_ID = '00000000-0000-4000-8000-000000000001';

/**
 * Returns the test API key from process.env, set by the global setup after seeding.
 * This indirection is needed because global setup and test workers run in separate processes.
 */
export function getTestApiKey(): string {
	const key = process.env.TEST_API_KEY;
	if (!key) throw new Error('TEST_API_KEY not set. Global setup may have failed.');
	return key;
}

export async function seed(db: Database, auth: ReturnType<typeof createAuth>): Promise<string> {
	const now = new Date();

	// 1. Insert a user into Better Auth's auth_users table
	await db.insert(authUsers).values({
		id: TEST_USER_ID,
		name: 'Test User',
		email: 'owner@test.com',
		emailVerified: true,
		createdAt: now,
		updatedAt: now,
	});

	// 2. Insert a project
	await db.insert(projects).values({
		id: TEST_PROJECT_ID,
		userId: TEST_USER_ID,
		name: 'Test Project',
		mode: 'waitlist',
		doubleOptIn: false,
		createdAt: now,
		updatedAt: now,
	});

	// 3. Insert a field config (email-only for simplicity)
	await db.insert(projectFieldConfigs).values({
		projectId: TEST_PROJECT_ID,
		collectName: false,
		collectCompany: false,
		collectMessage: false,
		createdAt: now,
		updatedAt: now,
	});

	// 4. Create an API key through Better Auth's server-side API.
	//    Server-side calls bypass session requirements when userId is provided.
	const result = await auth.api.createApiKey({
		body: {
			userId: TEST_USER_ID,
			metadata: { projectId: TEST_PROJECT_ID },
		},
	});

	// The response includes the plaintext key (only available at creation time).
	// Return it so the caller can store it in process.env for test workers.
	return result.key;
}
