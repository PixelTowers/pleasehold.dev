// ABOUTME: Light sidebar navigation component mirroring Linear's design language.
// ABOUTME: Shows workspace name, nav links with Lucide icons, project list, and user section.

import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { ChevronDown, LayoutGrid, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useProjects } from '@/hooks/useProjects';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export function Sidebar() {
	const { data: session } = authClient.useSession();
	const { data: projects } = useProjects();
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();

	const handleLogout = async () => {
		await authClient.signOut();
		navigate({ to: '/login' });
	};

	const isActive = (path: string, params?: Record<string, string>) => {
		return !!matchRoute({ to: path, params, fuzzy: true });
	};

	return (
		<aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar">
			{/* Workspace header */}
			<div className="flex items-center gap-2 px-4 py-3">
				<Link to="/" className="text-sm font-bold text-foreground no-underline">
					pleasehold
				</Link>
				<ChevronDown className="h-3.5 w-3.5 text-muted" />
			</div>

			<Separator />

			{/* Primary nav */}
			<nav className="flex-1 overflow-y-auto px-2 py-2">
				<div className="space-y-0.5">
					<Link
						to="/"
						className={cn(
							'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm no-underline transition-colors',
							isActive('/', {}) && !isActive('/projects/$projectId', { projectId: '' })
								? 'bg-accent font-medium text-foreground'
								: 'text-muted hover:bg-accent hover:text-foreground',
						)}
					>
						<LayoutGrid className="h-4 w-4" />
						Projects
					</Link>
				</div>

				{/* Project list */}
				{projects && projects.length > 0 && (
					<div className="mt-4">
						<div className="mb-1 px-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Your Projects
						</div>
						<div className="space-y-0.5">
							{projects.map((project) => (
								<Link
									key={project.id}
									to="/projects/$projectId"
									params={{ projectId: project.id }}
									className={cn(
										'flex items-center gap-2.5 truncate rounded-md px-2.5 py-1.5 text-sm no-underline transition-colors',
										isActive('/projects/$projectId', { projectId: project.id })
											? 'bg-accent font-medium text-foreground'
											: 'text-muted hover:bg-accent hover:text-foreground',
									)}
								>
									<span
										className={cn(
											'h-2 w-2 flex-shrink-0 rounded-full',
											project.mode === 'waitlist' ? 'bg-blue-500' : 'bg-violet-500',
										)}
									/>
									<span className="truncate">{project.name}</span>
								</Link>
							))}
						</div>
					</div>
				)}
			</nav>

			<Separator />

			{/* User section */}
			{session?.user && (
				<div className="px-2 py-2">
					<div className="flex items-center justify-between rounded-md px-2.5 py-1.5">
						<div className="flex items-center gap-2.5 min-w-0">
							<div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
								{(session.user.name?.[0] ?? session.user.email[0]).toUpperCase()}
							</div>
							<span className="truncate text-sm text-muted">{session.user.email}</span>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 flex-shrink-0 text-muted hover:text-foreground"
							onClick={handleLogout}
						>
							<LogOut className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
			)}
		</aside>
	);
}
