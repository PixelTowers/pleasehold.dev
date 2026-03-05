// ABOUTME: Unit tests for plan limit constants and billing-enabled helper.
// ABOUTME: Verifies free vs pro limits and STRIPE_SECRET_KEY environment detection.

import { afterEach, describe, expect, it } from 'vitest';
import { isBillingEnabled, PLAN_LIMITS } from './plan-limits';

describe('PLAN_LIMITS', () => {
	it('free plan has correct limits', () => {
		expect(PLAN_LIMITS.free.maxEntriesPerMonth).toBe(1_000);
		expect(PLAN_LIMITS.free.maxProjects).toBe(1);
		expect(PLAN_LIMITS.free.customBranding).toBe(false);
		expect(PLAN_LIMITS.free.customEmailTemplates).toBe(false);
		expect(PLAN_LIMITS.free.removeBadge).toBe(false);
		expect(PLAN_LIMITS.free.maxTeamMembers).toBe(1);
	});

	it('pro plan has unlimited entries and projects', () => {
		expect(PLAN_LIMITS.pro.maxEntriesPerMonth).toBe(Number.POSITIVE_INFINITY);
		expect(PLAN_LIMITS.pro.maxProjects).toBe(Number.POSITIVE_INFINITY);
	});

	it('pro plan has all features enabled', () => {
		expect(PLAN_LIMITS.pro.customBranding).toBe(true);
		expect(PLAN_LIMITS.pro.customEmailTemplates).toBe(true);
		expect(PLAN_LIMITS.pro.removeBadge).toBe(true);
		expect(PLAN_LIMITS.pro.maxTeamMembers).toBe(5);
	});
});

describe('isBillingEnabled', () => {
	const originalEnv = process.env.STRIPE_SECRET_KEY;

	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env.STRIPE_SECRET_KEY = originalEnv;
		} else {
			delete process.env.STRIPE_SECRET_KEY;
		}
	});

	it('returns false when STRIPE_SECRET_KEY is not set', () => {
		delete process.env.STRIPE_SECRET_KEY;
		expect(isBillingEnabled()).toBe(false);
	});

	it('returns false when STRIPE_SECRET_KEY is empty string', () => {
		process.env.STRIPE_SECRET_KEY = '';
		expect(isBillingEnabled()).toBe(false);
	});

	it('returns true when STRIPE_SECRET_KEY is set', () => {
		process.env.STRIPE_SECRET_KEY = 'sk_test_123';
		expect(isBillingEnabled()).toBe(true);
	});
});
