// ABOUTME: Light sidebar navigation component mirroring Linear's design language.
// ABOUTME: Shows workspace name, nav links with Lucide icons, project list, and user dropdown.

import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { LayoutGrid, LogOut, Plus, Settings } from 'lucide-react';
import { PauseLogo } from '@/components/PauseLogo';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProjects } from '@/hooks/useProjects';
import { authClient } from '@/lib/auth-client';
import { reset as resetTracking } from '@/lib/tracking';
import { cn } from '@/lib/utils';

interface SidebarProps {
	onClose?: () => void;
	onCreateProject?: () => void;
}

export function Sidebar({ onClose, onCreateProject }: SidebarProps) {
	const { data: session } = authClient.useSession();
	const { data: projects } = useProjects();
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();

	const handleLogout = async () => {
		resetTracking();
		await authClient.signOut();
		navigate({ to: '/login' });
	};

	const isActive = (path: string, params?: Record<string, string>) => {
		return !!matchRoute({ to: path, params, fuzzy: true });
	};

	return (
		<aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar">
			{/* Workspace header */}
			<div className="px-4 py-3">
				<Link
					to="/"
					onClick={() => onClose?.()}
					className="flex items-center gap-2 text-sm font-bold text-foreground no-underline"
				>
					<PauseLogo size={18} />
					pleasehold
				</Link>
			</div>

			<Separator />

			{/* Primary nav */}
			<nav className="flex-1 overflow-y-auto px-2 py-2">
				<div className="space-y-0.5">
					<Link
						to="/"
						onClick={() => onClose?.()}
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
						<div className="mb-1 flex items-center justify-between px-2.5">
							<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Your Projects
							</span>
							<TooltipProvider delayDuration={200}>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={() => {
												onClose?.();
												onCreateProject?.();
											}}
											className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
										>
											<Plus className="h-3.5 w-3.5" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="right">
										<p>New project</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<div className="space-y-0.5">
							{projects.map((project) => (
								<Link
									key={project.id}
									to="/projects/$projectId"
									params={{ projectId: project.id }}
									onClick={() => onClose?.()}
									className={cn(
										'flex items-center gap-2.5 truncate rounded-md px-2.5 py-1.5 text-sm no-underline transition-colors',
										isActive('/projects/$projectId', { projectId: project.id })
											? 'bg-accent font-medium text-foreground'
											: 'text-muted hover:bg-accent hover:text-foreground',
									)}
								>
									<span
										className="h-2 w-2 flex-shrink-0 rounded-full"
										style={{
											backgroundColor:
												project.brandColor ?? (project.mode === 'waitlist' ? '#3b82f6' : '#8b5cf6'),
										}}
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
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-accent"
							>
								<div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
									{(session.user.name?.[0] ?? session.user.email[0]).toUpperCase()}
								</div>
								<span className="min-w-0 truncate text-sm text-muted">{session.user.email}</span>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent side="top" align="start" className="w-48">
							<DropdownMenuItem
								onClick={() => {
									onClose?.();
									navigate({ to: '/settings' });
								}}
							>
								<Settings className="mr-2 h-4 w-4" />
								Settings
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive" onClick={handleLogout}>
								<LogOut className="mr-2 h-4 w-4" />
								Sign out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}
		</aside>
	);
}
