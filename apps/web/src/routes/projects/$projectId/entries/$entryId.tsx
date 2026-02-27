// ABOUTME: Entry detail page displaying all fields, metadata, and timestamps for a single entry.
// ABOUTME: Two-column layout with main content left and properties sidebar right, Linear-style.

import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { EntryStatusBadge } from '@/components/EntryStatusBadge';
import { trpc } from '@/lib/trpc';

export const Route = createFileRoute('/projects/$projectId/entries/$entryId')({
	component: EntryDetailPage,
});

function EntryDetailPage() {
	const { projectId, entryId } = Route.useParams();
	const utils = trpc.useUtils();

	const { data: entry, isPending, error } = trpc.entry.getById.useQuery({ projectId, entryId });

	const mutation = trpc.entry.updateStatus.useMutation({
		onSuccess: () => {
			toast.success('Status updated');
			utils.entry.getById.invalidate({ projectId, entryId });
			utils.entry.list.invalidate();
			utils.entry.stats.invalidate();
		},
		onError: () => {
			toast.error('Failed to update status');
		},
	});

	if (isPending) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading entry...</p>
			</div>
		);
	}

	if (error) {
		const isNotFound = error.message === 'Entry not found';
		return (
			<div className="mx-auto max-w-4xl">
				<div className="mb-4">
					<Link
						to="/projects/$projectId/entries"
						params={{ projectId }}
						className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						Back to entries
					</Link>
				</div>
				<div
					className={
						isNotFound
							? 'rounded-md border bg-accent px-4 py-3 text-sm text-muted'
							: 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive'
					}
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
		<div className="mx-auto max-w-4xl">
			{/* Breadcrumb */}
			<div className="mb-6">
				<Link
					to="/projects/$projectId/entries"
					params={{ projectId }}
					className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to entries
				</Link>
			</div>

			{/* Header */}
			<div className="mb-6">
				<h1 className="text-xl font-semibold text-foreground">{entry.email}</h1>
			</div>

			{/* Two-column layout */}
			<div className="flex gap-8">
				{/* Main content — left column */}
				<div className="min-w-0 flex-1">
					{/* Details */}
					<div className="mb-6">
						<h2 className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
							Details
						</h2>
						<div className="border-t border-border/50">
							<div className="flex border-b border-border/50 py-2">
								<span className="w-28 shrink-0 text-xs text-muted-foreground">Email</span>
								<span className="text-sm text-foreground">{entry.email}</span>
							</div>
							<div className="flex border-b border-border/50 py-2">
								<span className="w-28 shrink-0 text-xs text-muted-foreground">Name</span>
								<span className="text-sm text-foreground">{entry.name ?? '\u2014'}</span>
							</div>
							<div className="flex border-b border-border/50 py-2">
								<span className="w-28 shrink-0 text-xs text-muted-foreground">Company</span>
								<span className="text-sm text-foreground">{entry.company ?? '\u2014'}</span>
							</div>
							{entry.message && (
								<div className="flex border-b border-border/50 py-2">
									<span className="w-28 shrink-0 text-xs text-muted-foreground">Message</span>
									<span className="text-sm text-foreground">{entry.message}</span>
								</div>
							)}
						</div>
					</div>

					{/* Metadata */}
					<div>
						<h2 className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
							Metadata
						</h2>
						{metadataEntries.length > 0 ? (
							<div className="border-t border-border/50">
								{metadataEntries.map(([key, value]) => (
									<div key={key} className="flex border-b border-border/50 py-2">
										<span className="w-28 shrink-0 text-xs text-muted-foreground">{key}</span>
										<span className="text-sm text-foreground">{String(value)}</span>
									</div>
								))}
							</div>
						) : (
							<div className="border-t border-border/50 py-6 text-center">
								<p className="text-sm text-muted-foreground">No metadata attached</p>
							</div>
						)}
					</div>
				</div>

				{/* Properties sidebar — right column */}
				<div className="w-56 shrink-0">
					<h2 className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
						Properties
					</h2>
					<div className="border-t border-border/50">
						<div className="border-b border-border/50 py-2">
							<div className="mb-1 text-xs text-muted-foreground">Status</div>
							<select
								value={entry.status}
								onChange={(e) =>
									mutation.mutate({
										projectId,
										entryId,
										status: e.target.value as 'new' | 'contacted' | 'converted' | 'archived',
									})
								}
								disabled={mutation.isPending}
								className="w-full rounded border-0 bg-transparent py-0 text-sm font-medium text-foreground focus:ring-0"
							>
								<option value="new">New</option>
								<option value="contacted">Contacted</option>
								<option value="converted">Converted</option>
								<option value="archived">Archived</option>
							</select>
						</div>
						<div className="border-b border-border/50 py-2">
							<div className="mb-0.5 text-xs text-muted-foreground">Display Status</div>
							<EntryStatusBadge status={entry.status} />
						</div>
						<div className="border-b border-border/50 py-2">
							<div className="mb-0.5 text-xs text-muted-foreground">Position</div>
							<span className="text-sm text-foreground">#{entry.position}</span>
						</div>
						<div className="border-b border-border/50 py-2">
							<div className="mb-0.5 text-xs text-muted-foreground">Submitted</div>
							<span className="text-sm text-foreground">
								{new Date(entry.createdAt).toLocaleString()}
							</span>
						</div>
						<div className="border-b border-border/50 py-2">
							<div className="mb-0.5 text-xs text-muted-foreground">Updated</div>
							<span className="text-sm text-foreground">
								{new Date(entry.updatedAt).toLocaleString()}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
