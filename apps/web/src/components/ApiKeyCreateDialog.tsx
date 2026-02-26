// ABOUTME: Dialog for creating a new API key with optional label input.
// ABOUTME: Shows ApiKeyRevealOnce on success; invalidates key list query on dismiss.

import { type FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { ApiKeyRevealOnce } from './ApiKeyRevealOnce';

interface ApiKeyCreateDialogProps {
	projectId: string;
	open: boolean;
	onClose: () => void;
}

export function ApiKeyCreateDialog({ projectId, open, onClose }: ApiKeyCreateDialogProps) {
	const [label, setLabel] = useState('');
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const utils = trpc.useUtils();

	const createKey = trpc.apiKey.create.useMutation({
		onSuccess: (data) => {
			setCreatedKey(data.key);
			setError(null);
		},
		onError: (err) => {
			setError(err.message || 'Failed to create API key');
		},
	});

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		createKey.mutate({
			projectId,
			label: label.trim() || undefined,
		});
	};

	const handleDismissKey = () => {
		// Clear key from component state and close dialog
		setCreatedKey(null);
		setLabel('');
		setError(null);
		utils.apiKey.list.invalidate({ projectId });
		onClose();
	};

	const handleCancel = () => {
		setLabel('');
		setError(null);
		setCreatedKey(null);
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{createdKey ? 'API Key Created' : 'Create API Key'}
					</DialogTitle>
				</DialogHeader>

				{createdKey ? (
					<ApiKeyRevealOnce apiKey={createdKey} onDismiss={handleDismissKey} />
				) : (
					<form onSubmit={handleSubmit} className="space-y-5 px-1">
						<div className="space-y-1.5">
							<Label htmlFor="key-label">
								Label <span className="font-normal text-muted-foreground">(optional)</span>
							</Label>
							<Input
								id="key-label"
								type="text"
								value={label}
								onChange={(e) => setLabel(e.target.value)}
								placeholder="e.g., production, staging, local-dev"
								maxLength={50}
							/>
							<p className="text-xs text-muted-foreground">
								A descriptive label helps you identify this key later.
							</p>
						</div>

						{error && (
							<div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[0.8125rem] text-destructive">
								{error}
							</div>
						)}

						<div className="flex justify-end gap-2">
							<Button type="button" variant="outline" onClick={handleCancel}>
								Cancel
							</Button>
							<Button type="submit" disabled={createKey.isPending}>
								{createKey.isPending ? 'Creating...' : 'Create Key'}
							</Button>
						</div>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
