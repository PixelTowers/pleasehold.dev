// ABOUTME: tRPC router for project CRUD and field configuration management.
// ABOUTME: All queries enforce userId ownership checks; mode is immutable after creation.

import { emailTemplates, entries, projectFieldConfigs, projects } from '@pleasehold/db';
import { TRPCError } from '@trpc/server';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

const DEFAULT_VERIFICATION_TEMPLATE = {
	subject: 'Confirm your email for {{project_name}}',
	bodyHtml:
		"<h2>Confirm your email</h2><p>Thanks for signing up for <strong>{{project_name}}</strong>. To complete your submission, please verify your email address by clicking the button below.</p><p>This link will expire in 48 hours. If you didn't request this, you can safely ignore this email.</p>",
	buttonText: 'Verify Email Address',
};

const DEFAULT_CONFIRMATION_TEMPLATE = {
	subject: "You're on the {{project_name}} waitlist!",
	bodyHtml:
		"<h2>You're on the list!</h2><p>Hey {{name}}, thanks for joining <strong>{{project_name}}</strong>!</p><p>We'll keep you updated as things progress.</p><p>Welcome aboard — we're excited to have you.</p>",
	buttonText: null,
};

export const projectRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				mode: z.enum(['waitlist', 'demo-booking']),
				companyName: z.string().max(100).nullish(),
				brandColor: z
					.string()
					.regex(/^#[0-9a-fA-F]{6}$/)
					.optional(),
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
						companyName: input.companyName ?? null,
						brandColor: input.brandColor,
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

				// Seed email templates so projects start with polished defaults
				await tx.insert(emailTemplates).values([
					{
						projectId: project.id,
						type: 'verification' as const,
						subject: DEFAULT_VERIFICATION_TEMPLATE.subject,
						bodyHtml: DEFAULT_VERIFICATION_TEMPLATE.bodyHtml,
						buttonText: DEFAULT_VERIFICATION_TEMPLATE.buttonText,
					},
					{
						projectId: project.id,
						type: 'confirmation' as const,
						subject: DEFAULT_CONFIRMATION_TEMPLATE.subject,
						bodyHtml: DEFAULT_CONFIRMATION_TEMPLATE.bodyHtml,
						buttonText: DEFAULT_CONFIRMATION_TEMPLATE.buttonText,
					},
				]);

				return { ...project, fieldConfig };
			});
		}),

	list: protectedProcedure.query(async ({ ctx }) => {
		const projectRows = await ctx.db.query.projects.findMany({
			where: eq(projects.userId, ctx.user.id),
			with: { fieldConfig: true },
			orderBy: [desc(projects.createdAt)],
		});

		if (projectRows.length === 0) return [];

		const counts = await ctx.db
			.select({ projectId: entries.projectId, count: count() })
			.from(entries)
			.where(
				inArray(
					entries.projectId,
					projectRows.map((p) => p.id),
				),
			)
			.groupBy(entries.projectId);

		const countMap = new Map(counts.map((c) => [c.projectId, c.count]));

		return projectRows.map((p) => ({
			...p,
			entryCount: countMap.get(p.id) ?? 0,
		}));
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
				logoUrl: z
					.string()
					.url()
					.refine((u) => u.startsWith('https://') || u.startsWith('http://'), {
						message: 'Logo URL must use HTTP or HTTPS',
					})
					.optional()
					.nullable(),
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
