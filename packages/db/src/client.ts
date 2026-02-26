// ABOUTME: Database client factory using postgres.js and Drizzle ORM.
// ABOUTME: Creates a typed database instance from a connection URL.

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export type Database = ReturnType<typeof createDb>;

export function createDb(connectionUrl: string) {
	const client = postgres(connectionUrl);
	return drizzle(client, { schema });
}
