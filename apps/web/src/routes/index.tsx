// ABOUTME: Dashboard index route showing project card grid or guided creation flow.
// ABOUTME: Auth is handled by root beforeLoad guard; shows CreateProjectFlow for zero-project users.

import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { CreateProjectFlow } from '@/components/CreateProjectFlow';
import { ProjectCard } from '@/components/ProjectCard';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/useProjects';

export const Route = createFileRoute('/')({
	component: DashboardIndex,
});

function DashboardIndex() {
	const { data: projects, isPending: projectsLoading, error } = useProjects();
	const [createOpen, setCreateOpen] = useState(false);

	if (projectsLoading) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading projects...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="mx-auto max-w-5xl">
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
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-baseline gap-2">
					<h1 className="text-xl font-semibold text-foreground">Projects</h1>
					<span className="text-sm text-muted">{projects.length}</span>
				</div>
				<Button size="sm" className="h-7 text-xs" onClick={() => setCreateOpen(true)}>
					<Plus className="mr-1 h-3.5 w-3.5" />
					New Project
				</Button>
			</div>

			<div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
				{projects.map((project) => (
					<ProjectCard
						key={project.id}
						id={project.id}
						name={project.name}
						mode={project.mode}
						createdAt={project.createdAt}
						updatedAt={project.updatedAt}
						brandColor={project.brandColor}
						logoUrl={project.logoUrl}
						entryCount={'entryCount' in project ? (project.entryCount as number) : undefined}
					/>
				))}
			</div>

			<CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
		</div>
	);
}
