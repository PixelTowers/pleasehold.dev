// ABOUTME: Entries management page at /projects/$projectId/entries with search, filter, pagination, and bulk actions.
// ABOUTME: Wires together EntriesTable, EntryStatsBar, BulkActionBar, and CsvExportButton with tRPC data queries.

import { useEffect, useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import type { RowSelectionState } from '@tanstack/react-table';
import { ArrowLeft, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { EntriesTable } from '@/components/EntriesTable';
import { EntryStatsBar } from '@/components/EntryStatsBar';
import { BulkActionBar } from '@/components/BulkActionBar';
import { CsvExportButton } from '@/components/CsvExportButton';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

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
			<div className="py-16 text-center">
				<p className="text-muted">Loading entries...</p>
			</div>
		);
	}

	if (entriesError) {
		return (
			<div className="mx-auto max-w-3xl">
				<div className="mb-4">
					<Link
						to="/projects/$projectId"
						params={{ projectId }}
						className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						Back to project
					</Link>
				</div>
				<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
					Failed to load entries. Please try again.
				</div>
			</div>
		);
	}

	// Empty state when no entries at all
	if (statsData && statsData.total === 0 && !debouncedSearch && !statusFilter) {
		return (
			<div className="mx-auto max-w-3xl">
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
				<h1 className="mb-6 text-2xl font-semibold text-foreground">Entries</h1>
				<Card className="bg-accent p-8 text-center">
					<p className="text-sm text-muted-foreground">
						No entries yet. Entries will appear here once you start collecting submissions via the API.
					</p>
				</Card>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-3xl">
			{/* Breadcrumb */}
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

			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-foreground">Entries</h1>
				{project && (
					<CsvExportButton projectId={projectId} projectName={project.name} />
				)}
			</div>

			{/* Stats bar */}
			{statsData && (
				<div className="mb-6">
					<EntryStatsBar total={statsData.total} byStatus={statsData.byStatus} />
				</div>
			)}

			{/* Search and filter row */}
			<div className="mb-4 flex gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search by email, name, or company..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<select
					value={statusFilter ?? ''}
					onChange={(e) => setStatusFilter(e.target.value || undefined)}
					className="rounded-md border border-input bg-card px-3 py-2 text-sm"
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
			<Card className="overflow-hidden">
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
			</Card>
		</div>
	);
}
