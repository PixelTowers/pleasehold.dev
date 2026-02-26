// ABOUTME: Double opt-in email verification endpoint that validates tokens and flips entry status.
// ABOUTME: Public route (no API key required) mounted at /verify/:token, enqueues owner notifications after verification.

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { type Database, entries } from '@pleasehold/db';
import { eq } from 'drizzle-orm';
import { enqueueNotification } from '../../lib/notification-queue';
import { ErrorResponseSchema, VerifyResponseSchema } from '../../openapi';

const verifyTokenRoute = createRoute({
	method: 'get',
	path: '/{token}',
	tags: ['Verification'],
	summary: 'Verify an entry email address',
	description:
		'Verify an entry via the token sent in the double opt-in email. Each token can only be used once and expires after 48 hours.',
	request: {
		params: z.object({
			token: z.string().uuid(),
		}),
	},
	responses: {
		200: {
			content: { 'application/json': { schema: VerifyResponseSchema } },
			description: 'Entry verified',
		},
		400: {
			content: { 'application/json': { schema: ErrorResponseSchema } },
			description: 'Invalid or expired token',
		},
	},
});

export function createVerifyRoute(db: Database) {
	const app = new OpenAPIHono();

	app.openapi(verifyTokenRoute, async (c) => {
		const token = c.req.param('token');

		const entry = await db.query.entries.findFirst({
			where: eq(entries.verificationToken, token),
		});

		const genericError = {
			error: {
				code: 'INVALID_TOKEN',
				message: 'Verification link is invalid or expired',
			},
		};

		if (!entry) {
			return c.json(genericError, 400);
		}

		if (entry.verificationExpiresAt && entry.verificationExpiresAt < new Date()) {
			return c.json(genericError, 400);
		}

		if (entry.verifiedAt) {
			return c.json(genericError, 400);
		}

		await db
			.update(entries)
			.set({
				status: 'new',
				verifiedAt: new Date(),
				verificationToken: null,
				updatedAt: new Date(),
			})
			.where(eq(entries.id, entry.id));

		// Fire-and-forget: notify project owner channels that a verified entry arrived
		enqueueNotification({
			entryId: entry.id,
			projectId: entry.projectId,
			type: 'entry_created',
		}).catch((err) => console.error('Failed to enqueue post-verification notification:', err));

		return c.json(
			{
				data: {
					verified: true as const,
					email: entry.email,
				},
			},
			200,
		);
	});

	return app;
}
