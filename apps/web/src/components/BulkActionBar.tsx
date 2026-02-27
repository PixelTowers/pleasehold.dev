// ABOUTME: Action bar for bulk status changes on selected entries, shown above the entries table.
// ABOUTME: Renders status change buttons when one or more entries are selected; hidden when none selected.

interface BulkActionBarProps {
	selectedCount: number;
	onStatusChange: (status: string) => void;
	isPending: boolean;
}

const statuses = ['new', 'contacted', 'converted', 'archived'] as const;

export function BulkActionBar({ selectedCount, onStatusChange, isPending }: BulkActionBarProps) {
	if (selectedCount === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap items-center gap-3 border-b border-border/50 bg-accent/50 px-2 py-1.5 text-xs">
			<span className="font-medium text-foreground">{selectedCount} selected</span>
			<span className="text-muted-foreground">Set status:</span>
			{statuses.map((status) => (
				<button
					key={status}
					type="button"
					className="rounded px-2 py-0.5 text-xs text-muted hover:bg-accent hover:text-foreground disabled:opacity-40"
					disabled={isPending}
					onClick={() => onStatusChange(status)}
				>
					{status.charAt(0).toUpperCase() + status.slice(1)}
				</button>
			))}
		</div>
	);
}
