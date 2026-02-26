// ABOUTME: Entry detail page displaying all fields, metadata, and timestamps for a single entry.
// ABOUTME: Provides status management via dropdown and breadcrumb navigation back to entries list.

import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { EntryStatusBadge } from '@/components/EntryStatusBadge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/projects/$projectId/entries/$entryId')({
	component: EntryDetailPage,
});

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
			<div className="py-16 text-center">
				<p className="text-muted">Loading entry...</p>
			</div>
		);
	}

	if (error) {
		const isNotFound = error.message === 'Entry not found';
		return (
			<div className="mx-auto max-w-3xl">
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
				<div className={
					isNotFound
						? 'rounded-md border bg-accent px-4 py-3 text-sm text-muted'
						: 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive'
				}>
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
		<div className="mx-auto max-w-3xl">
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

			{/* Header row */}
			<div className="mb-6 flex items-center gap-3">
				<h1 className="text-2xl font-semibold text-foreground">{entry.email}</h1>
				<EntryStatusBadge status={entry.status} />
			</div>

			{/* Status selector */}
			<div className="mb-6 flex items-center gap-3">
				<Label htmlFor="status-select">Status:</Label>
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
					className="rounded-md border border-input bg-card px-3 py-1.5 text-sm"
				>
					<option value="new">New</option>
					<option value="contacted">Contacted</option>
					<option value="converted">Converted</option>
					<option value="archived">Archived</option>
				</select>
				{mutation.isPending && (
					<span className="text-xs text-muted">Saving...</span>
				)}
			</div>

			{/* Details card */}
			<Card className="mb-6 p-6">
				<h2 className="mb-4 text-base font-semibold">Details</h2>
				<div className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-3">
					<span className="text-sm font-medium text-muted">Email</span>
					<span className="text-sm text-foreground">{entry.email}</span>

					<span className="text-sm font-medium text-muted">Name</span>
					<span className="text-sm text-foreground">{entry.name ?? '\u2014'}</span>

					<span className="text-sm font-medium text-muted">Company</span>
					<span className="text-sm text-foreground">{entry.company ?? '\u2014'}</span>

					<span className="text-sm font-medium text-muted">Message</span>
					<span className="text-sm text-foreground">{entry.message ?? '\u2014'}</span>

					<span className="text-sm font-medium text-muted">Queue Position</span>
					<span className="text-sm text-foreground">#{entry.position}</span>

					<span className="text-sm font-medium text-muted">Status</span>
					<span className="text-sm">
						<EntryStatusBadge status={entry.status} />
					</span>

					<span className="text-sm font-medium text-muted">Submitted</span>
					<span className="text-sm text-foreground">{new Date(entry.createdAt).toLocaleString()}</span>

					<span className="text-sm font-medium text-muted">Last Updated</span>
					<span className="text-sm text-foreground">{new Date(entry.updatedAt).toLocaleString()}</span>
				</div>
			</Card>

			{/* Metadata section */}
			<h2 className="mb-3 text-base font-semibold">Metadata</h2>
			{metadataEntries.length > 0 ? (
				<Card className="p-6">
					<div className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-3">
						{metadataEntries.map(([key, value]) => (
							<>
								<span key={`${key}-label`} className="text-sm font-medium text-muted">
									{key}
								</span>
								<span key={`${key}-value`} className="text-sm text-foreground">
									{String(value)}
								</span>
							</>
						))}
					</div>
				</Card>
			) : (
				<Card className="bg-accent p-6 text-center">
					<p className="text-sm text-muted-foreground">
						No metadata attached
					</p>
				</Card>
			)}
		</div>
	);
}
