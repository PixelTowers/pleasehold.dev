// ABOUTME: Server-side PostHog client for API event tracking.
// ABOUTME: Singleton instance shared across the API — uses the same project key as the frontend.

import { PostHog } from 'posthog-node';

const POSTHOG_KEY = 'phc_XHvJWSzKVOO7b7y2d3IoIGmsrVoT8tg1KBYe3CfUN6j';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

export const posthog = new PostHog(POSTHOG_KEY, {
	host: POSTHOG_HOST,
	flushAt: 20,
	flushInterval: 10_000,
});

// Flush pending events on shutdown
process.on('beforeExit', async () => {
	await posthog.shutdown();
});
