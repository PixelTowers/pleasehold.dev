// ABOUTME: tRPC router for notification channel configuration and double opt-in settings.
// ABOUTME: Provides CRUD for notification channels with per-type config validation and webhook HMAC secret management.

import crypto from 'node:crypto';
import { type Database, notificationChannels, projects } from '@pleasehold/db';
import { TRPCError } from '@trpc/server';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

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

const emailConfigSchema = z.object({
	recipients: z.array(z.string().email()).min(1).max(10),
});

const slackConfigSchema = z.object({
	webhookUrl: z.string().url().startsWith('https://hooks.slack.com/'),
});

const discordConfigSchema = z.object({
	webhookUrl: z.string().url().startsWith('https://discord.com/api/webhooks/'),
});

const telegramConfigSchema = z.object({
	botToken: z.string().regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid Telegram bot token format'),
	chatId: z.string().regex(/^-?\d+$|^@\w+$/, 'Invalid Telegram chat ID format'),
});

const webhookConfigSchema = z.object({
	url: z
		.string()
		.url()
		.refine((url) => url.startsWith('https://'), {
			message: 'Webhook URL must use HTTPS',
		}),
});

type ChannelType = 'email' | 'slack' | 'discord' | 'telegram' | 'webhook';

function validateConfigForType(
	type: ChannelType,
	config: Record<string, unknown>,
): Record<string, unknown> {
	switch (type) {
		case 'email':
			return emailConfigSchema.parse(config);
		case 'slack':
			return slackConfigSchema.parse(config);
		case 'discord':
			return discordConfigSchema.parse(config);
		case 'telegram':
			return telegramConfigSchema.parse(config);
		case 'webhook':
			return webhookConfigSchema.parse(config);
	}
}

function maskWebhookSecret(config: Record<string, unknown>): Record<string, unknown> {
	if (typeof config.secret === 'string' && config.secret.length > 8) {
		return { ...config, secret: `${config.secret.substring(0, 8)}...` };
	}
	return config;
}

const list = protectedProcedure
	.input(z.object({ projectId: z.string().uuid() }))
	.query(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		const channels = await ctx.db
			.select()
			.from(notificationChannels)
			.where(eq(notificationChannels.projectId, input.projectId))
			.orderBy(asc(notificationChannels.createdAt));

		return channels.map((channel) => {
			if (channel.type === 'webhook') {
				return { ...channel, config: maskWebhookSecret(channel.config) };
			}
			return channel;
		});
	});

const create = protectedProcedure
	.input(
		z.object({
			projectId: z.string().uuid(),
			type: z.enum(['email', 'slack', 'discord', 'telegram', 'webhook']),
			config: z.record(z.unknown()),
		}),
	)
	.mutation(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		let validatedConfig: Record<string, unknown>;
		try {
			validatedConfig = validateConfigForType(input.type, input.config);
		} catch (err) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `Invalid config for ${input.type} channel`,
				cause: err,
			});
		}

		if (input.type === 'webhook') {
			const secret = crypto.randomBytes(32).toString('hex');
			validatedConfig = { ...validatedConfig, secret };
		}

		const [channel] = await ctx.db
			.insert(notificationChannels)
			.values({
				projectId: input.projectId,
				type: input.type,
				config: validatedConfig,
			})
			.returning();

		if (channel.type === 'webhook') {
			return { ...channel, config: maskWebhookSecret(channel.config) };
		}
		return channel;
	});

const update = protectedProcedure
	.input(
		z.object({
			projectId: z.string().uuid(),
			channelId: z.string().uuid(),
			enabled: z.boolean().optional(),
			config: z.record(z.unknown()).optional(),
		}),
	)
	.mutation(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		const existing = await ctx.db.query.notificationChannels.findFirst({
			where: and(
				eq(notificationChannels.id, input.channelId),
				eq(notificationChannels.projectId, input.projectId),
			),
		});

		if (!existing) {
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
		}

		const updateData: { enabled?: boolean; config?: Record<string, unknown>; updatedAt: Date } = {
			updatedAt: new Date(),
		};

		if (input.enabled !== undefined) {
			updateData.enabled = input.enabled;
		}

		if (input.config !== undefined) {
			let validatedConfig: Record<string, unknown>;
			try {
				validatedConfig = validateConfigForType(existing.type as ChannelType, input.config);
			} catch (err) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: `Invalid config for ${existing.type} channel`,
					cause: err,
				});
			}

			// For webhook channels, preserve the existing secret (cannot be changed via update)
			if (existing.type === 'webhook') {
				const existingConfig = existing.config as Record<string, unknown>;
				validatedConfig = { ...validatedConfig, secret: existingConfig.secret };
			}

			updateData.config = validatedConfig;
		}

		const [updated] = await ctx.db
			.update(notificationChannels)
			.set(updateData)
			.where(eq(notificationChannels.id, input.channelId))
			.returning();

		if (updated.type === 'webhook') {
			return { ...updated, config: maskWebhookSecret(updated.config) };
		}

		return updated;
	});

const deleteProcedure = protectedProcedure
	.input(
		z.object({
			projectId: z.string().uuid(),
			channelId: z.string().uuid(),
		}),
	)
	.mutation(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		await ctx.db
			.delete(notificationChannels)
			.where(
				and(
					eq(notificationChannels.id, input.channelId),
					eq(notificationChannels.projectId, input.projectId),
				),
			);

		return { deleted: true };
	});

const regenerateSecret = protectedProcedure
	.input(
		z.object({
			projectId: z.string().uuid(),
			channelId: z.string().uuid(),
		}),
	)
	.mutation(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		const channel = await ctx.db.query.notificationChannels.findFirst({
			where: and(
				eq(notificationChannels.id, input.channelId),
				eq(notificationChannels.projectId, input.projectId),
			),
		});

		if (!channel) {
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
		}

		if (channel.type !== 'webhook') {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Secret regeneration is only available for webhook channels',
			});
		}

		const newSecret = crypto.randomBytes(32).toString('hex');
		const updatedConfig = { ...(channel.config as Record<string, unknown>), secret: newSecret };

		await ctx.db
			.update(notificationChannels)
			.set({ config: updatedConfig, updatedAt: new Date() })
			.where(eq(notificationChannels.id, input.channelId));

		return { secret: newSecret };
	});

const toggleDoubleOptIn = protectedProcedure
	.input(
		z.object({
			projectId: z.string().uuid(),
			enabled: z.boolean(),
		}),
	)
	.mutation(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		await ctx.db
			.update(projects)
			.set({ doubleOptIn: input.enabled, updatedAt: new Date() })
			.where(eq(projects.id, input.projectId));

		return { doubleOptIn: input.enabled };
	});

const getDoubleOptIn = protectedProcedure
	.input(z.object({ projectId: z.string().uuid() }))
	.query(async ({ ctx, input }) => {
		const project = await ctx.db.query.projects.findFirst({
			where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
			columns: { doubleOptIn: true },
		});

		if (!project) {
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
		}

		return { doubleOptIn: project.doubleOptIn };
	});

const toggleSendConfirmationEmail = protectedProcedure
	.input(
		z.object({
			projectId: z.string().uuid(),
			enabled: z.boolean(),
		}),
	)
	.mutation(async ({ ctx, input }) => {
		await verifyProjectOwnership(ctx.db, input.projectId, ctx.user.id);

		await ctx.db
			.update(projects)
			.set({ sendConfirmationEmail: input.enabled, updatedAt: new Date() })
			.where(eq(projects.id, input.projectId));

		return { sendConfirmationEmail: input.enabled };
	});

const getSendConfirmationEmail = protectedProcedure
	.input(z.object({ projectId: z.string().uuid() }))
	.query(async ({ ctx, input }) => {
		const project = await ctx.db.query.projects.findFirst({
			where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)),
			columns: { sendConfirmationEmail: true },
		});

		if (!project) {
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
		}

		return { sendConfirmationEmail: project.sendConfirmationEmail };
	});

export const notificationRouter = router({
	list,
	create,
	update,
	delete: deleteProcedure,
	regenerateSecret,
	toggleDoubleOptIn,
	getDoubleOptIn,
	toggleSendConfirmationEmail,
	getSendConfirmationEmail,
});
