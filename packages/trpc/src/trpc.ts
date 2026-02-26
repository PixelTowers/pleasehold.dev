// ABOUTME: tRPC initialization with superjson transformer and procedure builders.
// ABOUTME: Defines publicProcedure and protectedProcedure with auth middleware.

import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
	transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

const isAuthenticated = middleware(async ({ ctx, next }) => {
	if (!ctx.session || !ctx.user) {
		throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
	}

	return next({
		ctx: {
			session: ctx.session,
			user: ctx.user,
		},
	});
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
