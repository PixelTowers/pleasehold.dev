// ABOUTME: Drizzle Kit configuration for migration generation and studio.
// ABOUTME: Points to the schema barrel export and reads DATABASE_URL from env.

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/schema/index.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
