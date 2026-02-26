// ABOUTME: Guided multi-step project creation flow for first-time users.
// ABOUTME: Step 1: name, Step 2: mode selection, Step 3: review and create.

import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { type CreateProjectValues, createProjectSchema } from '@/lib/schemas';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

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

	const form = useForm<CreateProjectValues>({
		resolver: zodResolver(createProjectSchema),
		defaultValues: { name: '', mode: 'waitlist' },
	});

	const createProject = trpc.project.create.useMutation({
		onSuccess: (data) => {
			toast.success('Project created');
			navigate({ to: '/projects/$projectId', params: { projectId: data.id } });
		},
		onError: (err) => {
			toast.error(err.message ?? 'Failed to create project. Please try again.');
		},
	});

	const handleContinueToStep2 = async () => {
		const valid = await form.trigger('name');
		if (valid) setStep(2);
	};

	const handleContinueToStep3 = () => {
		setStep(3);
	};

	const handleCreate = () => {
		const values = form.getValues();
		createProject.mutate(values);
	};

	const name = form.watch('name');
	const mode = form.watch('mode');

	return (
		<div className="mx-auto max-w-lg">
			<div className="mb-8 text-center">
				<h1 className="mb-2 text-2xl font-semibold text-foreground">Create your first project</h1>
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

			<Form {...form}>
				{/* Step 1: Project Name */}
				{step === 1 && (
					<div>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Project name</FormLabel>
									<FormControl>
										<Input type="text" placeholder="My Landing Page" maxLength={100} {...field} />
									</FormControl>
									<FormMessage />
									<p className="text-xs text-muted-foreground">
										Give your project a name you&apos;ll recognize in the dashboard.
									</p>
								</FormItem>
							)}
						/>
						<Button
							type="button"
							onClick={handleContinueToStep2}
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
										onClick={() => form.setValue('mode', m)}
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
							<Button className="flex-1" onClick={handleContinueToStep3}>
								Continue
							</Button>
						</div>
					</div>
				)}

				{/* Step 3: Review and Create */}
				{step === 3 && (
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
							<Button className="flex-1" disabled={createProject.isPending} onClick={handleCreate}>
								{createProject.isPending ? 'Creating...' : 'Create Project'}
							</Button>
						</div>
					</div>
				)}
			</Form>
		</div>
	);
}
