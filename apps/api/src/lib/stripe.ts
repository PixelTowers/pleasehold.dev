// ABOUTME: Stripe client singleton; exports null when STRIPE_SECRET_KEY is not set.
// ABOUTME: Self-hosted instances run without Stripe — callers must null-check before use.

import Stripe from 'stripe';

export const stripe = process.env.STRIPE_SECRET_KEY
	? new Stripe(process.env.STRIPE_SECRET_KEY)
	: null;
