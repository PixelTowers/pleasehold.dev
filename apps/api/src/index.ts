// ABOUTME: Main API server entry point using Hono with tRPC, Better Auth, and public REST API.
// ABOUTME: Serves tRPC at /trpc/*, auth at /api/auth/*, entry submission at /api/v1/entries, and health check.

import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { createAuth } from '@pleasehold/auth';
import { createDb } from '@pleasehold/db';
import { appRouter, createContext } from '@pleasehold/trpc';
import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { apiKeyAuth } from './middleware/api-key-auth';
import { apiRateLimiter } from './middleware/rate-limit';
import { entriesRoute } from './routes/v1/entries';
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
app.use(
	'/api/auth/*',
	cors({
		origin: [webUrl],
		credentials: true,
	}),
);

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
	const response = await auth.handler(c.req.raw);
	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	});
});

app.get('/health', (c) => {
	return c.json({ status: 'ok' });
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
	servers: [{ url: 'http://localhost:3001', description: 'Local development' }],
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
