// ABOUTME: Project settings page with editable name and field configuration toggles.
// ABOUTME: Mode is displayed as read-only badge; field toggles auto-save via tRPC mutation.

import { Link, createFileRoute } from '@tanstack/react-router';
import { type FormEvent, useEffect, useState } from 'react';
import { FieldConfigForm } from '../../../components/FieldConfigForm';
import { useProject } from '../../../hooks/useProjects';
import { trpc } from '../../../lib/trpc';

export const Route = createFileRoute('/projects/$projectId/settings')({
	component: ProjectSettingsPage,
});

const modeBadgeStyles: Record<string, React.CSSProperties> = {
	waitlist: {
		display: 'inline-block',
		padding: '0.25rem 0.75rem',
		fontSize: '0.8125rem',
		fontWeight: 500,
		borderRadius: '9999px',
		backgroundColor: '#dbeafe',
		color: '#1d4ed8',
	},
	'demo-booking': {
		display: 'inline-block',
		padding: '0.25rem 0.75rem',
		fontSize: '0.8125rem',
		fontWeight: 500,
		borderRadius: '9999px',
		backgroundColor: '#ede9fe',
		color: '#6d28d9',
	},
};

function ProjectSettingsPage() {
	const { projectId } = Route.useParams();
	const { data: project, isPending, error } = useProject(projectId);
	const [name, setName] = useState('');
	const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

	const utils = trpc.useUtils();
	const updateProject = trpc.project.update.useMutation({
		onSuccess: () => {
			setNameStatus('saved');
			utils.project.getById.invalidate({ id: projectId });
			utils.project.list.invalidate();
			setTimeout(() => setNameStatus('idle'), 2000);
		},
		onError: () => {
			setNameStatus('error');
			setTimeout(() => setNameStatus('idle'), 3000);
		},
	});

	useEffect(() => {
		if (project) {
			setName(project.name);
		}
	}, [project]);

	if (isPending) {
		return (
			<div style={{ textAlign: 'center', padding: '4rem' }}>
				<p style={{ color: '#6b7280' }}>Loading settings...</p>
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
					Failed to load project settings. Please try again.
				</div>
			</div>
		);
	}

	const handleNameSave = (e: FormEvent) => {
		e.preventDefault();
		if (!name.trim() || name.trim() === project.name) return;
		setNameStatus('saving');
		updateProject.mutate({ id: projectId, name: name.trim() });
	};

	return (
		<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
			{/* Breadcrumb */}
			<div style={{ marginBottom: '1.5rem' }}>
				<Link to="/projects/$projectId" params={{ projectId }} style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>
					&larr; Back to project
				</Link>
			</div>

			<h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>Project Settings</h1>

			{/* Project Name */}
			<div
				style={{
					padding: '1.25rem',
					border: '1px solid #e5e7eb',
					borderRadius: '0.5rem',
					backgroundColor: '#fff',
					marginBottom: '1.5rem',
				}}
			>
				<h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>General</h3>

				<form onSubmit={handleNameSave}>
					<div style={{ marginBottom: '1rem' }}>
						<label
							htmlFor="project-name"
							style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}
						>
							Project name
						</label>
						<div style={{ display: 'flex', gap: '0.5rem' }}>
							<input
								id="project-name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								maxLength={100}
								style={{
									flex: 1,
									padding: '0.5rem 0.75rem',
									border: '1px solid #d1d5db',
									borderRadius: '0.375rem',
									fontSize: '0.875rem',
									boxSizing: 'border-box',
								}}
							/>
							<button
								type="submit"
								disabled={updateProject.isPending || !name.trim() || name.trim() === project.name}
								style={{
									padding: '0.5rem 1rem',
									backgroundColor:
										updateProject.isPending || !name.trim() || name.trim() === project.name
											? '#d1d5db'
											: '#111',
									color: '#fff',
									border: 'none',
									borderRadius: '0.375rem',
									fontSize: '0.875rem',
									cursor:
										updateProject.isPending || !name.trim() || name.trim() === project.name
											? 'not-allowed'
											: 'pointer',
								}}
							>
								{updateProject.isPending ? 'Saving...' : 'Save'}
							</button>
						</div>
						{nameStatus === 'saved' && (
							<p style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>Name updated.</p>
						)}
						{nameStatus === 'error' && (
							<p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>Failed to update name.</p>
						)}
					</div>
				</form>

				{/* Mode display (read-only) */}
				<div>
					<label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
						Mode
					</label>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<span style={modeBadgeStyles[project.mode]}>
							{project.mode === 'demo-booking' ? 'Demo Booking' : 'Waitlist'}
						</span>
						<span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
							Cannot be changed after creation
						</span>
					</div>
				</div>
			</div>

			{/* Field Configuration */}
			<div
				style={{
					padding: '1.25rem',
					border: '1px solid #e5e7eb',
					borderRadius: '0.5rem',
					backgroundColor: '#fff',
				}}
			>
				{project.fieldConfig && (
					<FieldConfigForm
						projectId={projectId}
						collectName={project.fieldConfig.collectName}
						collectCompany={project.fieldConfig.collectCompany}
						collectMessage={project.fieldConfig.collectMessage}
					/>
				)}
			</div>
		</div>
	);
}
