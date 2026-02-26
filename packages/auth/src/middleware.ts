// ABOUTME: Hono middleware for auth session validation on protected routes.
// ABOUTME: Extracts session from request headers and adds user/session to the Hono context.

import type { Context, Next } from 'hono';

export async function authMiddleware(c: Context, next: Next) {
	const authHeader = c.req.header('Authorization');
	const cookieHeader = c.req.header('Cookie');

	if (!authHeader && !cookieHeader) {
		c.set('session', null);
		c.set('user', null);
		return next();
	}

	const auth = c.get('auth');
	if (!auth) {
		c.set('session', null);
		c.set('user', null);
		return next();
	}

	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	c.set('session', session?.session ?? null);
	c.set('user', session?.user ?? null);

	return next();
}
