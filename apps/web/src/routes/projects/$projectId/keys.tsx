// ABOUTME: API key management page within the project context.
// ABOUTME: Combines create dialog, key list, and breadcrumb navigation for key lifecycle management.

import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { ApiKeyCreateDialog } from '@/components/ApiKeyCreateDialog';
import { ApiKeyDocs } from '@/components/ApiKeyDocs';
import { ApiKeyList } from '@/components/ApiKeyList';
import { Button } from '@/components/ui/button';
import { useProject } from '@/hooks/useProjects';
import { trpc } from '@/lib/trpc';

export const Route = createFileRoute('/projects/$projectId/keys')({
	component: ApiKeysPage,
});

function ApiKeysPage() {
	const { projectId } = Route.useParams();
	const { data: project, isPending, error } = useProject(projectId);
	const { data: keys } = trpc.apiKey.list.useQuery({ projectId });
	const [dialogOpen, setDialogOpen] = useState(false);

	const firstActiveKey = keys?.find((k) => k.enabled);
	const keyPrefix = firstActiveKey
		? `${firstActiveKey.prefix}${firstActiveKey.start}...`
		: undefined;

	if (isPending) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading...</p>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="mx-auto max-w-4xl">
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
			{/* Back link */}
			<div className="mb-6">
				<Link
					to="/projects/$projectId"
					params={{ projectId }}
					className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to project
				</Link>
			</div>

			{/* Header with create button */}
			<div className="mb-1 flex items-center justify-between">
				<h1 className="text-xl font-semibold text-foreground">API Keys</h1>
				<Button size="sm" className="h-7 text-xs" onClick={() => setDialogOpen(true)}>
					<Plus className="mr-1 h-3.5 w-3.5" />
					Create Key
				</Button>
			</div>
			<p className="mb-4 text-sm text-muted-foreground">
				Create and manage API keys used to accept submissions.
			</p>

			{/* Key list — flat, no Card wrapper */}
			<ApiKeyList projectId={projectId} />

			{/* Integration docs */}
			<div className="mt-10">
				<h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
					Integration Guide
				</h2>
				<ApiKeyDocs apiKeyPrefix={keyPrefix} apiBaseUrl={window.location.origin} />
			</div>

			{/* Create dialog */}
			<ApiKeyCreateDialog
				projectId={projectId}
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
			/>
		</div>
	);
}
