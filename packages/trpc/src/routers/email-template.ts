// ABOUTME: tRPC router for per-project email template CRUD (verification and confirmation).
// ABOUTME: Provides get, upsert, and delete operations scoped to authenticated project owners.

import { emailTemplates, projects } from '@pleasehold/db';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

const templateTypeEnum = z.enum(['verification', 'confirmation']);

export const emailTemplateRouter = router({
	get: protectedProcedure
		.input(z.object({ projectId: z.string().uuid(), type: templateTypeEnum }))
		.query(async ({ ctx, input }) => {
			const project = await ctx.db.query.projects.findFirst({
				where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
				columns: { id: true },
			});
			if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });

			return (
				ctx.db.query.emailTemplates.findFirst({
					where: and(
						eq(emailTemplates.projectId, input.projectId),
						eq(emailTemplates.type, input.type),
					),
				}) ?? null
			);
		}),

	upsert: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				type: templateTypeEnum,
				subject: z.string().min(1).max(500),
				bodyHtml: z.string().min(1),
				buttonText: z.string().max(100).optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const project = await ctx.db.query.projects.findFirst({
				where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
				columns: { id: true },
			});
			if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });

			const existing = await ctx.db.query.emailTemplates.findFirst({
				where: and(
					eq(emailTemplates.projectId, input.projectId),
					eq(emailTemplates.type, input.type),
				),
				columns: { id: true },
			});

			if (existing) {
				const [updated] = await ctx.db
					.update(emailTemplates)
					.set({
						subject: input.subject,
						bodyHtml: input.bodyHtml,
						buttonText: input.buttonText ?? null,
						updatedAt: new Date(),
					})
					.where(eq(emailTemplates.id, existing.id))
					.returning();
				return updated;
			}

			const [created] = await ctx.db
				.insert(emailTemplates)
				.values({
					projectId: input.projectId,
					type: input.type,
					subject: input.subject,
					bodyHtml: input.bodyHtml,
					buttonText: input.buttonText ?? null,
				})
				.returning();
			return created;
		}),

	delete: protectedProcedure
		.input(z.object({ projectId: z.string().uuid(), type: templateTypeEnum }))
		.mutation(async ({ ctx, input }) => {
			const project = await ctx.db.query.projects.findFirst({
				where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
				columns: { id: true },
			});
			if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });

			await ctx.db
				.delete(emailTemplates)
				.where(
					and(eq(emailTemplates.projectId, input.projectId), eq(emailTemplates.type, input.type)),
				);
			return { success: true };
		}),
});
