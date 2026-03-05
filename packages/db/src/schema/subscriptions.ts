// ABOUTME: Subscriptions table tracking user billing plan (free/pro) and Stripe integration.
// ABOUTME: One-to-one with auth_users; stores Stripe customer/subscription IDs and billing period.

import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authUsers } from './auth';

export const subscriptions = pgTable('subscriptions', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	plan: text('plan', { enum: ['free', 'pro'] })
		.notNull()
		.default('free'),
	stripeCustomerId: text('stripe_customer_id').unique(),
	stripeSubscriptionId: text('stripe_subscription_id').unique(),
	currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
	cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
