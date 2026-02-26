// ABOUTME: Per-API-key rate limiter for /api/v1/* routes using IETF draft-6 standard headers.
// ABOUTME: Limits to 60 requests per minute per API key, falling back to IP for unauthenticated requests.

import { rateLimiter } from 'hono-rate-limiter';

export const apiRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 60,
	standardHeaders: 'draft-6',
	keyGenerator: (c) => c.req.header('x-api-key') ?? c.req.header('x-forwarded-for') ?? 'anonymous',
});
