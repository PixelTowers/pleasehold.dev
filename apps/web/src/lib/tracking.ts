// ABOUTME: Analytics tracking layer that logs all events via pino and forwards to PostHog.
// ABOUTME: All consumer code imports from here — never directly from posthog.ts.

import { createLogger } from './logger';
import { initPostHog, posthog } from './posthog';

const log = createLogger('tracking');

export function initTracking() {
	initPostHog();
	log.info('initialized');
}

export function identify(userId: string, properties?: Record<string, string>) {
	log.info({ userId, ...properties }, 'identify');
	posthog.identify(userId, properties);
}

export function capture(event: string, properties?: Record<string, unknown>) {
	log.info({ event, ...properties }, 'capture');
	posthog.capture(event, properties);
}

export function reset() {
	log.info('reset');
	posthog.reset();
}
