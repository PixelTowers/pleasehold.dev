// ABOUTME: Main API server entry point using Hono with tRPC, Better Auth, and public REST API.
// ABOUTME: Serves tRPC at /trpc/*, auth at /api/auth/*, entry submission at /api/v1/entries, and health check.

import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { createAuth } from '@pleasehold/auth';
import { createDb } from '@pleasehold/db';
import { appRouter, createContext } from '@pleasehold/trpc';
import { apiReference } from '@scalar/hono-api-reference';
import { sql } from 'drizzle-orm';
import { cors } from 'hono/cors';
import { apiKeyAuth } from './middleware/api-key-auth';
import {
	apiRateLimiter,
	authRateLimiter,
	dashboardRateLimiter,
	verifyRateLimiter,
} from './middleware/rate-limit';
import { entriesRoute } from './routes/v1/entries';
import { createUploadRoute } from './routes/v1/upload';
import { createVerifyRoute } from './routes/v1/verify';

const app = new OpenAPIHono();

const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';

const db = createDb(process.env.DATABASE_URL!);

const auth = createAuth({
	db,
	secret: process.env.BETTER_AUTH_SECRET!,
	baseUrl: process.env.API_URL ?? 'http://localhost:3000',
	trustedOrigins: [webUrl],
	googleClientId: process.env.GOOGLE_CLIENT_ID,
	googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
	githubClientId: process.env.GITHUB_CLIENT_ID,
	githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
});

// Public verification endpoint: no API key required, permissive CORS for email link clicks
app.use('/verify/*', cors({ origin: '*' }));
app.use('/verify/*', verifyRateLimiter);
app.route('/verify', createVerifyRoute(db));

// Public REST API: permissive CORS for external developer origins
app.use('/api/v1/*', cors({ origin: '*' }));

// Rate limit BEFORE auth to prevent DB flood from unauthenticated requests
app.use('/api/v1/*', apiRateLimiter);

// API key auth: verify key, resolve project + field config, attach to context
app.use('/api/v1/*', apiKeyAuth(auth, db));

// Mount entry submission route
app.route('/api/v1/entries', entriesRoute);

// Dashboard CORS: restricted to web app origin (trpc, auth, health)
app.use(
	'/trpc/*',
	cors({
		origin: [webUrl],
		credentials: true,
	}),
);
app.use('/trpc/*', dashboardRateLimiter);
app.use(
	'/api/auth/*',
	cors({
		origin: [webUrl],
		credentials: true,
	}),
);
// Strict rate limit on auth mutation endpoints (brute-force protection)
app.use('/api/auth/sign-in/*', authRateLimiter);
app.use('/api/auth/sign-up/*', authRateLimiter);
app.use('/api/auth/forget-password', authRateLimiter);
app.use('/api/auth/reset-password', authRateLimiter);
app.use('/api/auth/change-password', authRateLimiter);
app.use('/api/auth/change-email', authRateLimiter);
// Session checks (get-session, etc.) use the more generous dashboard limit.
// Skip paths already covered by authRateLimiter to avoid double-counting.
app.use('/api/auth/*', async (c, next) => {
	const path = c.req.path;
	const strictPaths = [
		'/api/auth/sign-in/',
		'/api/auth/sign-up/',
		'/api/auth/forget-password',
		'/api/auth/reset-password',
		'/api/auth/change-password',
		'/api/auth/change-email',
	];
	if (strictPaths.some((p) => path.startsWith(p))) {
		return next();
	}
	return dashboardRateLimiter(c, next);
});
app.use(
	'/api/upload/*',
	cors({
		origin: [webUrl],
		credentials: true,
	}),
);
app.use('/api/upload/*', dashboardRateLimiter);

// Mount file upload route (dashboard-only, session-authenticated)
app.route('/api/upload', createUploadRoute(auth));

app.use(
	'/trpc/*',
	trpcServer({
		router: appRouter,
		createContext: async (_opts, c) => {
			const authSession = await auth.api.getSession({
				headers: c.req.raw.headers,
			});

			return createContext({
				db,
				session: authSession?.session ?? null,
				user: authSession?.user ?? null,
				auth,
				requestHeaders: c.req.raw.headers,
			});
		},
	}),
);

app.all('/api/auth/*', async (c) => {
	const reqDiag = {
		url: c.req.raw.url,
		method: c.req.method,
		path: c.req.path,
		host: c.req.header('host') ?? null,
		xForwardedProto: c.req.header('x-forwarded-proto') ?? null,
		xForwardedFor: c.req.header('x-forwarded-for') ?? null,
		origin: c.req.header('origin') ?? null,
	};
	try {
		const response = await auth.handler(c.req.raw);
		if (response.status >= 400) {
			const body = await response.clone().text();
			console.error(
				`[auth] ${c.req.method} ${c.req.path} → ${response.status}`,
				body || '(empty body)',
				JSON.stringify(reqDiag),
			);
			return c.json(
				{
					error: 'Auth error',
					status: response.status,
					body: body || null,
					path: c.req.path,
					_debug: reqDiag,
				},
				response.status as 400,
			);
		}
		return new Response(response.body, {
			status: response.status,
			headers: response.headers,
		});
	} catch (error) {
		console.error('[auth] Unhandled error:', error, JSON.stringify(reqDiag));
		return c.json({ error: 'Internal auth error', details: String(error), _debug: reqDiag }, 500);
	}
});

app.get('/health', (c) => {
	return c.json({ status: 'ok' });
});

// Temporary diagnostic endpoint — remove after OAuth debugging
app.get('/api/debug/env', async (c) => {
	let dbCheck = 'not tested';
	try {
		const rows = await db.execute(
			sql`SELECT COUNT(*)::text as cnt FROM information_schema.tables WHERE table_name = 'verifications' AND table_schema = 'public'`,
		);
		const cnt = String((rows as unknown as Array<Record<string, unknown>>)?.[0]?.cnt ?? 'unknown');
		dbCheck =
			cnt === '1' ? 'verifications table EXISTS' : `verifications table MISSING (count=${cnt})`;
	} catch (e) {
		dbCheck = `DB error: ${String(e)}`;
	}
	return c.json({
		GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID
			? `set (${process.env.GITHUB_CLIENT_ID.length} chars, starts: ${process.env.GITHUB_CLIENT_ID.slice(0, 4)}...)`
			: 'NOT SET',
		GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET
			? `set (${process.env.GITHUB_CLIENT_SECRET.length} chars)`
			: 'NOT SET',
		API_URL: process.env.API_URL ?? 'NOT SET',
		WEB_URL: process.env.WEB_URL ?? 'NOT SET',
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? 'set' : 'NOT SET',
		verifications_table: dbCheck,
	});
});

// Register API key security scheme in the OpenAPI registry
app.openAPIRegistry.registerComponent('securitySchemes', 'apiKey', {
	type: 'apiKey',
	in: 'header',
	name: 'x-api-key',
	description: 'Project-scoped API key (ph_live_...)',
});

// OpenAPI JSON spec endpoint
app.doc('/doc', {
	openapi: '3.0.0',
	info: {
		title: 'pleasehold API',
		version: '1.0.0',
		description:
			'API-first waitlist and demo-booking service. Integrate with a single API key and POST request.',
	},
	servers: [{ url: process.env.API_URL ?? 'http://localhost:3001', description: 'API Server' }],
});

// Interactive API documentation
app.get(
	'/docs',
	apiReference({
		url: '/doc',
		pageTitle: 'pleasehold API Reference',
	}),
);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, () => {
	console.log(`API server running on http://localhost:${port}`);
});
