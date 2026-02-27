// ABOUTME: tRPC router for entry dashboard operations (list, detail, stats, status updates, export).
// ABOUTME: All procedures verify project ownership before accessing entry data.

import { type Database, entries, projects } from '@pleasehold/db';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

const entryManualStatusEnum = z.enum(['new', 'contacted', 'converted', 'archived']);
const entryFilterStatusEnum = z.enum([
	'new',
	'contacted',
	'converted',
	'archived',
	'pending_verification',
]);

async function verifyProjectOwnership(db: Database, projectId: string, userId: string) {
	const project = await db.query.projects.findFirst({
		where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
		columns: { id: true },
	});
	if (!project) {
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
	}
	return project;
}

const list = protectedProcedure
	.input(
		z.object({
			projectId: z.string().uuid(),
			search: z.string().optional(),
			status: entryFilterStatusEnum.optional(),
			page: z.number().int().min(1).default(1),
			pageSize: z.number().int().min(1).max(100).default(25),
		}),
	)
	.query(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		const conditions = [eq(entries.projectId, input.projectId)];

		if (input.status) {
			conditions.push(eq(entries.status, input.status));
		}

		if (input.search) {
			const escaped = input.search.replace(/%/g, '\\%').replace(/_/g, '\\_');
			const pattern = `%${escaped}%`;
			conditions.push(
				or(
					ilike(entries.email, pattern),
					ilike(entries.name, pattern),
					ilike(entries.company, pattern),
				)!,
			);
		}

		const whereClause = and(...conditions);

		const [rows, [{ total }]] = await Promise.all([
			ctx.db
				.select()
				.from(entries)
				.where(whereClause)
				.orderBy(desc(entries.createdAt))
				.limit(input.pageSize)
				.offset((input.page - 1) * input.pageSize),
			ctx.db
				.select({ total: sql<number>`cast(count(*) as integer)` })
				.from(entries)
				.where(whereClause),
		]);

		return {
			entries: rows,
			total,
			page: input.page,
			pageSize: input.pageSize,
			totalPages: Math.ceil(total / input.pageSize),
		};
	});

const getById = protectedProcedure
	.input(
		z.object({
			projectId: z.string().uuid(),
			entryId: z.string().uuid(),
		}),
	)
	.query(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		const entry = await ctx.db.query.entries.findFirst({
			where: and(eq(entries.id, input.entryId), eq(entries.projectId, input.projectId)),
		});

		if (!entry) {
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found' });
		}

		return entry;
	});

const stats = protectedProcedure
	.input(z.object({ projectId: z.string().uuid() }))
	.query(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		const [totalResult, statusCounts] = await Promise.all([
			ctx.db
				.select({ total: sql<number>`cast(count(*) as integer)` })
				.from(entries)
				.where(eq(entries.projectId, input.projectId)),
			ctx.db
				.select({
					status: entries.status,
					count: sql<number>`cast(count(*) as integer)`,
				})
				.from(entries)
				.where(eq(entries.projectId, input.projectId))
				.groupBy(entries.status),
		]);

		return {
			total: totalResult[0]?.total ?? 0,
			byStatus: Object.fromEntries(statusCounts.map((row) => [row.status, row.count])),
		};
	});

const updateStatus = protectedProcedure
	.input(
		z.object({
			projectId: z.string().uuid(),
			entryId: z.string().uuid(),
			status: entryManualStatusEnum,
		}),
	)
	.mutation(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		const [updated] = await ctx.db
			.update(entries)
			.set({ status: input.status, updatedAt: new Date() })
			.where(and(eq(entries.id, input.entryId), eq(entries.projectId, input.projectId)))
			.returning();

		if (!updated) {
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found' });
		}

		return updated;
	});

const bulkUpdateStatus = protectedProcedure
	.input(
		z.object({
			projectId: z.string().uuid(),
			entryIds: z.array(z.string().uuid()).min(1).max(500),
			status: entryManualStatusEnum,
		}),
	)
	.mutation(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		// Where clause MUST include both projectId AND inArray to prevent cross-project entry manipulation
		const result = await ctx.db
			.update(entries)
			.set({ status: input.status, updatedAt: new Date() })
			.where(and(eq(entries.projectId, input.projectId), inArray(entries.id, input.entryIds)))
			.returning({ id: entries.id });

		return { updatedCount: result.length };
	});

const exportProcedure = protectedProcedure
	.input(z.object({ projectId: z.string().uuid() }))
	.query(async ({ ctx, input }) => {
		const project = await ctx.db.query.projects.findFirst({
			where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
			with: { fieldConfig: true },
		});

		if (!project) {
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
		}

		const [{ total }] = await ctx.db
			.select({ total: sql<number>`cast(count(*) as integer)` })
			.from(entries)
			.where(eq(entries.projectId, input.projectId));

		if (total > 10_000) {
			throw new TRPCError({
				code: 'PAYLOAD_TOO_LARGE',
				message: 'Export limited to 10,000 entries. Contact support for larger exports.',
			});
		}

		const rows = await ctx.db
			.select()
			.from(entries)
			.where(eq(entries.projectId, input.projectId))
			.orderBy(desc(entries.createdAt))
			.limit(10_000);

		return {
			entries: rows,
			fieldConfig: {
				collectName: project.fieldConfig?.collectName ?? false,
				collectCompany: project.fieldConfig?.collectCompany ?? false,
				collectMessage: project.fieldConfig?.collectMessage ?? false,
			},
		};
	});

export const entryRouter = router({
	list,
	getById,
	stats,
	updateStatus,
	bulkUpdateStatus,
	export: exportProcedure,
});
