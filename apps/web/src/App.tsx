// ABOUTME: Root application component providing tRPC, React Query, and Router contexts.
// ABOUTME: Wraps all providers needed by the dashboard routes.

import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { initTracking } from './lib/tracking';
import { queryClient, trpc, trpcClient } from './lib/trpc';
import { routeTree } from './routeTree.gen';

initTracking();

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

export function App() {
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</trpc.Provider>
	);
}
