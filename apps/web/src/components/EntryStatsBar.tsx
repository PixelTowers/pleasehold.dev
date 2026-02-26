// ABOUTME: Row of stat cards displaying total entry count and per-status breakdowns above the entries table.
// ABOUTME: Uses Tailwind grid layout with card styling and shadcn EntryStatusBadge for labels.

import { Card } from '@/components/ui/card';
import { EntryStatusBadge } from './EntryStatusBadge';

interface EntryStatsBarProps {
	total: number;
	byStatus: Record<string, number>;
}

const statuses = ['new', 'contacted', 'converted', 'archived'] as const;

export function EntryStatsBar({ total, byStatus }: EntryStatsBarProps) {
	return (
		<div className="grid grid-cols-5 gap-4">
			<Card className="p-4">
				<div className="mb-1 text-xs text-muted-foreground">Total Entries</div>
				<div className="text-2xl font-semibold">{total}</div>
			</Card>
			{statuses.map((status) => (
				<Card key={status} className="p-4">
					<div className="mb-1">
						<EntryStatusBadge status={status} />
					</div>
					<div className="text-2xl font-semibold">{byStatus[status] ?? 0}</div>
				</Card>
			))}
		</div>
	);
}
