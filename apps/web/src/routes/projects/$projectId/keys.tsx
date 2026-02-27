// ABOUTME: API key management page within the project context.
// ABOUTME: Combines create dialog, key list, and breadcrumb navigation for key lifecycle management.

import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { ApiKeyCreateDialog } from '@/components/ApiKeyCreateDialog';
import { ApiKeyList } from '@/components/ApiKeyList';
import { Button } from '@/components/ui/button';
import { useProject } from '@/hooks/useProjects';

export const Route = createFileRoute('/projects/$projectId/keys')({
	component: ApiKeysPage,
});

function ApiKeysPage() {
	const { projectId } = Route.useParams();
	const { data: project, isPending, error } = useProject(projectId);
	const [dialogOpen, setDialogOpen] = useState(false);

	if (isPending) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading...</p>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="mx-auto max-w-3xl">
				<div className="mb-4">
					<Link to="/" className="text-sm text-muted hover:text-foreground">
						&larr; Back to dashboard
					</Link>
				</div>
				<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
					Failed to load project. Please try again.
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl">
			{/* Breadcrumb */}
			<div className="mb-6 flex items-center gap-1.5 text-sm text-muted">
				<Link to="/" className="text-muted hover:text-foreground">
					Dashboard
				</Link>
				<span>/</span>
				<Link
					to="/projects/$projectId"
					params={{ projectId }}
					className="text-muted hover:text-foreground"
				>
					{project.name}
				</Link>
				<span>/</span>
				<span className="font-medium text-foreground">API Keys</span>
			</div>

			{/* Header with create button */}
			<div className="mb-4 flex items-center justify-between">
				<h1 className="text-xl font-semibold text-foreground">API Keys</h1>
				<Button size="sm" className="h-7 text-xs" onClick={() => setDialogOpen(true)}>
					<Plus className="mr-1 h-3.5 w-3.5" />
					Create Key
				</Button>
			</div>

			{/* Key list — flat, no Card wrapper */}
			<ApiKeyList projectId={projectId} />

			{/* Create dialog */}
			<ApiKeyCreateDialog
				projectId={projectId}
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
			/>
		</div>
	);
}
