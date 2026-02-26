// ABOUTME: Entries management page at /projects/$projectId/entries with search, filter, pagination, and bulk actions.
// ABOUTME: Wires together EntriesTable, EntryStatsBar, BulkActionBar, and CsvExportButton with tRPC data queries.

import { useEffect, useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import type { RowSelectionState } from '@tanstack/react-table';
import { trpc } from '../../../lib/trpc';
import { EntriesTable } from '../../../components/EntriesTable';
import { EntryStatsBar } from '../../../components/EntryStatsBar';
import { BulkActionBar } from '../../../components/BulkActionBar';
import { CsvExportButton } from '../../../components/CsvExportButton';

export const Route = createFileRoute('/projects/$projectId/entries')({
	component: EntriesPage,
});

function EntriesPage() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();
	const utils = trpc.useUtils();

	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
	const [page, setPage] = useState(1);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	// Debounce search input at 300ms
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
		}, 300);
		return () => clearTimeout(timer);
	}, [search]);

	// Reset page to 1 when search or filter changes
	useEffect(() => {
		setPage(1);
		setRowSelection({});
	}, [debouncedSearch, statusFilter]);

	const { data: project, isPending: projectPending } = trpc.project.getById.useQuery({ id: projectId });
	const { data: entriesData, isPending: entriesPending, error: entriesError } = trpc.entry.list.useQuery({
		projectId,
		search: debouncedSearch || undefined,
		status: (statusFilter as 'new' | 'contacted' | 'converted' | 'archived' | 'pending_verification') || undefined,
		page,
		pageSize: 25,
	});
	const { data: statsData } = trpc.entry.stats.useQuery({ projectId });

	const bulkMutation = trpc.entry.bulkUpdateStatus.useMutation({
		onSuccess: () => {
			utils.entry.list.invalidate();
			utils.entry.stats.invalidate();
			setRowSelection({});
		},
	});

	const selectedEntryIds = Object.keys(rowSelection).filter((key) => rowSelection[key]);

	const isLoading = projectPending || entriesPending;

	if (isLoading) {
		return (
			<div style={{ textAlign: 'center', padding: '4rem' }}>
				<p style={{ color: '#6b7280' }}>Loading entries...</p>
			</div>
		);
	}

	if (entriesError) {
		return (
			<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
				<div style={{ marginBottom: '1rem' }}>
					<Link
						to="/projects/$projectId"
						params={{ projectId }}
						style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}
					>
						&larr; Back to project
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
					Failed to load entries. Please try again.
				</div>
			</div>
		);
	}

	// Empty state when no entries at all
	if (statsData && statsData.total === 0 && !debouncedSearch && !statusFilter) {
		return (
			<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
				<div style={{ marginBottom: '1.5rem' }}>
					<Link
						to="/projects/$projectId"
						params={{ projectId }}
						style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}
					>
						&larr; Back to project
					</Link>
				</div>
				<h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Entries</h1>
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
						No entries yet. Entries will appear here once you start collecting submissions via the API.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
			{/* Breadcrumb */}
			<div style={{ marginBottom: '1.5rem' }}>
				<Link
					to="/projects/$projectId"
					params={{ projectId }}
					style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}
				>
					&larr; Back to project
				</Link>
			</div>

			{/* Header */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '1.5rem',
				}}
			>
				<h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Entries</h1>
				{project && (
					<CsvExportButton projectId={projectId} projectName={project.name} />
				)}
			</div>

			{/* Stats bar */}
			{statsData && (
				<div style={{ marginBottom: '1.5rem' }}>
					<EntryStatsBar total={statsData.total} byStatus={statsData.byStatus} />
				</div>
			)}

			{/* Search and filter row */}
			<div
				style={{
					display: 'flex',
					gap: '0.75rem',
					marginBottom: '1rem',
				}}
			>
				<input
					type="text"
					placeholder="Search by email, name, or company..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					style={{
						flex: 1,
						padding: '0.5rem 0.75rem',
						border: '1px solid #d1d5db',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						outline: 'none',
					}}
				/>
				<select
					value={statusFilter ?? ''}
					onChange={(e) => setStatusFilter(e.target.value || undefined)}
					style={{
						padding: '0.5rem 0.75rem',
						border: '1px solid #d1d5db',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						backgroundColor: '#fff',
					}}
				>
					<option value="">All Statuses</option>
					<option value="new">New</option>
					<option value="contacted">Contacted</option>
					<option value="converted">Converted</option>
					<option value="archived">Archived</option>
					<option value="pending_verification">Pending Verification</option>
				</select>
			</div>

			{/* Bulk action bar */}
			<BulkActionBar
				selectedCount={selectedEntryIds.length}
				onStatusChange={(status) =>
					bulkMutation.mutate({
						projectId,
						entryIds: selectedEntryIds,
						status: status as 'new' | 'contacted' | 'converted' | 'archived',
					})
				}
				isPending={bulkMutation.isPending}
			/>

			{/* Entries table */}
			<div
				style={{
					border: '1px solid #e5e7eb',
					borderRadius: '0.5rem',
					backgroundColor: '#fff',
					overflow: 'hidden',
				}}
			>
				<EntriesTable
					data={entriesData?.entries ?? []}
					total={entriesData?.total ?? 0}
					page={page}
					pageSize={25}
					onPageChange={setPage}
					rowSelection={rowSelection}
					onRowSelectionChange={setRowSelection}
					onEntryClick={(entryId) => {
						void navigate({
							to: '/projects/$projectId/entries/$entryId',
							params: { projectId, entryId },
						});
					}}
				/>
			</div>
		</div>
	);
}
