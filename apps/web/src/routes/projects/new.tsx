// ABOUTME: Standalone project creation page for users adding additional projects.
// ABOUTME: Name input, mode selector, and create button with navigation on success.

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { authClient } from '../../lib/auth-client';
import { trpc } from '../../lib/trpc';

type Mode = 'waitlist' | 'demo-booking';

export const Route = createFileRoute('/projects/new')({
	component: NewProjectPage,
});

function NewProjectPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();
	const [name, setName] = useState('');
	const [mode, setMode] = useState<Mode>('waitlist');
	const [error, setError] = useState<string | null>(null);

	const createProject = trpc.project.create.useMutation({
		onSuccess: (data) => {
			navigate({ to: '/projects/$projectId', params: { projectId: data.id } });
		},
		onError: (err) => {
			setError(err.message ?? 'Failed to create project.');
		},
	});

	if (sessionLoading) {
		return (
			<div style={{ textAlign: 'center', padding: '4rem' }}>
				<p style={{ color: '#6b7280' }}>Loading...</p>
			</div>
		);
	}

	if (!session?.user) {
		void navigate({ to: '/login' });
		return null;
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		setError(null);
		createProject.mutate({ name: name.trim(), mode });
	};

	return (
		<div style={{ maxWidth: '32rem', margin: '0 auto' }}>
			<div style={{ marginBottom: '0.5rem' }}>
				<Link to="/" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>
					&larr; Back to dashboard
				</Link>
			</div>

			<h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
				Create a new project
			</h1>
			<p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
				Each project has its own field configuration and API keys.
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
				<div style={{ marginBottom: '1.5rem' }}>
					<label
						htmlFor="project-name"
						style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}
					>
						Project name
					</label>
					<input
						id="project-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="My Landing Page"
						maxLength={100}
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
					<label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
						Mode
					</label>
					<div style={{ display: 'flex', gap: '0.75rem' }}>
						{(['waitlist', 'demo-booking'] as const).map((m) => {
							const isSelected = mode === m;
							return (
								<button
									key={m}
									type="button"
									onClick={() => setMode(m)}
									style={{
										flex: 1,
										padding: '0.75rem',
										border: isSelected ? '2px solid #111' : '1px solid #e5e7eb',
										borderRadius: '0.5rem',
										backgroundColor: isSelected ? '#f9fafb' : '#fff',
										cursor: 'pointer',
										textAlign: 'center',
									}}
								>
									<div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
										{m === 'demo-booking' ? 'Demo Booking' : 'Waitlist'}
									</div>
									<div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
										{m === 'waitlist' ? 'Email only' : 'Full form'}
									</div>
								</button>
							);
						})}
					</div>
					<p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
						Mode cannot be changed after creation.
					</p>
				</div>

				<button
					type="submit"
					disabled={createProject.isPending || !name.trim()}
					style={{
						width: '100%',
						padding: '0.625rem',
						backgroundColor: createProject.isPending || !name.trim() ? '#6b7280' : '#111',
						color: '#fff',
						border: 'none',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						fontWeight: 500,
						cursor: createProject.isPending || !name.trim() ? 'not-allowed' : 'pointer',
					}}
				>
					{createProject.isPending ? 'Creating...' : 'Create Project'}
				</button>
			</form>
		</div>
	);
}
