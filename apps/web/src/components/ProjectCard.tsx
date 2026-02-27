// ABOUTME: Dashboard card component displaying a project summary at a glance.
// ABOUTME: Shows project name, mode badge, and last activity in a card grid layout.

import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
	id: string;
	name: string;
	mode: 'waitlist' | 'demo-booking';
	createdAt: Date;
	updatedAt: Date;
}

const modeBadgeClasses: Record<string, string> = {
	waitlist: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
	'demo-booking': 'bg-violet-100 text-violet-700 hover:bg-violet-100',
};

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - new Date(date).getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffMinutes < 1) return 'Just now';
	if (diffMinutes < 60) return `${diffMinutes}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 30) return `${diffDays}d ago`;
	return new Date(date).toLocaleDateString();
}

export function ProjectCard({ id, name, mode, createdAt, updatedAt }: ProjectCardProps) {
	return (
		<Link to="/projects/$projectId" params={{ projectId: id }} className="block no-underline">
			<Card className="p-4 transition-colors hover:bg-accent">
				<div className="mb-3 flex items-start justify-between">
					<h3 className="text-sm font-semibold text-foreground">{name}</h3>
					<Badge
						variant="secondary"
						className={cn('border-0 text-[10px] font-medium px-1.5 py-0', modeBadgeClasses[mode])}
					>
						{mode === 'demo-booking' ? 'Demo' : 'Waitlist'}
					</Badge>
				</div>
				<div className="flex justify-between text-xs text-muted">
					<span>Active {formatRelativeTime(updatedAt)}</span>
					<span className="text-muted-foreground">{new Date(createdAt).toLocaleDateString()}</span>
				</div>
			</Card>
		</Link>
	);
}
