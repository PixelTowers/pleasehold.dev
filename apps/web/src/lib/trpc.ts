// ABOUTME: tRPC client and React Query integration for the web dashboard.
// ABOUTME: Configures httpBatchLink with credentials for cookie-based auth.

import type { AppRouter } from '@pleasehold/trpc';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60, // 1 minute
			retry: false,
		},
	},
});

export const trpcClient = trpc.createClient({
	links: [
		httpBatchLink({
			url: '/trpc',
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: 'include',
				});
			},
			transformer: superjson,
		}),
	],
});
