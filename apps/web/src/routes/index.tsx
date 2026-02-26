// ABOUTME: Dashboard index route showing project card grid or guided creation flow.
// ABOUTME: Protected route; redirects to login if unauthenticated; shows CreateProjectFlow for zero-project users.

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { authClient } from '../lib/auth-client';
import { CreateProjectFlow } from '../components/CreateProjectFlow';
import { ProjectCard } from '../components/ProjectCard';
import { useProjects } from '../hooks/useProjects';

export const Route = createFileRoute('/')({
	component: DashboardIndex,
});

function DashboardIndex() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();
	const { data: projects, isPending: projectsLoading, error } = useProjects();

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

	if (projectsLoading) {
		return (
			<div style={{ textAlign: 'center', padding: '4rem' }}>
				<p style={{ color: '#6b7280' }}>Loading projects...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
				<div
					style={{
						padding: '1rem',
						backgroundColor: '#fef2f2',
						border: '1px solid #fecaca',
						borderRadius: '0.375rem',
						color: '#dc2626',
						fontSize: '0.875rem',
					}}
				>
					Failed to load projects. Please try refreshing the page.
				</div>
			</div>
		);
	}

	// First-time user with zero projects: show guided creation flow
	if (!projects || projects.length === 0) {
		return (
			<div style={{ padding: '2rem 0' }}>
				<CreateProjectFlow />
			</div>
		);
	}

	// Returning user: show project card grid
	return (
		<div style={{ maxWidth: '64rem', margin: '0 auto' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
				<div>
					<h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Projects</h1>
					<p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
						{projects.length} project{projects.length === 1 ? '' : 's'}
					</p>
				</div>
				<Link
					to="/projects/new"
					style={{
						padding: '0.5rem 1rem',
						backgroundColor: '#111',
						color: '#fff',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						fontWeight: 500,
						textDecoration: 'none',
					}}
				>
					New Project
				</Link>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))',
					gap: '1rem',
				}}
			>
				{projects.map((project) => (
					<ProjectCard
						key={project.id}
						id={project.id}
						name={project.name}
						mode={project.mode}
						createdAt={project.createdAt}
						updatedAt={project.updatedAt}
					/>
				))}
			</div>
		</div>
	);
}
