// ABOUTME: Table of API keys showing prefix + start, label, status badge, and revoke action.
// ABOUTME: Only shows first 8 chars via start field; never displays full key or hash.

import { useCallback, useState } from 'react';
import { trpc } from '../lib/trpc';

interface ApiKeyListProps {
	projectId: string;
}

export function ApiKeyList({ projectId }: ApiKeyListProps) {
	const { data: keys, isPending, error } = trpc.apiKey.list.useQuery({ projectId });
	const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

	const utils = trpc.useUtils();

	const revokeKey = trpc.apiKey.revoke.useMutation({
		onSuccess: () => {
			setRevokeConfirmId(null);
			utils.apiKey.list.invalidate({ projectId });
		},
	});

	const handleRevoke = useCallback(
		(keyId: string) => {
			revokeKey.mutate({ keyId });
		},
		[revokeKey],
	);

	if (isPending) {
		return (
			<div style={{ textAlign: 'center', padding: '2rem' }}>
				<p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading keys...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div
				style={{
					padding: '0.75rem 1rem',
					backgroundColor: '#fef2f2',
					border: '1px solid #fecaca',
					borderRadius: '0.375rem',
					color: '#dc2626',
					fontSize: '0.875rem',
				}}
			>
				Failed to load API keys. Please try again.
			</div>
		);
	}

	if (!keys || keys.length === 0) {
		return (
			<div
				style={{
					padding: '3rem 2rem',
					border: '1px solid #e5e7eb',
					borderRadius: '0.5rem',
					backgroundColor: '#f9fafb',
					textAlign: 'center',
				}}
			>
				<p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
					No API keys yet. Create one to start accepting submissions.
				</p>
			</div>
		);
	}

	return (
		<div
			style={{
				border: '1px solid #e5e7eb',
				borderRadius: '0.5rem',
				overflow: 'hidden',
			}}
		>
			<table style={{ width: '100%', borderCollapse: 'collapse' }}>
				<thead>
					<tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
						<th
							style={{
								textAlign: 'left',
								padding: '0.625rem 1rem',
								fontSize: '0.75rem',
								fontWeight: 600,
								color: '#6b7280',
								textTransform: 'uppercase',
								letterSpacing: '0.025em',
							}}
						>
							Label
						</th>
						<th
							style={{
								textAlign: 'left',
								padding: '0.625rem 1rem',
								fontSize: '0.75rem',
								fontWeight: 600,
								color: '#6b7280',
								textTransform: 'uppercase',
								letterSpacing: '0.025em',
							}}
						>
							Key
						</th>
						<th
							style={{
								textAlign: 'left',
								padding: '0.625rem 1rem',
								fontSize: '0.75rem',
								fontWeight: 600,
								color: '#6b7280',
								textTransform: 'uppercase',
								letterSpacing: '0.025em',
							}}
						>
							Status
						</th>
						<th
							style={{
								textAlign: 'left',
								padding: '0.625rem 1rem',
								fontSize: '0.75rem',
								fontWeight: 600,
								color: '#6b7280',
								textTransform: 'uppercase',
								letterSpacing: '0.025em',
							}}
						>
							Created
						</th>
						<th
							style={{
								textAlign: 'right',
								padding: '0.625rem 1rem',
								fontSize: '0.75rem',
								fontWeight: 600,
								color: '#6b7280',
								textTransform: 'uppercase',
								letterSpacing: '0.025em',
							}}
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{keys.map((key) => (
						<tr
							key={key.id}
							style={{
								borderBottom: '1px solid #e5e7eb',
								backgroundColor: key.enabled ? '#fff' : '#f9fafb',
							}}
						>
							{/* Label */}
							<td
								style={{
									padding: '0.75rem 1rem',
									fontSize: '0.875rem',
									fontWeight: 500,
									color: key.enabled ? '#111827' : '#9ca3af',
								}}
							>
								{key.name || 'API Key'}
							</td>

							{/* Key preview */}
							<td style={{ padding: '0.75rem 1rem' }}>
								<code
									style={{
										fontFamily:
											'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
										fontSize: '0.8125rem',
										color: key.enabled ? '#374151' : '#9ca3af',
										backgroundColor: key.enabled ? '#f3f4f6' : 'transparent',
										padding: '0.125rem 0.5rem',
										borderRadius: '0.25rem',
									}}
								>
									{key.prefix}
									{key.start}...
								</code>
							</td>

							{/* Status badge */}
							<td style={{ padding: '0.75rem 1rem' }}>
								{key.enabled ? (
									<span
										style={{
											display: 'inline-block',
											padding: '0.125rem 0.5rem',
											fontSize: '0.75rem',
											fontWeight: 500,
											borderRadius: '9999px',
											backgroundColor: '#dcfce7',
											color: '#166534',
										}}
									>
										Active
									</span>
								) : (
									<span
										style={{
											display: 'inline-block',
											padding: '0.125rem 0.5rem',
											fontSize: '0.75rem',
											fontWeight: 500,
											borderRadius: '9999px',
											backgroundColor: '#fee2e2',
											color: '#991b1b',
										}}
									>
										Revoked
									</span>
								)}
							</td>

							{/* Created date */}
							<td
								style={{
									padding: '0.75rem 1rem',
									fontSize: '0.8125rem',
									color: '#6b7280',
								}}
							>
								{new Date(key.createdAt).toLocaleDateString()}
							</td>

							{/* Actions */}
							<td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
								{key.enabled && revokeConfirmId !== key.id && (
									<button
										type="button"
										onClick={() => setRevokeConfirmId(key.id)}
										style={{
											padding: '0.25rem 0.625rem',
											border: '1px solid #fecaca',
											borderRadius: '0.25rem',
											backgroundColor: '#fff',
											color: '#dc2626',
											fontSize: '0.75rem',
											fontWeight: 500,
											cursor: 'pointer',
										}}
									>
										Revoke
									</button>
								)}
								{key.enabled && revokeConfirmId === key.id && (
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'flex-end' }}>
										<span style={{ fontSize: '0.75rem', color: '#dc2626' }}>
											Are you sure?
										</span>
										<button
											type="button"
											onClick={() => handleRevoke(key.id)}
											disabled={revokeKey.isPending}
											style={{
												padding: '0.25rem 0.5rem',
												border: 'none',
												borderRadius: '0.25rem',
												backgroundColor: '#dc2626',
												color: '#fff',
												fontSize: '0.75rem',
												fontWeight: 500,
												cursor: revokeKey.isPending ? 'not-allowed' : 'pointer',
											}}
										>
											{revokeKey.isPending ? '...' : 'Yes'}
										</button>
										<button
											type="button"
											onClick={() => setRevokeConfirmId(null)}
											style={{
												padding: '0.25rem 0.5rem',
												border: '1px solid #d1d5db',
												borderRadius: '0.25rem',
												backgroundColor: '#fff',
												color: '#374151',
												fontSize: '0.75rem',
												cursor: 'pointer',
											}}
										>
											No
										</button>
									</div>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
