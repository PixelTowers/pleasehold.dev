// ABOUTME: Action bar for bulk status changes on selected entries, shown above the entries table.
// ABOUTME: Renders status change buttons when one or more entries are selected; hidden when none selected.

import { Button } from '@/components/ui/button';

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
		<div className="mb-4 flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm">
			<span className="font-medium">{selectedCount} selected</span>
			<span className="text-muted">Set status:</span>
			{statuses.map((status) => (
				<Button
					key={status}
					type="button"
					variant="outline"
					size="sm"
					className="h-7 text-xs"
					disabled={isPending}
					onClick={() => onStatusChange(status)}
				>
					{status.charAt(0).toUpperCase() + status.slice(1)}
				</Button>
			))}
		</div>
	);
}
