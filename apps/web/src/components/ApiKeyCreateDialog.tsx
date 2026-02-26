// ABOUTME: Dialog for creating a new API key with optional label input.
// ABOUTME: Shows ApiKeyRevealOnce on success; invalidates key list query on dismiss.

import { type FormEvent, useState } from 'react';
import { trpc } from '../lib/trpc';
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

	if (!open) return null;

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
		<div
			style={{
				position: 'fixed',
				inset: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				zIndex: 1000,
			}}
		>
			<div
				style={{
					backgroundColor: '#fff',
					borderRadius: '0.75rem',
					boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
					maxWidth: '36rem',
					width: '100%',
					margin: '0 1rem',
					overflow: 'hidden',
				}}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						padding: '1rem 1.5rem',
						borderBottom: '1px solid #e5e7eb',
					}}
				>
					<h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
						{createdKey ? 'API Key Created' : 'Create API Key'}
					</h2>
					<button
						type="button"
						onClick={handleCancel}
						style={{
							background: 'none',
							border: 'none',
							fontSize: '1.25rem',
							color: '#6b7280',
							cursor: 'pointer',
							padding: '0.25rem',
							lineHeight: 1,
						}}
						aria-label="Close dialog"
					>
						x
					</button>
				</div>

				{/* Body */}
				{createdKey ? (
					<ApiKeyRevealOnce apiKey={createdKey} onDismiss={handleDismissKey} />
				) : (
					<form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
						<div style={{ marginBottom: '1.25rem' }}>
							<label
								htmlFor="key-label"
								style={{
									display: 'block',
									fontSize: '0.875rem',
									fontWeight: 500,
									marginBottom: '0.375rem',
									color: '#374151',
								}}
							>
								Label{' '}
								<span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
							</label>
							<input
								id="key-label"
								type="text"
								value={label}
								onChange={(e) => setLabel(e.target.value)}
								placeholder="e.g., production, staging, local-dev"
								maxLength={50}
								style={{
									width: '100%',
									padding: '0.5rem 0.75rem',
									border: '1px solid #d1d5db',
									borderRadius: '0.375rem',
									fontSize: '0.875rem',
									boxSizing: 'border-box',
									outline: 'none',
								}}
							/>
							<p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
								A descriptive label helps you identify this key later.
							</p>
						</div>

						{error && (
							<div
								style={{
									padding: '0.625rem 0.75rem',
									backgroundColor: '#fef2f2',
									border: '1px solid #fecaca',
									borderRadius: '0.375rem',
									color: '#dc2626',
									fontSize: '0.8125rem',
									marginBottom: '1rem',
								}}
							>
								{error}
							</div>
						)}

						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
							<button
								type="button"
								onClick={handleCancel}
								style={{
									padding: '0.5rem 1rem',
									border: '1px solid #d1d5db',
									borderRadius: '0.375rem',
									backgroundColor: '#fff',
									fontSize: '0.875rem',
									color: '#374151',
									cursor: 'pointer',
								}}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={createKey.isPending}
								style={{
									padding: '0.5rem 1rem',
									backgroundColor: createKey.isPending ? '#9ca3af' : '#111',
									color: '#fff',
									border: 'none',
									borderRadius: '0.375rem',
									fontSize: '0.875rem',
									fontWeight: 500,
									cursor: createKey.isPending ? 'not-allowed' : 'pointer',
								}}
							>
								{createKey.isPending ? 'Creating...' : 'Create Key'}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
