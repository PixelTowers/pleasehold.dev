// ABOUTME: PostHog client initialization — internal module consumed by the tracking layer.
// ABOUTME: Uses the EU cloud host with the shared project key from apps/www.

import posthog from 'posthog-js';

const POSTHOG_KEY = 'phc_XHvJWSzKVOO7b7y2d3IoIGmsrVoT8tg1KBYe3CfUN6j';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

let initialized = false;

export function initPostHog() {
	if (initialized) return;
	posthog.init(POSTHOG_KEY, {
		api_host: POSTHOG_HOST,
		capture_pageview: true,
		capture_pageleave: true,
	});
	initialized = true;
}

export { posthog };
