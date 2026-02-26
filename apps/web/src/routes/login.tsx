// ABOUTME: Login page with email and password form.
// ABOUTME: Authenticates via Better Auth client and redirects to dashboard on success.

import { Link, createFileRoute } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { authClient } from '../lib/auth-client';

export const Route = createFileRoute('/login')({
	component: LoginPage,
});

function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const result = await authClient.signIn.email({ email, password });
			if (result.error) {
				setError(result.error.message ?? 'Login failed. Please check your credentials.');
			} else {
				window.location.href = '/';
			}
		} catch {
			setError('An unexpected error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{ maxWidth: '24rem', margin: '4rem auto' }}>
			<h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
				Log in to pleasehold
			</h1>
			<p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.875rem' }}>
				Enter your email and password to continue.
			</p>

			{error && (
				<div
					style={{
						padding: '0.75rem 1rem',
						marginBottom: '1rem',
						backgroundColor: '#fef2f2',
						border: '1px solid #fecaca',
						borderRadius: '0.375rem',
						color: '#dc2626',
						fontSize: '0.875rem',
					}}
				>
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit}>
				<div style={{ marginBottom: '1rem' }}>
					<label
						htmlFor="email"
						style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}
					>
						Email
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						style={{
							width: '100%',
							padding: '0.5rem 0.75rem',
							border: '1px solid #d1d5db',
							borderRadius: '0.375rem',
							fontSize: '0.875rem',
							boxSizing: 'border-box',
						}}
					/>
				</div>

				<div style={{ marginBottom: '1.5rem' }}>
					<label
						htmlFor="password"
						style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}
					>
						Password
					</label>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						style={{
							width: '100%',
							padding: '0.5rem 0.75rem',
							border: '1px solid #d1d5db',
							borderRadius: '0.375rem',
							fontSize: '0.875rem',
							boxSizing: 'border-box',
						}}
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					style={{
						width: '100%',
						padding: '0.625rem',
						backgroundColor: loading ? '#6b7280' : '#111',
						color: '#fff',
						border: 'none',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						fontWeight: 500,
						cursor: loading ? 'not-allowed' : 'pointer',
					}}
				>
					{loading ? 'Logging in...' : 'Log in'}
				</button>
			</form>

			<p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
				Don&apos;t have an account?{' '}
				<Link to="/signup" style={{ color: '#111', textDecoration: 'underline' }}>
					Sign up
				</Link>
			</p>
		</div>
	);
}
