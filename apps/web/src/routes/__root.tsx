// ABOUTME: Root layout that switches between sidebar layout (authenticated) and centered layout (auth pages).
// ABOUTME: Auth pages (login/signup) render without sidebar; all other routes get the AppLayout wrapper.

import { Outlet, createRootRoute, useMatchRoute } from '@tanstack/react-router';
import { AppLayout } from '../components/AppLayout';

export const Route = createRootRoute({
	component: RootLayout,
});

const AUTH_ROUTES = ['/login', '/signup'] as const;

function RootLayout() {
	const matchRoute = useMatchRoute();
	const isAuthPage = AUTH_ROUTES.some((path) => matchRoute({ to: path }));

	if (isAuthPage) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<Outlet />
			</div>
		);
	}

	return (
		<AppLayout>
			<Outlet />
		</AppLayout>
	);
}
