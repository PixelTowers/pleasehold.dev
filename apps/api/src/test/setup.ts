// ABOUTME: Global Vitest setup/teardown for integration tests against a real PostgreSQL database.
// ABOUTME: Creates a unique test database, pushes schema via drizzle-kit, seeds data, and drops the DB after tests.

import { execSync } from 'node:child_process';
import postgres from 'postgres';

let testDbName: string;
let baseUrl: string;

/**
 * Derives the base PostgreSQL URL (pointing at the `postgres` system database)
 * from the provided DATABASE_URL. This is used for CREATE/DROP DATABASE commands.
 */
function getBaseUrl(databaseUrl: string): string {
	const url = new URL(databaseUrl);
	url.pathname = '/postgres';
	return url.toString();
}

export async function setup() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_URL required for integration tests. Point it at a test PostgreSQL instance.',
		);
	}

	testDbName = `pleasehold_test_${Date.now()}`;
	baseUrl = getBaseUrl(databaseUrl);

	// Connect to base postgres DB to create the test database
	const adminSql = postgres(baseUrl, { max: 1 });
	await adminSql.unsafe(`CREATE DATABASE "${testDbName}"`);
	await adminSql.end();

	// Build the test database connection URL
	const testUrl = new URL(databaseUrl);
	testUrl.pathname = `/${testDbName}`;
	const testDatabaseUrl = testUrl.toString();

	// Push schema using drizzle-kit (reads schema from packages/db).
	// On a fresh empty database, drizzle-kit push applies all tables without interactive prompts.
	execSync('pnpm drizzle-kit push', {
		cwd: new URL('../../../../packages/db', import.meta.url).pathname,
		env: { ...process.env, DATABASE_URL: testDatabaseUrl },
		stdio: 'pipe',
	});

	// Seed test data using Better Auth's real API key creation flow
	const { createDb } = await import('@pleasehold/db');
	const { createAuth } = await import('@pleasehold/auth');
	const { seed } = await import('./seed.js');

	const db = createDb(testDatabaseUrl);
	const auth = createAuth({
		db,
		secret: 'test-secret-at-least-32-characters-long',
		baseUrl: 'http://localhost:3001',
		trustedOrigins: ['http://localhost:5173'],
	});

	const apiKey = await seed(db, auth);

	// Store values in process.env so vitest worker processes inherit them.
	// Global setup runs before workers are forked, so env vars propagate.
	process.env.TEST_DATABASE_URL = testDatabaseUrl;
	process.env.TEST_API_KEY = apiKey;
	// Also provide DATABASE_URL so the app's createDb picks it up in test workers
	process.env.DATABASE_URL = testDatabaseUrl;
	// Auth secret for test app instances
	process.env.BETTER_AUTH_SECRET = 'test-secret-at-least-32-characters-long';
}

export async function teardown() {
	if (!testDbName || !baseUrl) return;

	const adminSql = postgres(baseUrl, { max: 1 });

	// Terminate active connections to the test database
	await adminSql.unsafe(
		`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${testDbName}' AND pid <> pg_backend_pid()`,
	);

	await adminSql.unsafe(`DROP DATABASE IF EXISTS "${testDbName}"`);
	await adminSql.end();
}
