// ABOUTME: Standalone project creation page for users adding additional projects.
// ABOUTME: Name input, mode selector, and create button with navigation on success.

import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { type CreateProjectValues, createProjectSchema } from '@/lib/schemas';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects/new')({
	component: NewProjectPage,
});

function NewProjectPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

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
			toast.error(err.message ?? 'Failed to create project.');
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

	const onSubmit = (values: CreateProjectValues) => {
		createProject.mutate({ name: values.name.trim(), mode: values.mode });
	};

	const mode = form.watch('mode');

	return (
		<div className="mx-auto max-w-lg">
			<div className="mb-2">
				<Link
					to="/"
					className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to dashboard
				</Link>
			</div>

			<h1 className="mb-2 text-2xl font-semibold text-foreground">Create a new project</h1>
			<p className="mb-8 text-sm text-muted">
				Each project has its own field configuration and API keys.
			</p>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem className="mb-6">
								<FormLabel>Project name</FormLabel>
								<FormControl>
									<Input type="text" placeholder="My Landing Page" maxLength={100} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="mb-6">
						<Label className="mb-2 block">Mode</Label>
						<div className="flex gap-3">
							{(['waitlist', 'demo-booking'] as const).map((m) => {
								const isSelected = mode === m;
								return (
									<button
										key={m}
										type="button"
										onClick={() => form.setValue('mode', m)}
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

					<Button type="submit" className="w-full" disabled={createProject.isPending}>
						{createProject.isPending ? 'Creating...' : 'Create Project'}
					</Button>
				</form>
			</Form>
		</div>
	);
}
