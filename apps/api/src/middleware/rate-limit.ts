// ABOUTME: Rate limiters for all API route groups using IETF draft-6 standard headers.
// ABOUTME: Provides per-IP throttling for auth, verify, dashboard, and per-API-key throttling for public API.

import { rateLimiter } from 'hono-rate-limiter';

// Public API: 60 requests/minute per API key (falls back to IP for unauthenticated)
export const apiRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 60,
	standardHeaders: 'draft-6',
	keyGenerator: (c) => c.req.header('x-api-key') ?? c.req.header('x-forwarded-for') ?? 'anonymous',
});

// Auth endpoints: 10 requests/minute per IP (login, signup, OAuth)
export const authRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-6',
	keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'anonymous',
});

// Verification endpoints: 20 requests/minute per IP (prevents token enumeration)
export const verifyRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 20,
	standardHeaders: 'draft-6',
	keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'anonymous',
});

// Dashboard endpoints (tRPC + upload): 120 requests/minute per IP
export const dashboardRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 120,
	standardHeaders: 'draft-6',
	keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'anonymous',
});
