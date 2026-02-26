// ABOUTME: Color-coded pill badge that displays entry status values (new, contacted, converted, archived).
// ABOUTME: Uses shadcn Badge with status-specific Tailwind color classes.

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusClasses: Record<string, string> = {
	new: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
	contacted: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
	converted: 'bg-green-100 text-green-800 hover:bg-green-100',
	archived: 'bg-gray-100 text-muted hover:bg-gray-100',
};

interface EntryStatusBadgeProps {
	status: string;
}

export function EntryStatusBadge({ status }: EntryStatusBadgeProps) {
	const colorClass = statusClasses[status] ?? statusClasses.archived;
	const label = status.charAt(0).toUpperCase() + status.slice(1);

	return (
		<Badge variant="secondary" className={cn('border-0 font-medium', colorClass)}>
			{label}
		</Badge>
	);
}
