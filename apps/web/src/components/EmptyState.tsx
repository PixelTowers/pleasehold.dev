// ABOUTME: Reusable empty state placeholder with the pause logo and a message.
// ABOUTME: Used across entries, API keys, and other list views when there's no data.

import { PauseLogo } from '@/components/PauseLogo';

interface EmptyStateProps {
	message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-16">
			<PauseLogo size={48} className="mb-4 text-border" />
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	);
}
