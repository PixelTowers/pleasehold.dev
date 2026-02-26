// ABOUTME: Entry detail page displaying all fields, metadata, and timestamps for a single entry.
// ABOUTME: Provides status management via dropdown and breadcrumb navigation back to entries list.

import { Link, createFileRoute } from '@tanstack/react-router';
import { trpc } from '../../../../lib/trpc';
import { EntryStatusBadge } from '../../../../components/EntryStatusBadge';

export const Route = createFileRoute('/projects/$projectId/entries/$entryId')({
	component: EntryDetailPage,
});

const labelStyle: React.CSSProperties = {
	fontWeight: 500,
	color: '#6b7280',
	fontSize: '0.875rem',
};

const valueStyle: React.CSSProperties = {
	fontSize: '0.875rem',
	color: '#111827',
};

function EntryDetailPage() {
	const { projectId, entryId } = Route.useParams();
	const utils = trpc.useUtils();

	const {
		data: entry,
		isPending,
		error,
	} = trpc.entry.getById.useQuery({ projectId, entryId });

	const { data: project } = trpc.project.getById.useQuery({ id: projectId });

	const mutation = trpc.entry.updateStatus.useMutation({
		onSuccess: () => {
			utils.entry.getById.invalidate({ projectId, entryId });
			utils.entry.list.invalidate();
			utils.entry.stats.invalidate();
		},
	});

	if (isPending) {
		return (
			<div style={{ textAlign: 'center', padding: '4rem' }}>
				<p style={{ color: '#6b7280' }}>Loading entry...</p>
			</div>
		);
	}

	if (error) {
		const isNotFound = error.message === 'Entry not found';
		return (
			<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
				<div style={{ marginBottom: '1rem' }}>
					<Link
						to="/projects/$projectId/entries"
						params={{ projectId }}
						style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}
					>
						&larr; Back to entries
					</Link>
				</div>
				<div
					style={{
						padding: '1rem',
						backgroundColor: isNotFound ? '#f9fafb' : '#fef2f2',
						border: `1px solid ${isNotFound ? '#e5e7eb' : '#fecaca'}`,
						borderRadius: '0.375rem',
						color: isNotFound ? '#6b7280' : '#dc2626',
						fontSize: '0.875rem',
					}}
				>
					{isNotFound
						? 'Entry not found. It may have been deleted or belongs to a different project.'
						: 'Failed to load entry. Please try again.'}
				</div>
			</div>
		);
	}

	const metadataEntries =
		entry.metadata && typeof entry.metadata === 'object'
			? Object.entries(entry.metadata as Record<string, unknown>)
			: [];

	return (
		<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
			{/* Breadcrumb */}
			<div style={{ marginBottom: '1.5rem' }}>
				<Link
					to="/projects/$projectId/entries"
					params={{ projectId }}
					style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}
				>
					&larr; Back to entries
				</Link>
			</div>

			{/* Header row */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '1.5rem',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
					<h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{entry.email}</h1>
					<EntryStatusBadge status={entry.status} />
				</div>
			</div>

			{/* Status selector */}
			<div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
				<label htmlFor="status-select" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
					Status:
				</label>
				<select
					id="status-select"
					value={entry.status}
					onChange={(e) =>
						mutation.mutate({
							projectId,
							entryId,
							status: e.target.value as 'new' | 'contacted' | 'converted' | 'archived',
						})
					}
					disabled={mutation.isPending}
					style={{
						padding: '0.375rem 0.75rem',
						border: '1px solid #d1d5db',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						backgroundColor: '#fff',
					}}
				>
					<option value="new">New</option>
					<option value="contacted">Contacted</option>
					<option value="converted">Converted</option>
					<option value="archived">Archived</option>
				</select>
				{mutation.isPending && (
					<span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Saving...</span>
				)}
			</div>

			{/* Details card */}
			<div
				style={{
					border: '1px solid #e5e7eb',
					borderRadius: '0.5rem',
					backgroundColor: '#fff',
					padding: '1.5rem',
				}}
			>
				<h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Details</h2>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '10rem 1fr',
						gap: '0.75rem 1rem',
					}}
				>
					<span style={labelStyle}>Email</span>
					<span style={valueStyle}>{entry.email}</span>

					<span style={labelStyle}>Name</span>
					<span style={valueStyle}>{entry.name ?? '\u2014'}</span>

					<span style={labelStyle}>Company</span>
					<span style={valueStyle}>{entry.company ?? '\u2014'}</span>

					<span style={labelStyle}>Message</span>
					<span style={valueStyle}>{entry.message ?? '\u2014'}</span>

					<span style={labelStyle}>Queue Position</span>
					<span style={valueStyle}>#{entry.position}</span>

					<span style={labelStyle}>Status</span>
					<span style={valueStyle}>
						<EntryStatusBadge status={entry.status} />
					</span>

					<span style={labelStyle}>Submitted</span>
					<span style={valueStyle}>{new Date(entry.createdAt).toLocaleString()}</span>

					<span style={labelStyle}>Last Updated</span>
					<span style={valueStyle}>{new Date(entry.updatedAt).toLocaleString()}</span>
				</div>
			</div>

			{/* Metadata section */}
			<h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>
				Metadata
			</h2>
			{metadataEntries.length > 0 ? (
				<div
					style={{
						border: '1px solid #e5e7eb',
						borderRadius: '0.5rem',
						backgroundColor: '#fff',
						padding: '1.5rem',
					}}
				>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '10rem 1fr',
							gap: '0.75rem 1rem',
						}}
					>
						{metadataEntries.map(([key, value]) => (
							<>
								<span key={`${key}-label`} style={labelStyle}>
									{key}
								</span>
								<span key={`${key}-value`} style={valueStyle}>
									{String(value)}
								</span>
							</>
						))}
					</div>
				</div>
			) : (
				<div
					style={{
						padding: '1.5rem',
						border: '1px solid #e5e7eb',
						borderRadius: '0.5rem',
						backgroundColor: '#f9fafb',
						textAlign: 'center',
					}}
				>
					<p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
						No metadata attached
					</p>
				</div>
			)}
		</div>
	);
}
