// ABOUTME: Dialog for creating a new API key with optional label input.
// ABOUTME: Shows ApiKeyRevealOnce on success; invalidates key list query on dismiss.

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { type ApiKeyLabelValues, apiKeyLabelSchema } from '@/lib/schemas';
import { capture } from '@/lib/tracking';
import { trpc } from '@/lib/trpc';
import { ApiKeyRevealOnce } from './ApiKeyRevealOnce';

interface ApiKeyCreateDialogProps {
	projectId: string;
	open: boolean;
	onClose: () => void;
}

export function ApiKeyCreateDialog({ projectId, open, onClose }: ApiKeyCreateDialogProps) {
	const [createdKey, setCreatedKey] = useState<string | null>(null);

	const form = useForm<ApiKeyLabelValues>({
		resolver: zodResolver(apiKeyLabelSchema),
		defaultValues: { label: '' },
	});

	const utils = trpc.useUtils();

	const createKey = trpc.apiKey.create.useMutation({
		onSuccess: (data) => {
			capture('api_key_created', { projectId });
			setCreatedKey(data.key);
			utils.apiKey.list.invalidate({ projectId });
		},
		onError: (err) => {
			toast.error(err.message || 'Failed to create API key');
		},
	});

	const onSubmit = (values: ApiKeyLabelValues) => {
		createKey.mutate({
			projectId,
			label: values.label?.trim() || undefined,
		});
	};

	const handleDismissKey = () => {
		// Clear key from component state and close dialog
		setCreatedKey(null);
		form.reset();
		utils.apiKey.list.invalidate({ projectId });
		onClose();
	};

	const handleCancel = () => {
		form.reset();
		setCreatedKey(null);
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{createdKey ? 'API Key Created' : 'Create API Key'}</DialogTitle>
				</DialogHeader>

				{createdKey ? (
					<ApiKeyRevealOnce apiKey={createdKey} onDismiss={handleDismissKey} />
				) : (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-1">
							<FormField
								control={form.control}
								name="label"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Label <span className="font-normal text-muted-foreground">(optional)</span>
										</FormLabel>
										<FormControl>
											<Input
												type="text"
												placeholder="e.g., production, staging, local-dev"
												maxLength={50}
												{...field}
											/>
										</FormControl>
										<FormDescription>
											A descriptive label helps you identify this key later.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex justify-end gap-2">
								<Button type="button" variant="outline" onClick={handleCancel}>
									Cancel
								</Button>
								<Button type="submit" disabled={createKey.isPending}>
									{createKey.isPending ? 'Creating...' : 'Create Key'}
								</Button>
							</div>
						</form>
					</Form>
				)}
			</DialogContent>
		</Dialog>
	);
}
