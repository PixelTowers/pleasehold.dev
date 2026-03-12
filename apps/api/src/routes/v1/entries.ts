// ABOUTME: POST handler for public entry submission API with deduplication and atomic position assignment.
// ABOUTME: Validates input against project field config, inserts with onConflictDoNothing, returns queue position.

import crypto from 'node:crypto';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { entries } from '@pleasehold/db';
import { and, count, eq, gte, sql } from 'drizzle-orm';
import { buildEntrySchema } from '../../lib/field-validator';
import { enqueueNotification } from '../../lib/notification-queue';
import { posthog } from '../../lib/posthog';
import type { ApiKeyVariables } from '../../middleware/api-key-auth';
import { EntryRequestSchema, EntryResponseSchema, ErrorResponseSchema } from '../../openapi';

const submitEntryRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Entries'],
	summary: 'Submit a waitlist or demo-booking entry',
	description:
		'Submit a new entry for the project associated with the provided API key. If double opt-in is enabled, the entry will require email verification before becoming active.',
	security: [{ apiKey: [] }],
	request: {
		body: {
			content: {
				'application/json': {
					schema: EntryRequestSchema,
				},
			},
		},
	},
	responses: {
		201: {
			content: { 'application/json': { schema: EntryResponseSchema } },
			description: 'Entry created',
		},
		200: {
			content: { 'application/json': { schema: EntryResponseSchema } },
			description: 'Duplicate entry returned',
		},
		400: {
			content: { 'application/json': { schema: ErrorResponseSchema } },
			description: 'Validation error',
		},
		401: {
			content: { 'application/json': { schema: ErrorResponseSchema } },
			description: 'Invalid API key',
		},
		429: {
			description: 'Rate limit exceeded',
		},
	},
});

const app = new OpenAPIHono<{ Variables: ApiKeyVariables }>();

app.openapi(submitEntryRoute, async (c) => {
	const project = c.get('project');
	const db = c.get('db');

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json(
			{ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
			400,
		);
	}

	const schema = buildEntrySchema(project.fieldConfig);
	const parseResult = schema.safeParse(body);

	if (!parseResult.success) {
		return c.json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid submission',
					details: parseResult.error.issues.map((issue) => ({
						field: issue.path.join('.'),
						message: issue.message,
					})),
				},
			},
			400,
		);
	}

	const data = parseResult.data as {
		email: string;
		name?: string;
		company?: string;
		message?: string;
		metadata?: Record<string, string | number | boolean | null>;
	};

	// Enforce monthly entry limit for free-plan users when billing is enabled.
	// Check for duplicates first so re-submissions at the limit still return 200.
	const plan = c.get('plan');
	const billingEnabled = !!process.env.STRIPE_SECRET_KEY;

	if (billingEnabled && plan === 'free') {
		const existingEntry = await db.query.entries.findFirst({
			where: and(eq(entries.projectId, project.id), eq(entries.email, data.email)),
		});

		if (!existingEntry) {
			const startOfMonth = new Date();
			startOfMonth.setDate(1);
			startOfMonth.setHours(0, 0, 0, 0);

			const [{ count: monthlyCount }] = await db
				.select({ count: count() })
				.from(entries)
				.where(and(eq(entries.projectId, project.id), gte(entries.createdAt, startOfMonth)));

			if (monthlyCount >= 100) {
				posthog.capture({
					distinctId: project.id,
					event: 'entry_limit_reached',
					properties: { projectId: project.id, monthlyCount },
				});

				return c.json(
					{
						error: {
							code: 'ENTRY_LIMIT_REACHED',
							message:
								'Monthly entry limit reached (100 entries/month on the free plan). Upgrade to Pro for unlimited entries.',
						},
					},
					429,
				);
			}
		}
	}

	const verificationToken = project.doubleOptIn ? crypto.randomUUID() : null;
	const verificationExpiresAt = project.doubleOptIn
		? new Date(Date.now() + 48 * 60 * 60 * 1000)
		: null;

	// Use a transaction with serializable isolation to prevent position race conditions
	// and ensure atomic insert+status for double opt-in
	const insertResult = await db.transaction(
		async (tx) => {
			return tx
				.insert(entries)
				.values({
					projectId: project.id,
					email: data.email,
					name: data.name ?? null,
					company: data.company ?? null,
					message: data.message ?? null,
					metadata: data.metadata ?? null,
					status: project.doubleOptIn ? 'pending_verification' : 'new',
					verificationToken,
					verificationExpiresAt,
					position: sql`(SELECT COALESCE(MAX(${entries.position}), 0) + 1 FROM ${entries} WHERE ${entries.projectId} = ${project.id})`,
				})
				.onConflictDoNothing({ target: [entries.projectId, entries.email] })
				.returning();
		},
		{ isolationLevel: 'serializable' },
	);

	if (insertResult.length > 0) {
		const entry = insertResult[0];

		posthog.capture({
			distinctId: project.id,
			event: 'waitlist_entry_created',
			properties: {
				projectId: project.id,
				entryId: entry.id,
				position: entry.position,
				doubleOptIn: project.doubleOptIn,
			},
		});

		if (project.doubleOptIn) {
			enqueueNotification({
				entryId: entry.id,
				projectId: project.id,
				type: 'verification_email',
			}).catch((err) => console.error('Failed to enqueue verification email:', err));
		} else {
			// Standard flow: notify project owner about the new entry
			enqueueNotification({
				entryId: entry.id,
				projectId: project.id,
				type: 'entry_created',
			}).catch((err) => console.error('Failed to enqueue notification:', err));

			if (project.sendConfirmationEmail) {
				enqueueNotification({
					entryId: entry.id,
					projectId: project.id,
					type: 'confirmation_email',
				}).catch((err) => console.error('Failed to enqueue confirmation email:', err));
			}
		}

		return c.json(
			{
				data: {
					id: entry.id,
					email: entry.email,
					name: entry.name,
					company: entry.company,
					position: entry.position,
					createdAt: entry.createdAt.toISOString(),
				},
			},
			201,
		);
	}

	// Duplicate email for this project -- return the existing entry
	const existing = await db.query.entries.findFirst({
		where: and(eq(entries.projectId, project.id), eq(entries.email, data.email)),
	});

	if (!existing) {
		return c.json(
			{
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Entry conflict detected but existing entry not found',
				},
			},
			500,
		);
	}

	return c.json(
		{
			data: {
				id: existing.id,
				email: existing.email,
				name: existing.name,
				company: existing.company,
				position: existing.position,
				createdAt: existing.createdAt.toISOString(),
			},
		},
		200,
	);
});

export const entriesRoute = app;
