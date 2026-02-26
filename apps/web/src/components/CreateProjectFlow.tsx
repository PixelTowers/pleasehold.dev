// ABOUTME: Guided multi-step project creation flow for first-time users.
// ABOUTME: Step 1: name, Step 2: mode selection, Step 3: review and create.

import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'waitlist' | 'demo-booking';

const modeDescriptions: Record<Mode, { label: string; description: string; fields: string }> = {
	waitlist: {
		label: 'Waitlist',
		description: 'Collect email addresses for a simple waitlist or early access signup.',
		fields: 'Collects: Email only',
	},
	'demo-booking': {
		label: 'Demo Booking',
		description: 'Collect detailed contact information for demo requests or sales inquiries.',
		fields: 'Collects: Email, Name, Company, Message',
	},
};

export function CreateProjectFlow() {
	const navigate = useNavigate();
	const [step, setStep] = useState(1);
	const [name, setName] = useState('');
	const [mode, setMode] = useState<Mode | null>(null);
	const [error, setError] = useState<string | null>(null);

	const createProject = trpc.project.create.useMutation({
		onSuccess: (data) => {
			navigate({ to: '/projects/$projectId', params: { projectId: data.id } });
		},
		onError: (err) => {
			setError(err.message ?? 'Failed to create project. Please try again.');
		},
	});

	const handleCreate = () => {
		if (!name || !mode) return;
		setError(null);
		createProject.mutate({ name, mode });
	};

	return (
		<div className="mx-auto max-w-lg">
			<div className="mb-8 text-center">
				<h1 className="mb-2 text-2xl font-semibold text-foreground">
					Create your first project
				</h1>
				<p className="text-sm text-muted">
					Projects organize your signups. Let&apos;s get started.
				</p>
			</div>

			{/* Step indicator */}
			<div className="mb-8 flex justify-center gap-2">
				{[1, 2, 3].map((s) => (
					<div
						key={s}
						className={cn(
							'h-1 w-8 rounded-full transition-colors',
							s <= step ? 'bg-foreground' : 'bg-border',
						)}
					/>
				))}
			</div>

			{error && (
				<div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			)}

			{/* Step 1: Project Name */}
			{step === 1 && (
				<div>
					<div className="mb-1.5">
						<Label htmlFor="project-name">Project name</Label>
					</div>
					<Input
						id="project-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="My Landing Page"
						maxLength={100}
					/>
					<p className="mt-2 text-xs text-muted-foreground">
						Give your project a name you&apos;ll recognize in the dashboard.
					</p>
					<Button
						type="button"
						onClick={() => setStep(2)}
						disabled={!name.trim()}
						className="mt-6 w-full"
					>
						Continue
					</Button>
				</div>
			)}

			{/* Step 2: Mode Selection */}
			{step === 2 && (
				<div>
					<p className="mb-3 text-sm font-medium">Choose a mode</p>
					<div className="flex flex-col gap-3">
						{(['waitlist', 'demo-booking'] as const).map((m) => {
							const info = modeDescriptions[m];
							const isSelected = mode === m;
							return (
								<button
									key={m}
									type="button"
									onClick={() => setMode(m)}
									className={cn(
										'rounded-lg border p-4 text-left transition-colors',
										isSelected
											? 'border-2 border-foreground bg-accent'
											: 'border-border bg-card hover:bg-accent/50',
									)}
								>
									<div className="mb-1 text-sm font-semibold">{info.label}</div>
									<div className="mb-1.5 text-[0.8125rem] text-muted">{info.description}</div>
									<div className="text-xs text-muted-foreground">{info.fields}</div>
								</button>
							);
						})}
					</div>
					<p className="mt-3 text-xs text-muted-foreground">
						Mode cannot be changed after project creation.
					</p>
					<div className="mt-6 flex gap-3">
						<Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
							Back
						</Button>
						<Button className="flex-1" disabled={!mode} onClick={() => setStep(3)}>
							Continue
						</Button>
					</div>
				</div>
			)}

			{/* Step 3: Review and Create */}
			{step === 3 && mode && (
				<div>
					<p className="mb-4 text-sm font-medium">Review your project</p>
					<div className="mb-6 rounded-lg border bg-accent p-4">
						<div className="mb-3">
							<span className="block text-xs text-muted-foreground">Name</span>
							<span className="text-sm font-medium">{name}</span>
						</div>
						<div className="mb-3">
							<span className="block text-xs text-muted-foreground">Mode</span>
							<span className="text-sm font-medium">{modeDescriptions[mode].label}</span>
						</div>
						<div>
							<span className="block text-xs text-muted-foreground">Fields collected</span>
							<span className="text-sm">
								{mode === 'waitlist' ? 'Email only' : 'Email, Name, Company, Message'}
							</span>
						</div>
					</div>
					<div className="flex gap-3">
						<Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
							Back
						</Button>
						<Button
							className="flex-1"
							disabled={createProject.isPending}
							onClick={handleCreate}
						>
							{createProject.isPending ? 'Creating...' : 'Create Project'}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
