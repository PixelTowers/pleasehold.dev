// ABOUTME: Dashboard index route showing project card grid or guided creation flow.
// ABOUTME: Protected route; redirects to login if unauthenticated; shows CreateProjectFlow for zero-project users.

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { CreateProjectFlow } from '@/components/CreateProjectFlow';
import { ProjectCard } from '@/components/ProjectCard';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
	component: DashboardIndex,
});

function DashboardIndex() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();
	const { data: projects, isPending: projectsLoading, error } = useProjects();

	if (sessionLoading) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading...</p>
			</div>
		);
	}

	if (!session?.user) {
		void navigate({ to: '/login' });
		return null;
	}

	if (projectsLoading) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading projects...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="mx-auto max-w-3xl">
				<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
					Failed to load projects. Please try refreshing the page.
				</div>
			</div>
		);
	}

	// First-time user with zero projects: show guided creation flow
	if (!projects || projects.length === 0) {
		return (
			<div className="py-8">
				<CreateProjectFlow />
			</div>
		);
	}

	// Returning user: show project card grid
	return (
		<div className="mx-auto max-w-5xl">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Projects</h1>
					<p className="mt-1 text-sm text-muted">
						{projects.length} project{projects.length === 1 ? '' : 's'}
					</p>
				</div>
				<Button asChild size="sm">
					<Link to="/projects/new">
						<Plus className="mr-1.5 h-4 w-4" />
						New Project
					</Link>
				</Button>
			</div>

			<div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
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
