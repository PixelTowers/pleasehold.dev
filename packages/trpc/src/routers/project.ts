// ABOUTME: tRPC router for project CRUD and field configuration management.
// ABOUTME: All queries enforce userId ownership checks; mode is immutable after creation.

import { projectFieldConfigs, projects } from '@pleasehold/db';
import { TRPCError } from '@trpc/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const projectRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				mode: z.enum(['waitlist', 'demo-booking']),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const [project] = await tx
					.insert(projects)
					.values({
						userId: ctx.user.id,
						name: input.name,
						mode: input.mode,
					})
					.returning();

				// Seed field config defaults based on mode:
				// waitlist = email only (all toggles false)
				// demo-booking = all fields (all toggles true)
				const isDemoBooking = input.mode === 'demo-booking';
				const [fieldConfig] = await tx
					.insert(projectFieldConfigs)
					.values({
						projectId: project.id,
						collectName: isDemoBooking,
						collectCompany: isDemoBooking,
						collectMessage: isDemoBooking,
					})
					.returning();

				return { ...project, fieldConfig };
			});
		}),

	list: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db.query.projects.findMany({
			where: eq(projects.userId, ctx.user.id),
			with: { fieldConfig: true },
			orderBy: [desc(projects.createdAt)],
		});
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const project = await ctx.db.query.projects.findFirst({
				where: and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)),
				with: { fieldConfig: true },
			});

			if (!project) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
			}

			return project;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				// Mode is deliberately excluded -- immutable after creation (Pitfall 2).
				name: z.string().min(1).max(100).optional(),
				logoUrl: z.string().url().optional().nullable(),
				brandColor: z
					.string()
					.regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
					.optional(),
				companyName: z.string().max(100).optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db.query.projects.findFirst({
				where: and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)),
				columns: { id: true },
			});

			if (!existing) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
			}

			const updates: Record<string, unknown> = { updatedAt: new Date() };
			if (input.name !== undefined) updates.name = input.name;
			if (input.logoUrl !== undefined) updates.logoUrl = input.logoUrl;
			if (input.brandColor !== undefined) updates.brandColor = input.brandColor;
			if (input.companyName !== undefined) updates.companyName = input.companyName;

			const [updated] = await ctx.db
				.update(projects)
				.set(updates)
				.where(eq(projects.id, input.id))
				.returning();

			return updated;
		}),

	updateFields: protectedProcedure
		.input(
			z.object({
				projectId: z.string().uuid(),
				collectName: z.boolean(),
				collectCompany: z.boolean(),
				collectMessage: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify project ownership before allowing field config changes
			const project = await ctx.db.query.projects.findFirst({
				where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
				columns: { id: true },
			});

			if (!project) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
			}

			const now = new Date();

			const [updatedConfig] = await ctx.db
				.update(projectFieldConfigs)
				.set({
					collectName: input.collectName,
					collectCompany: input.collectCompany,
					collectMessage: input.collectMessage,
					updatedAt: now,
				})
				.where(eq(projectFieldConfigs.projectId, input.projectId))
				.returning();

			// Also update parent project's updatedAt timestamp
			await ctx.db.update(projects).set({ updatedAt: now }).where(eq(projects.id, input.projectId));

			return updatedConfig;
		}),
});
