// ABOUTME: tRPC context factory for use with Hono API server.
// ABOUTME: Provides database access, auth session, auth instance, and request headers to all procedures.

import type { AuthSession, AuthUser, createAuth } from '@pleasehold/auth';
import type { Database } from '@pleasehold/db';

export interface Context {
	[key: string]: unknown;
	db: Database;
	session: AuthSession | null;
	user: AuthUser | null;
	auth: ReturnType<typeof createAuth>;
	requestHeaders: Headers;
}

export function createContext(opts: {
	db: Database;
	session: AuthSession | null;
	user: AuthUser | null;
	auth: ReturnType<typeof createAuth>;
	requestHeaders: Headers;
}): Context {
	return {
		db: opts.db,
		session: opts.session,
		user: opts.user,
		auth: opts.auth,
		requestHeaders: opts.requestHeaders,
	};
}
