// ABOUTME: Shared OpenAPI Zod schemas for request/response/error types used in auto-generated API docs.
// ABOUTME: Documentation-only schemas (runtime validation uses dynamic buildEntrySchema per project).

import { z } from '@hono/zod-openapi';

export const EntryRequestSchema = z
	.object({
		email: z.string().email().openapi({ example: 'user@example.com' }),
		name: z.string().max(200).optional().openapi({ example: 'Jane Doe' }),
		company: z.string().max(200).optional().openapi({ example: 'Acme Inc' }),
		message: z.string().max(2000).optional().openapi({ example: 'Interested in early access' }),
		metadata: z
			.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
			.optional()
			.openapi({ example: { referral: 'twitter', plan: 'pro' } }),
	})
	.openapi('EntryRequest');

export const EntryResponseSchema = z
	.object({
		data: z.object({
			id: z.string().uuid().openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
			email: z.string().email().openapi({ example: 'user@example.com' }),
			name: z.string().nullable().openapi({ example: 'Jane Doe' }),
			company: z.string().nullable().openapi({ example: 'Acme Inc' }),
			position: z.number().int().openapi({ example: 42 }),
			createdAt: z.string().datetime().openapi({ example: '2026-01-15T09:30:00.000Z' }),
		}),
	})
	.openapi('EntryResponse');

export const ErrorResponseSchema = z
	.object({
		error: z.object({
			code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
			message: z.string().openapi({ example: 'Invalid submission' }),
			details: z
				.array(
					z.object({
						field: z.string().openapi({ example: 'email' }),
						message: z.string().openapi({ example: 'Invalid email' }),
					}),
				)
				.optional(),
		}),
	})
	.openapi('ErrorResponse');

export const VerifyResponseSchema = z
	.object({
		data: z.object({
			verified: z.literal(true),
			email: z.string().openapi({ example: 'user@example.com' }),
		}),
	})
	.openapi('VerifyResponse');
