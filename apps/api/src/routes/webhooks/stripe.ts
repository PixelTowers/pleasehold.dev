// ABOUTME: Stripe webhook handler for subscription lifecycle events (checkout, update, delete).
// ABOUTME: Verifies webhook signature, then syncs subscription state to the subscriptions table.

import type { Database } from '@pleasehold/db';
import { subscriptions } from '@pleasehold/db';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import Stripe from 'stripe';
import { posthog } from '../../lib/posthog';

export function createStripeWebhookRoute(db: Database) {
	const app = new Hono();

	app.post('/', async (c) => {
		const secretKey = process.env.STRIPE_SECRET_KEY;
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

		if (!secretKey || !webhookSecret) {
			return c.json({ error: 'Stripe not configured' }, 500);
		}

		const stripe = new Stripe(secretKey);
		const body = await c.req.text();
		const signature = c.req.header('stripe-signature');

		if (!signature) {
			return c.json({ error: 'Missing stripe-signature header' }, 400);
		}

		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
		} catch (err) {
			console.error('Stripe webhook signature verification failed:', err);
			return c.json({ error: 'Invalid signature' }, 400);
		}

		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				const userId = session.metadata?.userId;
				if (!userId || !session.subscription || !session.customer) break;

				const subscriptionId =
					typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
				const customerId =
					typeof session.customer === 'string' ? session.customer : session.customer.id;

				// Fetch the subscription to get the current period end from items
				const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
				const periodEnd = stripeSub.items?.data?.[0]?.current_period_end;

				await db
					.update(subscriptions)
					.set({
						plan: 'pro',
						stripeCustomerId: customerId,
						stripeSubscriptionId: subscriptionId,
						currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
						cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
						updatedAt: new Date(),
					})
					.where(eq(subscriptions.userId, userId));

				posthog.capture({
					distinctId: userId,
					event: 'subscription_upgraded',
					properties: { subscriptionId, customerId },
				});
				console.log(`Subscription activated for user ${userId}`);
				break;
			}

			case 'customer.subscription.updated': {
				const sub = event.data.object as Stripe.Subscription;
				const subscriptionId = sub.id;
				const itemPeriodEnd = sub.items?.data?.[0]?.current_period_end;

				await db
					.update(subscriptions)
					.set({
						currentPeriodEnd: itemPeriodEnd ? new Date(itemPeriodEnd * 1000) : null,
						cancelAtPeriodEnd: sub.cancel_at_period_end,
						updatedAt: new Date(),
					})
					.where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

				posthog.capture({
					distinctId: subscriptionId,
					event: 'subscription_updated',
					properties: { cancelAtPeriodEnd: sub.cancel_at_period_end },
				});
				console.log(`Subscription updated: ${subscriptionId}`);
				break;
			}

			case 'customer.subscription.deleted': {
				const sub = event.data.object as Stripe.Subscription;
				const subscriptionId = sub.id;

				await db
					.update(subscriptions)
					.set({
						plan: 'free',
						stripeSubscriptionId: null,
						currentPeriodEnd: null,
						cancelAtPeriodEnd: false,
						updatedAt: new Date(),
					})
					.where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

				posthog.capture({
					distinctId: subscriptionId,
					event: 'subscription_canceled',
				});
				console.log(`Subscription canceled: ${subscriptionId}`);
				break;
			}

			default:
				// Unhandled event type — acknowledge receipt
				break;
		}

		return c.json({ received: true });
	});

	return app;
}
