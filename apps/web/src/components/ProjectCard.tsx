// ABOUTME: Dashboard card component displaying a project summary at a glance.
// ABOUTME: Shows project name, mode badge, brand color accent, logo thumbnail, and last activity.

import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ProjectCardProps {
	id: string;
	name: string;
	mode: 'waitlist' | 'demo-booking';
	createdAt: Date;
	updatedAt: Date;
	brandColor?: string | null;
	logoUrl?: string | null;
	entryCount?: number;
}

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

export function ProjectCard({
	id,
	name,
	mode,
	createdAt,
	updatedAt,
	brandColor,
	logoUrl,
	entryCount,
}: ProjectCardProps) {
	const accentColor = brandColor ?? (mode === 'waitlist' ? '#3b82f6' : '#8b5cf6');

	return (
		<Link to="/projects/$projectId" params={{ projectId: id }} className="block no-underline">
			<Card className="overflow-hidden transition-colors hover:bg-accent">
				<div className="h-1" style={{ backgroundColor: accentColor }} />
				<div className="p-4">
					<div className="mb-3 flex items-start justify-between">
						<div className="flex items-center gap-2">
							{logoUrl && (
								<img
									src={logoUrl}
									alt=""
									className="h-6 w-6 flex-shrink-0 rounded border border-border/50 object-contain"
								/>
							)}
							<h3 className="text-sm font-semibold text-foreground">{name}</h3>
						</div>
						<Badge
							variant="secondary"
							className="border-0 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
						>
							{mode === 'demo-booking' ? 'Demo' : 'Waitlist'}
						</Badge>
					</div>
					{entryCount !== undefined && (
						<p className="mb-3 text-lg font-semibold text-foreground">
							{entryCount.toLocaleString()}{' '}
							<span className="text-xs font-normal text-muted">
								{mode === 'demo-booking' ? 'bookings' : 'waiting'}
							</span>
						</p>
					)}
					<div className="flex justify-between text-xs text-muted">
						<span>Active {formatRelativeTime(updatedAt)}</span>
						<span className="text-muted-foreground">
							{new Date(createdAt).toLocaleDateString()}
						</span>
					</div>
				</div>
			</Card>
		</Link>
	);
}
