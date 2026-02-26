// ABOUTME: tRPC client and React Query integration for the web dashboard.
// ABOUTME: Configures httpBatchLink with credentials for cookie-based auth.

import { QueryClient } from '@tanstack/react-query';
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import superjson from 'superjson';
import type { AppRouter } from '@pleasehold/trpc';

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
