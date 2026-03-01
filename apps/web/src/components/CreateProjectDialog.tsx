// ABOUTME: Dialog for creating a project with name, mode, and optional branding fields.
// ABOUTME: On success, navigates to the new project and invalidates the project list.

import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type CreateProjectValues, createProjectSchema } from '@/lib/schemas';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface CreateProjectDialogProps {
	open: boolean;
	onClose: () => void;
}

export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
	const navigate = useNavigate();

	const form = useForm<CreateProjectValues>({
		resolver: zodResolver(createProjectSchema),
		defaultValues: { name: '', mode: 'waitlist', companyName: '', brandColor: '#0d9488' },
	});

	const utils = trpc.useUtils();

	const createProject = trpc.project.create.useMutation({
		onSuccess: async (data) => {
			toast.success('Project created');
			await utils.project.list.invalidate();
			navigate({ to: '/projects/$projectId', params: { projectId: data.id } });
			handleClose();
		},
		onError: (err) => {
			toast.error(err.message ?? 'Failed to create project');
		},
	});

	const handleClose = () => {
		form.reset();
		onClose();
	};

	const onSubmit = (values: CreateProjectValues) => {
		createProject.mutate({
			name: values.name.trim(),
			mode: values.mode,
			companyName: values.companyName?.trim() || undefined,
			brandColor: values.brandColor || undefined,
		});
	};

	const mode = form.watch('mode');

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Create Project</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-1">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Project Name</FormLabel>
									<FormControl>
										<Input type="text" placeholder="My Landing Page" maxLength={100} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div>
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

						<FormField
							control={form.control}
							name="companyName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Company Name{' '}
										<span className="font-normal text-muted-foreground">(optional)</span>
									</FormLabel>
									<FormControl>
										<Input type="text" placeholder="Acme Inc" maxLength={100} {...field} />
									</FormControl>
									<FormDescription>Used in email templates.</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="brandColor"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Brand Color{' '}
										<span className="font-normal text-muted-foreground">(optional)</span>
									</FormLabel>
									<FormControl>
										<ColorPicker value={field.value ?? '#0d9488'} onChange={field.onChange} />
									</FormControl>
									<FormDescription>Used for email buttons and project accents.</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end gap-2">
							<Button type="button" variant="outline" onClick={handleClose}>
								Cancel
							</Button>
							<Button type="submit" disabled={createProject.isPending}>
								{createProject.isPending ? 'Creating...' : 'Create Project'}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
