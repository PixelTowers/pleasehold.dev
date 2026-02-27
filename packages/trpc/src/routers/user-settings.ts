// ABOUTME: tRPC router for user-level settings (BYOK email provider configuration).
// ABOUTME: Provides get and update procedures scoped to the authenticated user.

import { userSettings } from '@pleasehold/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const userSettingsRouter = router({
	get: protectedProcedure.query(async ({ ctx }) => {
		const settings = await ctx.db.query.userSettings.findFirst({
			where: eq(userSettings.userId, ctx.user.id),
		});

		if (!settings) {
			return {
				resendApiKey: null,
				emailFromAddress: null,
				emailFromName: null,
			};
		}

		return {
			resendApiKey: settings.resendApiKey ? '••••••••' : null,
			emailFromAddress: settings.emailFromAddress,
			emailFromName: settings.emailFromName,
		};
	}),

	update: protectedProcedure
		.input(
			z.object({
				resendApiKey: z.string().min(1).optional().nullable(),
				emailFromAddress: z.string().email().optional().nullable(),
				emailFromName: z.string().max(100).optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db.query.userSettings.findFirst({
				where: eq(userSettings.userId, ctx.user.id),
				columns: { id: true },
			});

			const values: Record<string, unknown> = { updatedAt: new Date() };
			if (input.resendApiKey !== undefined) values.resendApiKey = input.resendApiKey;
			if (input.emailFromAddress !== undefined) values.emailFromAddress = input.emailFromAddress;
			if (input.emailFromName !== undefined) values.emailFromName = input.emailFromName;

			if (existing) {
				await ctx.db.update(userSettings).set(values).where(eq(userSettings.userId, ctx.user.id));
			} else {
				await ctx.db.insert(userSettings).values({
					userId: ctx.user.id,
					...values,
				});
			}

			return { success: true };
		}),
});
