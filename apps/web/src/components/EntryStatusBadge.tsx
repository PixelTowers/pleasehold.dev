// ABOUTME: Color-coded status indicator using a small dot and text label for entry statuses.
// ABOUTME: Uses subtle dot+text pattern instead of pill badges for Linear-style aesthetic.

import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
	new: 'bg-blue-500',
	contacted: 'bg-amber-500',
	converted: 'bg-green-500',
	archived: 'bg-gray-400',
	pending_verification: 'bg-orange-400',
};

const statusTextColors: Record<string, string> = {
	new: 'text-blue-700',
	contacted: 'text-amber-700',
	converted: 'text-green-700',
	archived: 'text-muted',
	pending_verification: 'text-orange-600',
};

interface EntryStatusBadgeProps {
	status: string;
}

export function EntryStatusBadge({ status }: EntryStatusBadgeProps) {
	const dotColor = statusColors[status] ?? statusColors.archived;
	const textColor = statusTextColors[status] ?? statusTextColors.archived;
	const label =
		status === 'pending_verification'
			? 'Pending'
			: status.charAt(0).toUpperCase() + status.slice(1);

	return (
		<span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', textColor)}>
			<span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
			{label}
		</span>
	);
}
