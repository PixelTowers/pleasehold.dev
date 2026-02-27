// ABOUTME: tRPC router for API key lifecycle: create with project scoping, list by project, and revoke.
// ABOUTME: All operations verify project ownership before acting; keys are scoped to projects via metadata.

import { apikeys, projects } from '@pleasehold/db';
import { TRPCError } from '@trpc/server';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const apiKeyRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				label: z.string().max(50).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify the project belongs to this user
			const project = await ctx.db.query.projects.findFirst({
				where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
				columns: { id: true },
			});

			if (!project) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
			}

			// Create the API key via Better Auth with project metadata
			const result = await ctx.auth.api.createApiKey({
				body: {
					name: input.label ?? 'API Key',
					prefix: 'ph_live_',
					metadata: { projectId: input.projectId },
				},
				headers: ctx.requestHeaders,
			});

			if (!result) {
				throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create API key' });
			}

			// Return the full key exactly once for the client to display
			return {
				id: result.id,
				key: result.key,
				start: result.start,
				name: result.name,
			};
		}),

	list: protectedProcedure
		.input(z.object({ projectId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			// Verify the project belongs to this user
			const project = await ctx.db.query.projects.findFirst({
				where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
				columns: { id: true },
			});

			if (!project) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
			}

			// Filter keys by project directly in SQL via JSONB metadata
			const projectKeys = await ctx.db
				.select({
					id: apikeys.id,
					name: apikeys.name,
					start: apikeys.start,
					prefix: apikeys.prefix,
					enabled: apikeys.enabled,
					createdAt: apikeys.createdAt,
				})
				.from(apikeys)
				.where(
					and(
						eq(apikeys.userId, ctx.user.id),
						sql`${apikeys.metadata}::jsonb->>'projectId' = ${input.projectId}`,
					),
				)
				.orderBy(apikeys.createdAt);

			return projectKeys.reverse();
		}),

	revoke: protectedProcedure
		.input(z.object({ keyId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Look up the key to verify ownership through its project
			const key = await ctx.db
				.select({
					id: apikeys.id,
					userId: apikeys.userId,
					metadata: apikeys.metadata,
				})
				.from(apikeys)
				.where(eq(apikeys.id, input.keyId))
				.limit(1);

			if (key.length === 0 || key[0].userId !== ctx.user.id) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'API key not found' });
			}

			// Extract projectId from metadata and verify project ownership
			const keyMetadata = key[0].metadata;
			if (keyMetadata) {
				try {
					const parsed = JSON.parse(keyMetadata);
					if (parsed.projectId) {
						const project = await ctx.db.query.projects.findFirst({
							where: and(eq(projects.id, parsed.projectId), eq(projects.userId, ctx.user.id)),
							columns: { id: true },
						});

						if (!project) {
							throw new TRPCError({ code: 'NOT_FOUND', message: 'API key not found' });
						}
					}
				} catch (e) {
					if (e instanceof TRPCError) throw e;
					// If metadata is malformed, the key doesn't belong to a valid project
					throw new TRPCError({ code: 'NOT_FOUND', message: 'API key not found' });
				}
			}

			// Revoke via Better Auth updateApiKey (sets enabled=false)
			await ctx.auth.api.updateApiKey({
				body: { keyId: input.keyId, enabled: false },
				headers: ctx.requestHeaders,
			});

			return { success: true };
		}),
});
