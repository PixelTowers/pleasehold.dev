// ABOUTME: Project overview page showing project details, stats, and quick links.
// ABOUTME: Fetches project by ID with ownership guard; displays mode badge and field config summary.

import { Link, createFileRoute } from '@tanstack/react-router';
import { useProject } from '../../../hooks/useProjects';
import { trpc } from '../../../lib/trpc';

export const Route = createFileRoute('/projects/$projectId/')({
	component: ProjectOverviewPage,
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

function ProjectOverviewPage() {
	const { projectId } = Route.useParams();
	const { data: project, isPending, error } = useProject(projectId);
	const { data: apiKeys } = trpc.apiKey.list.useQuery(
		{ projectId },
		{ enabled: !!project },
	);
	const { data: stats } = trpc.entry.stats.useQuery(
		{ projectId },
		{ enabled: !!project },
	);
	const { data: notificationChannels } = trpc.notification.list.useQuery(
		{ projectId },
		{ enabled: !!project },
	);
	const activeKeyCount = apiKeys?.filter((k) => k.enabled).length ?? 0;
	const enabledChannelCount = notificationChannels?.filter((ch) => ch.enabled).length ?? 0;

	if (isPending) {
		return (
			<div style={{ textAlign: 'center', padding: '4rem' }}>
				<p style={{ color: '#6b7280' }}>Loading project...</p>
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
					{error?.message === 'Project not found'
						? 'Project not found. It may have been deleted or you may not have access.'
						: 'Failed to load project. Please try again.'}
				</div>
			</div>
		);
	}

	const collectedFields = ['Email (always)'];
	if (project.fieldConfig?.collectName) collectedFields.push('Name');
	if (project.fieldConfig?.collectCompany) collectedFields.push('Company');
	if (project.fieldConfig?.collectMessage) collectedFields.push('Message');

	return (
		<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
			{/* Breadcrumb */}
			<div style={{ marginBottom: '1.5rem' }}>
				<Link to="/" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>
					&larr; Back to dashboard
				</Link>
			</div>

			{/* Header */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
				<div>
					<h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{project.name}</h1>
					<div style={{ marginTop: '0.5rem' }}>
						<span style={modeBadgeStyles[project.mode]}>
							{project.mode === 'demo-booking' ? 'Demo Booking' : 'Waitlist'}
						</span>
					</div>
				</div>
				<Link
					to="/projects/$projectId/settings"
					params={{ projectId }}
					style={{
						padding: '0.5rem 1rem',
						border: '1px solid #d1d5db',
						borderRadius: '0.375rem',
						backgroundColor: '#fff',
						fontSize: '0.875rem',
						textDecoration: 'none',
						color: '#374151',
					}}
				>
					Settings
				</Link>
			</div>

			{/* Stats section */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(4, 1fr)',
					gap: '1rem',
					marginBottom: '2rem',
				}}
			>
				<div
					style={{
						padding: '1rem',
						border: '1px solid #e5e7eb',
						borderRadius: '0.5rem',
						backgroundColor: '#fff',
					}}
				>
					<div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Entries</div>
					<div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats?.total ?? 0}</div>
				</div>
				<div
					style={{
						padding: '1rem',
						border: '1px solid #e5e7eb',
						borderRadius: '0.5rem',
						backgroundColor: '#fff',
					}}
				>
					<div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>API Keys</div>
					<div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{activeKeyCount}</div>
				</div>
				<div
					style={{
						padding: '1rem',
						border: '1px solid #e5e7eb',
						borderRadius: '0.5rem',
						backgroundColor: '#fff',
					}}
				>
					<div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Fields Collected</div>
					<div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{collectedFields.length}</div>
				</div>
				<div
					style={{
						padding: '1rem',
						border: '1px solid #e5e7eb',
						borderRadius: '0.5rem',
						backgroundColor: '#fff',
					}}
				>
					<div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Created</div>
					<div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: '0.375rem' }}>
						{new Date(project.createdAt).toLocaleDateString()}
					</div>
				</div>
			</div>

			{/* Quick Links */}
			<div style={{ marginBottom: '2rem' }}>
				<h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Quick Links</h2>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
					<Link
						to="/projects/$projectId/settings"
						params={{ projectId }}
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							padding: '0.75rem 1rem',
							border: '1px solid #e5e7eb',
							borderRadius: '0.375rem',
							backgroundColor: '#fff',
							textDecoration: 'none',
							color: 'inherit',
							fontSize: '0.875rem',
						}}
					>
						<span>Field Configuration</span>
						<span style={{ color: '#9ca3af' }}>&rarr;</span>
					</Link>
					<Link
						to="/projects/$projectId/keys"
						params={{ projectId }}
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							padding: '0.75rem 1rem',
							border: '1px solid #e5e7eb',
							borderRadius: '0.375rem',
							backgroundColor: '#fff',
							textDecoration: 'none',
							color: 'inherit',
							fontSize: '0.875rem',
						}}
					>
						<span>API Keys {activeKeyCount > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}>({activeKeyCount} active)</span>}</span>
						<span style={{ color: '#9ca3af' }}>&rarr;</span>
					</Link>
					<Link
						to="/projects/$projectId/entries"
						params={{ projectId }}
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							padding: '0.75rem 1rem',
							border: '1px solid #e5e7eb',
							borderRadius: '0.375rem',
							backgroundColor: '#fff',
							textDecoration: 'none',
							color: 'inherit',
							fontSize: '0.875rem',
						}}
					>
						<span>Entries {(stats?.total ?? 0) > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}>({stats?.total} total)</span>}</span>
						<span style={{ color: '#9ca3af' }}>&rarr;</span>
					</Link>
					<Link
						to="/projects/$projectId/notifications"
						params={{ projectId }}
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							padding: '0.75rem 1rem',
							border: '1px solid #e5e7eb',
							borderRadius: '0.375rem',
							backgroundColor: '#fff',
							textDecoration: 'none',
							color: 'inherit',
							fontSize: '0.875rem',
						}}
					>
						<span>Notifications {enabledChannelCount > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}>({enabledChannelCount} active)</span>}</span>
						<span style={{ color: '#9ca3af' }}>&rarr;</span>
					</Link>
				</div>
			</div>

			{/* Field config summary */}
			<div style={{ marginBottom: '2rem' }}>
				<h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Fields Collected</h2>
				<div
					style={{
						padding: '1rem',
						border: '1px solid #e5e7eb',
						borderRadius: '0.5rem',
						backgroundColor: '#fff',
					}}
				>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
						{collectedFields.map((field) => (
							<span
								key={field}
								style={{
									padding: '0.25rem 0.75rem',
									backgroundColor: '#f3f4f6',
									borderRadius: '9999px',
									fontSize: '0.8125rem',
									color: '#374151',
								}}
							>
								{field}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* Recent Activity */}
			<div>
				<h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Recent Activity</h2>
				{(stats?.total ?? 0) > 0 ? (
					<div
						style={{
							padding: '2rem',
							border: '1px solid #e5e7eb',
							borderRadius: '0.5rem',
							backgroundColor: '#f9fafb',
							textAlign: 'center',
						}}
					>
						<Link
							to="/projects/$projectId/entries"
							params={{ projectId }}
							style={{ color: '#2563eb', fontSize: '0.875rem', textDecoration: 'none' }}
						>
							View all {stats?.total} entries &rarr;
						</Link>
					</div>
				) : (
					<div
						style={{
							padding: '2rem',
							border: '1px solid #e5e7eb',
							borderRadius: '0.5rem',
							backgroundColor: '#f9fafb',
							textAlign: 'center',
						}}
					>
						<p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
							No entries yet. Entries will appear here once you start collecting submissions.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
