// ABOUTME: Rate limiters for all API route groups using IETF draft-6 standard headers.
// ABOUTME: Provides per-IP throttling for auth, verify, dashboard, and per-API-key throttling for public API with Redis-backed persistence.

import { type RedisClient, RedisStore, rateLimiter } from 'hono-rate-limiter';
import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT ?? '6380');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const redis = new Redis({
	host: REDIS_HOST,
	port: REDIS_PORT,
	password: REDIS_PASSWORD,
	lazyConnect: true,
	maxRetriesPerRequest: 1,
});

/** Adapts ioredis to the RedisClient interface expected by hono-rate-limiter's RedisStore. */
const redisClient: RedisClient = {
	scriptLoad: (script: string) => redis.script('LOAD', script) as Promise<string>,
	evalsha: <TArgs extends unknown[], TData = unknown>(sha1: string, keys: string[], args: TArgs) =>
		redis.evalsha(sha1, keys.length, ...keys, ...(args as string[])) as Promise<TData>,
	decr: (key: string) => redis.decr(key),
	del: (key: string) => redis.del(key),
};

/**
 * Extract the most trustworthy client IP from request headers.
 * Prefers x-real-ip (set by nginx from $remote_addr) over x-forwarded-for
 * to prevent spoofing via appended IPs.
 */
function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
	return (
		c.req.header('x-real-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
	);
}

// Public API: 60 requests/minute per API key (falls back to IP for unauthenticated)
export const apiRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 60,
	standardHeaders: 'draft-6',
	store: new RedisStore({ client: redisClient, prefix: 'rl:api:' }),
	keyGenerator: (c) => c.req.header('x-api-key') ?? getClientIp(c),
});

// Auth endpoints: 10 requests/minute per IP (login, signup, password reset, etc.)
export const authRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-6',
	store: new RedisStore({ client: redisClient, prefix: 'rl:auth:' }),
	keyGenerator: (c) => getClientIp(c),
});

// Verification endpoints: 20 requests/minute per IP (prevents token enumeration)
export const verifyRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 20,
	standardHeaders: 'draft-6',
	store: new RedisStore({ client: redisClient, prefix: 'rl:verify:' }),
	keyGenerator: (c) => getClientIp(c),
});

// Dashboard endpoints (tRPC + upload): 120 requests/minute per IP
export const dashboardRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 120,
	standardHeaders: 'draft-6',
	store: new RedisStore({ client: redisClient, prefix: 'rl:dash:' }),
	keyGenerator: (c) => getClientIp(c),
});
