// ABOUTME: Project overview page showing project details, stats, and quick links.
// ABOUTME: Fetches project by ID with ownership guard; displays mode badge and field config summary.

import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useProject } from '@/hooks/useProjects';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects/$projectId/')({
	component: ProjectOverviewPage,
});

const modeBadgeClasses: Record<string, string> = {
	waitlist: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
	'demo-booking': 'bg-violet-100 text-violet-700 hover:bg-violet-100',
};

function ProjectOverviewPage() {
	const { projectId } = Route.useParams();
	const { data: project, isPending, error } = useProject(projectId);
	const { data: apiKeys } = trpc.apiKey.list.useQuery({ projectId }, { enabled: !!project });
	const { data: stats } = trpc.entry.stats.useQuery({ projectId }, { enabled: !!project });
	const { data: notificationChannels } = trpc.notification.list.useQuery(
		{ projectId },
		{ enabled: !!project },
	);
	const activeKeyCount = apiKeys?.filter((k) => k.enabled).length ?? 0;
	const enabledChannelCount = notificationChannels?.filter((ch) => ch.enabled).length ?? 0;

	if (isPending) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading project...</p>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="mx-auto max-w-3xl">
				<div className="mb-4">
					<Link
						to="/"
						className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						Back to dashboard
					</Link>
				</div>
				<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
					{error?.message === 'Project not found'
						? 'Project not found. It may have been deleted or you may not have access.'
						: 'Failed to load project. Please try again.'}
				</div>
			</div>
		);
	}

	const collectedFields = ['Email (always)'];
	if (project.fieldConfig?.collectName) collectedFields.push('Name');
	if (project.fieldConfig?.collectCompany) collectedFields.push('Company');
	if (project.fieldConfig?.collectMessage) collectedFields.push('Message');

	return (
		<div className="mx-auto max-w-3xl">
			{/* Breadcrumb */}
			<div className="mb-6">
				<Link
					to="/"
					className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to dashboard
				</Link>
			</div>

			{/* Header */}
			<div className="mb-8 flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
					<div className="mt-2">
						<Badge
							variant="secondary"
							className={cn('border-0 font-medium', modeBadgeClasses[project.mode])}
						>
							{project.mode === 'demo-booking' ? 'Demo Booking' : 'Waitlist'}
						</Badge>
					</div>
				</div>
				<Button variant="outline" size="sm" asChild>
					<Link to="/projects/$projectId/settings" params={{ projectId }}>
						<Settings className="mr-1.5 h-4 w-4" />
						Settings
					</Link>
				</Button>
			</div>

			{/* Stats section */}
			<div className="mb-8 grid grid-cols-4 gap-4">
				<Card className="p-4">
					<div className="mb-1 text-xs text-muted-foreground">Entries</div>
					<div className="text-2xl font-semibold">{stats?.total ?? 0}</div>
				</Card>
				<Card className="p-4">
					<div className="mb-1 text-xs text-muted-foreground">API Keys</div>
					<div className="text-2xl font-semibold">{activeKeyCount}</div>
				</Card>
				<Card className="p-4">
					<div className="mb-1 text-xs text-muted-foreground">Fields Collected</div>
					<div className="text-2xl font-semibold">{collectedFields.length}</div>
				</Card>
				<Card className="p-4">
					<div className="mb-1 text-xs text-muted-foreground">Created</div>
					<div className="mt-1 text-sm font-medium">
						{new Date(project.createdAt).toLocaleDateString()}
					</div>
				</Card>
			</div>

			{/* Quick Links */}
			<div className="mb-8">
				<h2 className="mb-3 text-base font-semibold">Quick Links</h2>
				<div className="flex flex-col gap-2">
					<Link
						to="/projects/$projectId/settings"
						params={{ projectId }}
						className="flex items-center justify-between rounded-md border bg-card px-4 py-3 text-sm text-foreground no-underline transition-colors hover:bg-accent"
					>
						<span>Field Configuration</span>
						<ArrowRight className="h-4 w-4 text-muted-foreground" />
					</Link>
					<Link
						to="/projects/$projectId/keys"
						params={{ projectId }}
						className="flex items-center justify-between rounded-md border bg-card px-4 py-3 text-sm text-foreground no-underline transition-colors hover:bg-accent"
					>
						<span>
							API Keys{' '}
							{activeKeyCount > 0 && (
								<span className="font-normal text-muted">({activeKeyCount} active)</span>
							)}
						</span>
						<ArrowRight className="h-4 w-4 text-muted-foreground" />
					</Link>
					<Link
						to="/projects/$projectId/entries"
						params={{ projectId }}
						className="flex items-center justify-between rounded-md border bg-card px-4 py-3 text-sm text-foreground no-underline transition-colors hover:bg-accent"
					>
						<span>
							Entries{' '}
							{(stats?.total ?? 0) > 0 && (
								<span className="font-normal text-muted">({stats?.total} total)</span>
							)}
						</span>
						<ArrowRight className="h-4 w-4 text-muted-foreground" />
					</Link>
					<Link
						to="/projects/$projectId/notifications"
						params={{ projectId }}
						className="flex items-center justify-between rounded-md border bg-card px-4 py-3 text-sm text-foreground no-underline transition-colors hover:bg-accent"
					>
						<span>
							Notifications{' '}
							{enabledChannelCount > 0 && (
								<span className="font-normal text-muted">({enabledChannelCount} active)</span>
							)}
						</span>
						<ArrowRight className="h-4 w-4 text-muted-foreground" />
					</Link>
				</div>
			</div>

			{/* Field config summary */}
			<div className="mb-8">
				<h2 className="mb-3 text-base font-semibold">Fields Collected</h2>
				<Card className="p-4">
					<div className="flex flex-wrap gap-2">
						{collectedFields.map((field) => (
							<Badge key={field} variant="secondary" className="font-normal">
								{field}
							</Badge>
						))}
					</div>
				</Card>
			</div>

			{/* Recent Activity */}
			<div>
				<h2 className="mb-3 text-base font-semibold">Recent Activity</h2>
				{(stats?.total ?? 0) > 0 ? (
					<Card className="bg-accent p-8 text-center">
						<Link
							to="/projects/$projectId/entries"
							params={{ projectId }}
							className="text-sm font-medium text-primary hover:underline"
						>
							View all {stats?.total} entries &rarr;
						</Link>
					</Card>
				) : (
					<Card className="bg-accent p-8 text-center">
						<p className="text-sm text-muted-foreground">
							No entries yet. Entries will appear here once you start collecting submissions.
						</p>
					</Card>
				)}
			</div>
		</div>
	);
}
