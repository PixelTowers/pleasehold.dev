// ABOUTME: Project settings page with editable name and field configuration toggles.
// ABOUTME: Mode is displayed as read-only badge; field toggles auto-save via tRPC mutation.

import { Link, createFileRoute } from '@tanstack/react-router';
import { type FormEvent, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldConfigForm } from '@/components/FieldConfigForm';
import { useProject } from '@/hooks/useProjects';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/projects/$projectId/settings')({
	component: ProjectSettingsPage,
});

const modeBadgeClasses: Record<string, string> = {
	waitlist: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
	'demo-booking': 'bg-violet-100 text-violet-700 hover:bg-violet-100',
};

function ProjectSettingsPage() {
	const { projectId } = Route.useParams();
	const { data: project, isPending, error } = useProject(projectId);
	const [name, setName] = useState('');
	const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

	const utils = trpc.useUtils();
	const updateProject = trpc.project.update.useMutation({
		onSuccess: () => {
			setNameStatus('saved');
			utils.project.getById.invalidate({ id: projectId });
			utils.project.list.invalidate();
			setTimeout(() => setNameStatus('idle'), 2000);
		},
		onError: () => {
			setNameStatus('error');
			setTimeout(() => setNameStatus('idle'), 3000);
		},
	});

	useEffect(() => {
		if (project) {
			setName(project.name);
		}
	}, [project]);

	if (isPending) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading settings...</p>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="mx-auto max-w-3xl">
				<div className="mb-4">
					<Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
						<ArrowLeft className="h-3.5 w-3.5" />
						Back to dashboard
					</Link>
				</div>
				<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
					Failed to load project settings. Please try again.
				</div>
			</div>
		);
	}

	const handleNameSave = (e: FormEvent) => {
		e.preventDefault();
		if (!name.trim() || name.trim() === project.name) return;
		setNameStatus('saving');
		updateProject.mutate({ id: projectId, name: name.trim() });
	};

	return (
		<div className="mx-auto max-w-3xl">
			{/* Breadcrumb */}
			<div className="mb-6">
				<Link to="/projects/$projectId" params={{ projectId }} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to project
				</Link>
			</div>

			<h1 className="mb-8 text-2xl font-semibold text-foreground">Project Settings</h1>

			{/* Project Name */}
			<Card className="mb-6 p-5">
				<h3 className="mb-4 text-base font-semibold">General</h3>

				<form onSubmit={handleNameSave}>
					<div className="mb-4">
						<Label htmlFor="project-name" className="mb-1.5 block">Project name</Label>
						<div className="flex gap-2">
							<Input
								id="project-name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								maxLength={100}
								className="flex-1"
							/>
							<Button
								type="submit"
								disabled={updateProject.isPending || !name.trim() || name.trim() === project.name}
							>
								{updateProject.isPending ? 'Saving...' : 'Save'}
							</Button>
						</div>
						{nameStatus === 'saved' && (
							<p className="mt-1 text-xs text-green-600">Name updated.</p>
						)}
						{nameStatus === 'error' && (
							<p className="mt-1 text-xs text-destructive">Failed to update name.</p>
						)}
					</div>
				</form>

				{/* Mode display (read-only) */}
				<div>
					<Label className="mb-1.5 block">Mode</Label>
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className={cn('border-0 font-medium', modeBadgeClasses[project.mode])}>
							{project.mode === 'demo-booking' ? 'Demo Booking' : 'Waitlist'}
						</Badge>
						<span className="text-xs text-muted-foreground">Cannot be changed after creation</span>
					</div>
				</div>
			</Card>

			{/* Field Configuration */}
			<Card className="p-5">
				{project.fieldConfig && (
					<FieldConfigForm
						projectId={projectId}
						collectName={project.fieldConfig.collectName}
						collectCompany={project.fieldConfig.collectCompany}
						collectMessage={project.fieldConfig.collectMessage}
					/>
				)}
			</Card>
		</div>
	);
}
