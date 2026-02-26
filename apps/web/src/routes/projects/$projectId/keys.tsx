// ABOUTME: API key management page within the project context.
// ABOUTME: Combines create dialog, key list, and breadcrumb navigation for key lifecycle management.

import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ApiKeyCreateDialog } from '../../../components/ApiKeyCreateDialog';
import { ApiKeyList } from '../../../components/ApiKeyList';
import { useProject } from '../../../hooks/useProjects';

export const Route = createFileRoute('/projects/$projectId/keys')({
	component: ApiKeysPage,
});

function ApiKeysPage() {
	const { projectId } = Route.useParams();
	const { data: project, isPending, error } = useProject(projectId);
	const [dialogOpen, setDialogOpen] = useState(false);

	if (isPending) {
		return (
			<div style={{ textAlign: 'center', padding: '4rem' }}>
				<p style={{ color: '#6b7280' }}>Loading...</p>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
				<div style={{ marginBottom: '1rem' }}>
					<Link to="/" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>
						&larr; Back to dashboard
					</Link>
				</div>
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
					Failed to load project. Please try again.
				</div>
			</div>
		);
	}

	return (
		<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
			{/* Breadcrumb */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.375rem',
					marginBottom: '1.5rem',
					fontSize: '0.875rem',
					color: '#6b7280',
				}}
			>
				<Link to="/" style={{ color: '#6b7280', textDecoration: 'none' }}>
					Dashboard
				</Link>
				<span>/</span>
				<Link
					to="/projects/$projectId"
					params={{ projectId }}
					style={{ color: '#6b7280', textDecoration: 'none' }}
				>
					{project.name}
				</Link>
				<span>/</span>
				<span style={{ color: '#111827', fontWeight: 500 }}>API Keys</span>
			</div>

			{/* Header with create button */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '1.5rem',
				}}
			>
				<h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>API Keys</h1>
				<button
					type="button"
					onClick={() => setDialogOpen(true)}
					style={{
						padding: '0.5rem 1rem',
						backgroundColor: '#111',
						color: '#fff',
						border: 'none',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						fontWeight: 500,
						cursor: 'pointer',
					}}
				>
					Create Key
				</button>
			</div>

			{/* Key list */}
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
