// ABOUTME: Unit tests for the Stripe webhook handler covering subscription lifecycle events.
// ABOUTME: Mocks Stripe signature verification and DB operations to test event routing and state changes.

import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DB operations
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn().mockResolvedValue([]);

// Mock Stripe
const mockConstructEvent = vi.fn();
const mockRetrieveSubscription = vi.fn();

vi.mock('stripe', () => {
	const MockStripe = vi.fn().mockImplementation(function (this: unknown) {
		(this as Record<string, unknown>).webhooks = {
			constructEvent: mockConstructEvent,
		};
		(this as Record<string, unknown>).subscriptions = {
			retrieve: mockRetrieveSubscription,
		};
	});
	return { default: MockStripe };
});

import { createStripeWebhookRoute } from './stripe';

function resetDbChain() {
	mockWhere.mockResolvedValue([]);
	mockSet.mockReturnValue({ where: mockWhere });
	mockUpdate.mockReturnValue({ set: mockSet });
}

const mockDb = { update: mockUpdate } as unknown;
const app = createStripeWebhookRoute(mockDb as never);

function webhookRequest(body: string, signature = 'valid-sig') {
	return app.request('/', {
		method: 'POST',
		body,
		headers: {
			'Content-Type': 'application/json',
			'stripe-signature': signature,
		},
	});
}

const PRO_PRICE_ID = 'price_pro_yearly';

beforeEach(() => {
	vi.clearAllMocks();
	resetDbChain();
	process.env.STRIPE_SECRET_KEY = 'sk_test_123';
	process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
	process.env.STRIPE_PRO_PRICE_ID = PRO_PRICE_ID;
});

describe('Stripe webhook handler', () => {
	it('returns 500 when Stripe is not configured', async () => {
		delete process.env.STRIPE_SECRET_KEY;
		const res = await webhookRequest('{}');
		expect(res.status).toBe(500);
	});

	it('returns 400 when stripe-signature header is missing', async () => {
		const res = await app.request('/', {
			method: 'POST',
			body: '{}',
			headers: { 'Content-Type': 'application/json' },
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Missing stripe-signature header');
	});

	it('returns 400 when signature verification fails', async () => {
		mockConstructEvent.mockImplementation(() => {
			throw new Error('Invalid signature');
		});

		const res = await webhookRequest('{}', 'bad-sig');
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Invalid signature');
	});

	it('handles checkout.session.completed and sets plan to pro', async () => {
		mockConstructEvent.mockReturnValue({
			type: 'checkout.session.completed',
			data: {
				object: {
					metadata: { userId: 'user-1' },
					subscription: 'sub_123',
					customer: 'cus_456',
				} as Partial<Stripe.Checkout.Session>,
			},
		});

		mockRetrieveSubscription.mockResolvedValue({
			items: {
				data: [{ price: { id: PRO_PRICE_ID }, current_period_end: 1700000000 }],
			},
			cancel_at_period_end: false,
		});

		const res = await webhookRequest('{"type":"checkout.session.completed"}');
		expect(res.status).toBe(200);

		expect(mockUpdate).toHaveBeenCalled();
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				plan: 'pro',
				stripeCustomerId: 'cus_456',
				stripeSubscriptionId: 'sub_123',
				cancelAtPeriodEnd: false,
			}),
		);
	});

	it('handles customer.subscription.updated and syncs period end', async () => {
		mockConstructEvent.mockReturnValue({
			type: 'customer.subscription.updated',
			data: {
				object: {
					id: 'sub_123',
					items: {
						data: [{ price: { id: PRO_PRICE_ID }, current_period_end: 1800000000 }],
					},
					cancel_at_period_end: true,
				} as Partial<Stripe.Subscription>,
			},
		});

		const res = await webhookRequest('{"type":"customer.subscription.updated"}');
		expect(res.status).toBe(200);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				cancelAtPeriodEnd: true,
			}),
		);
	});

	it('handles customer.subscription.deleted and sets plan to free', async () => {
		mockConstructEvent.mockReturnValue({
			type: 'customer.subscription.deleted',
			data: {
				object: {
					id: 'sub_123',
					items: {
						data: [{ price: { id: PRO_PRICE_ID } }],
					},
				} as Partial<Stripe.Subscription>,
			},
		});

		const res = await webhookRequest('{"type":"customer.subscription.deleted"}');
		expect(res.status).toBe(200);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				plan: 'free',
				stripeSubscriptionId: null,
				currentPeriodEnd: null,
				cancelAtPeriodEnd: false,
			}),
		);
	});

	it('ignores subscription events for other products', async () => {
		mockConstructEvent.mockReturnValue({
			type: 'customer.subscription.updated',
			data: {
				object: {
					id: 'sub_other_product',
					items: {
						data: [{ price: { id: 'price_some_other_product' }, current_period_end: 1800000000 }],
					},
					cancel_at_period_end: false,
				} as Partial<Stripe.Subscription>,
			},
		});

		const res = await webhookRequest('{"type":"customer.subscription.updated"}');
		expect(res.status).toBe(200);
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('acknowledges unhandled event types with 200', async () => {
		mockConstructEvent.mockReturnValue({
			type: 'invoice.paid',
			data: { object: {} },
		});

		const res = await webhookRequest('{"type":"invoice.paid"}');
		expect(res.status).toBe(200);
		expect(mockUpdate).not.toHaveBeenCalled();
	});
});
