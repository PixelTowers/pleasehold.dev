// ABOUTME: Pino logger configured for browser use with structured JSON output.
// ABOUTME: Creates named child loggers via createLogger() for per-module context.

import pino from 'pino';

const isDev = (import.meta as unknown as { env: { DEV: boolean } }).env.DEV;

const rootLogger = pino({
	browser: { asObject: false },
	level: isDev ? 'debug' : 'info',
});

export function createLogger(name: string) {
	return rootLogger.child({ module: name });
}
