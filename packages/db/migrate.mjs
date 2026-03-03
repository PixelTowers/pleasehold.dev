// ABOUTME: Standalone database migration runner for Docker container startup.
// ABOUTME: Uses drizzle-orm programmatic migrate() to apply pending SQL migrations.

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionUrl = process.env.DATABASE_URL;

if (!connectionUrl) {
	console.log('[migrate] DATABASE_URL not set, skipping migrations.');
	process.exit(0);
}

const client = postgres(connectionUrl, { max: 1 });
const db = drizzle(client);

try {
	console.log('[migrate] Running database migrations...');
	await migrate(db, { migrationsFolder: new URL('./drizzle', import.meta.url).pathname });
	console.log('[migrate] Migrations complete.');
} catch (error) {
	console.error('[migrate] Migration failed:', error);
	process.exit(1);
} finally {
	await client.end();
}
