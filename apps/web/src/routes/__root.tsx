// ABOUTME: Root layout for all dashboard routes with navigation bar.
// ABOUTME: Shows auth-aware navigation (login/signup when logged out, logout when logged in).

import { Link, Outlet, createRootRoute, useNavigate } from '@tanstack/react-router';
import { authClient } from '../lib/auth-client';

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	const { data: session, isPending } = authClient.useSession();
	const navigate = useNavigate();

	const handleLogout = async () => {
		await authClient.signOut();
		navigate({ to: '/login' });
	};

	return (
		<div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
			<nav
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '1rem 2rem',
					borderBottom: '1px solid #e5e7eb',
					backgroundColor: '#fff',
				}}
			>
				<Link
					to="/"
					style={{
						fontWeight: 700,
						fontSize: '1.25rem',
						textDecoration: 'none',
						color: '#111',
					}}
				>
					pleasehold
				</Link>

				<div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
					{isPending ? null : session?.user ? (
						<>
							<span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
								{session.user.email}
							</span>
							<button
								type="button"
								onClick={handleLogout}
								style={{
									padding: '0.5rem 1rem',
									border: '1px solid #d1d5db',
									borderRadius: '0.375rem',
									backgroundColor: '#fff',
									cursor: 'pointer',
									fontSize: '0.875rem',
								}}
							>
								Log out
							</button>
						</>
					) : (
						<>
							<Link
								to="/login"
								style={{
									textDecoration: 'none',
									color: '#374151',
									fontSize: '0.875rem',
								}}
							>
								Log in
							</Link>
							<Link
								to="/signup"
								style={{
									textDecoration: 'none',
									padding: '0.5rem 1rem',
									backgroundColor: '#111',
									color: '#fff',
									borderRadius: '0.375rem',
									fontSize: '0.875rem',
								}}
							>
								Sign up
							</Link>
						</>
					)}
				</div>
			</nav>

			<main style={{ padding: '2rem' }}>
				<Outlet />
			</main>
		</div>
	);
}
