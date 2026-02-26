// ABOUTME: Standalone project creation page for users adding additional projects.
// ABOUTME: Name input, mode selector, and create button with navigation on success.

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'waitlist' | 'demo-booking';

export const Route = createFileRoute('/projects/new')({
	component: NewProjectPage,
});

function NewProjectPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();
	const [name, setName] = useState('');
	const [mode, setMode] = useState<Mode>('waitlist');
	const [error, setError] = useState<string | null>(null);

	const createProject = trpc.project.create.useMutation({
		onSuccess: (data) => {
			navigate({ to: '/projects/$projectId', params: { projectId: data.id } });
		},
		onError: (err) => {
			setError(err.message ?? 'Failed to create project.');
		},
	});

	if (sessionLoading) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading...</p>
			</div>
		);
	}

	if (!session?.user) {
		void navigate({ to: '/login' });
		return null;
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		setError(null);
		createProject.mutate({ name: name.trim(), mode });
	};

	return (
		<div className="mx-auto max-w-lg">
			<div className="mb-2">
				<Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to dashboard
				</Link>
			</div>

			<h1 className="mb-2 text-2xl font-semibold text-foreground">Create a new project</h1>
			<p className="mb-8 text-sm text-muted">
				Each project has its own field configuration and API keys.
			</p>

			{error && (
				<div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit}>
				<div className="mb-6 space-y-1.5">
					<Label htmlFor="project-name">Project name</Label>
					<Input
						id="project-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="My Landing Page"
						maxLength={100}
						required
					/>
				</div>

				<div className="mb-6">
					<Label className="mb-2 block">Mode</Label>
					<div className="flex gap-3">
						{(['waitlist', 'demo-booking'] as const).map((m) => {
							const isSelected = mode === m;
							return (
								<button
									key={m}
									type="button"
									onClick={() => setMode(m)}
									className={cn(
										'flex-1 rounded-lg border p-3 text-center transition-colors',
										isSelected
											? 'border-2 border-foreground bg-accent'
											: 'border-border bg-card hover:bg-accent/50',
									)}
								>
									<div className="text-sm font-semibold">
										{m === 'demo-booking' ? 'Demo Booking' : 'Waitlist'}
									</div>
									<div className="mt-1 text-xs text-muted">
										{m === 'waitlist' ? 'Email only' : 'Full form'}
									</div>
								</button>
							);
						})}
					</div>
					<p className="mt-2 text-xs text-muted-foreground">
						Mode cannot be changed after creation.
					</p>
				</div>

				<Button
					type="submit"
					className="w-full"
					disabled={createProject.isPending || !name.trim()}
				>
					{createProject.isPending ? 'Creating...' : 'Create Project'}
				</Button>
			</form>
		</div>
	);
}
