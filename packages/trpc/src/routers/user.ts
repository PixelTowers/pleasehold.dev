// ABOUTME: tRPC router for user profile operations.
// ABOUTME: Provides the user.me query for fetching current authenticated user info.

import { protectedProcedure, router } from '../trpc';

export const userRouter = router({
	me: protectedProcedure.query(async ({ ctx }) => {
		return {
			id: ctx.user.id,
			name: ctx.user.name,
			email: ctx.user.email,
			emailVerified: ctx.user.emailVerified,
			image: ctx.user.image,
			createdAt: ctx.user.createdAt,
			updatedAt: ctx.user.updatedAt,
		};
	}),
});
