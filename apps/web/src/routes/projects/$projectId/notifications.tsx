// ABOUTME: Notification settings page for configuring per-project notification channels.
// ABOUTME: Allows adding, editing, removing, and toggling notification channels and double opt-in.

import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { NotificationChannelForm } from '../../../components/NotificationChannelForm';
import { useProject } from '../../../hooks/useProjects';
import { trpc } from '../../../lib/trpc';

export const Route = createFileRoute('/projects/$projectId/notifications')({
	component: NotificationSettingsPage,
});

type ChannelType = 'email' | 'slack' | 'discord' | 'telegram' | 'webhook';

const channelTypeLabels: Record<ChannelType, string> = {
	email: 'Email',
	slack: 'Slack',
	discord: 'Discord',
	telegram: 'Telegram',
	webhook: 'Webhook',
};

function channelConfigSummary(type: string, config: Record<string, unknown>): string {
	switch (type) {
		case 'email': {
			const recipients = config.recipients as string[] | undefined;
			return recipients ? `${recipients.length} recipient${recipients.length === 1 ? '' : 's'}` : 'No recipients';
		}
		case 'slack':
		case 'discord': {
			const url = config.webhookUrl as string | undefined;
			return url ? `${url.substring(0, 40)}...` : 'No URL';
		}
		case 'telegram':
			return `Chat: ${(config.chatId as string) ?? 'unknown'}`;
		case 'webhook': {
			const url = config.url as string | undefined;
			return url ? `${url.substring(0, 40)}...` : 'No URL';
		}
		default:
			return '';
	}
}

function ToggleSwitch({ checked, onChange, disabled }: {
	checked: boolean;
	onChange: (val: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={() => !disabled && onChange(!checked)}
			style={{
				width: '2.75rem',
				height: '1.5rem',
				borderRadius: '9999px',
				border: 'none',
				backgroundColor: checked ? '#111' : '#d1d5db',
				cursor: disabled ? 'not-allowed' : 'pointer',
				position: 'relative',
				transition: 'background-color 0.2s',
				flexShrink: 0,
				opacity: disabled ? 0.5 : 1,
			}}
		>
			<div
				style={{
					width: '1.125rem',
					height: '1.125rem',
					borderRadius: '9999px',
					backgroundColor: '#fff',
					position: 'absolute',
					top: '0.1875rem',
					left: checked ? '1.4375rem' : '0.1875rem',
					transition: 'left 0.2s',
					boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
				}}
			/>
		</button>
	);
}

function SecretRevealDialog({ secret, onClose }: { secret: string; onClose: () => void }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(secret);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 50,
			}}
		>
			<div
				style={{
					backgroundColor: '#fff',
					borderRadius: '0.5rem',
					padding: '1.5rem',
					maxWidth: '32rem',
					width: '100%',
					margin: '1rem',
				}}
			>
				<h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>
					Webhook HMAC Secret
				</h3>
				<p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
					This secret will only be shown once. Copy it now and store it securely. Use it to verify
					incoming webhook payloads by computing an HMAC-SHA256 signature.
				</p>
				<div
					style={{
						display: 'flex',
						gap: '0.5rem',
						alignItems: 'center',
						backgroundColor: '#f9fafb',
						border: '1px solid #e5e7eb',
						borderRadius: '0.375rem',
						padding: '0.75rem',
						marginBottom: '1rem',
					}}
				>
					<code
						style={{
							flex: 1,
							fontSize: '0.75rem',
							fontFamily: 'monospace',
							wordBreak: 'break-all',
						}}
					>
						{secret}
					</code>
					<button
						type="button"
						onClick={handleCopy}
						style={{
							padding: '0.375rem 0.75rem',
							border: '1px solid #d1d5db',
							borderRadius: '0.375rem',
							backgroundColor: '#fff',
							fontSize: '0.75rem',
							cursor: 'pointer',
							flexShrink: 0,
						}}
					>
						{copied ? 'Copied' : 'Copy'}
					</button>
				</div>
				<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
					<button
						type="button"
						onClick={onClose}
						style={{
							padding: '0.5rem 1rem',
							backgroundColor: '#111',
							color: '#fff',
							border: 'none',
							borderRadius: '0.375rem',
							fontSize: '0.875rem',
							fontWeight: 500,
							cursor: 'pointer',
						}}
					>
						Done
					</button>
				</div>
			</div>
		</div>
	);
}

function NotificationSettingsPage() {
	const { projectId } = Route.useParams();
	const { data: project, isPending: projectPending, error: projectError } = useProject(projectId);
	const { data: channels, isPending: channelsPending } = trpc.notification.list.useQuery(
		{ projectId },
		{ enabled: !!project },
	);
	const { data: doubleOptInData } = trpc.notification.getDoubleOptIn.useQuery(
		{ projectId },
		{ enabled: !!project },
	);

	const [addingType, setAddingType] = useState<ChannelType | null>(null);
	const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
	const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
	const [optInStatus, setOptInStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

	const utils = trpc.useUtils();

	const createChannel = trpc.notification.create.useMutation({
		onSuccess: (data) => {
			utils.notification.list.invalidate({ projectId });
			setAddingType(null);
			if (data.type === 'webhook' && data.config) {
				const config = data.config as Record<string, unknown>;
				if (typeof config.secret === 'string') {
					setRevealedSecret(config.secret);
				}
			}
		},
	});

	const updateChannel = trpc.notification.update.useMutation({
		onSuccess: () => {
			utils.notification.list.invalidate({ projectId });
			setEditingChannelId(null);
		},
	});

	const deleteChannel = trpc.notification.delete.useMutation({
		onSuccess: () => {
			utils.notification.list.invalidate({ projectId });
			setDeleteConfirmId(null);
		},
	});

	const regenerateSecret = trpc.notification.regenerateSecret.useMutation({
		onSuccess: (data) => {
			setRevealedSecret(data.secret);
		},
	});

	const toggleDoubleOptIn = trpc.notification.toggleDoubleOptIn.useMutation({
		onSuccess: () => {
			setOptInStatus('saved');
			utils.notification.getDoubleOptIn.invalidate({ projectId });
			setTimeout(() => setOptInStatus('idle'), 2000);
		},
		onError: () => {
			setOptInStatus('error');
			setTimeout(() => setOptInStatus('idle'), 3000);
		},
	});

	const handleToggleEnabled = (channelId: string, enabled: boolean) => {
		updateChannel.mutate({ projectId, channelId, enabled });
	};

	const handleDoubleOptInToggle = (enabled: boolean) => {
		setOptInStatus('saving');
		toggleDoubleOptIn.mutate({ projectId, enabled });
	};

	if (projectPending) {
		return (
			<div style={{ textAlign: 'center', padding: '4rem' }}>
				<p style={{ color: '#6b7280' }}>Loading...</p>
			</div>
		);
	}

	if (projectError || !project) {
		return (
			<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
				<div style={{ marginBottom: '1rem' }}>
					<Link to="/" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>
						&larr; Back to dashboard
					</Link>
				</div>
				<div
					style={{
						padding: '1rem',
						backgroundColor: '#fef2f2',
						border: '1px solid #fecaca',
						borderRadius: '0.375rem',
						color: '#dc2626',
						fontSize: '0.875rem',
					}}
				>
					Failed to load project. Please try again.
				</div>
			</div>
		);
	}

	return (
		<div style={{ maxWidth: '48rem', margin: '0 auto' }}>
			{/* Breadcrumb */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.375rem',
					marginBottom: '1.5rem',
					fontSize: '0.875rem',
					color: '#6b7280',
				}}
			>
				<Link to="/" style={{ color: '#6b7280', textDecoration: 'none' }}>
					Dashboard
				</Link>
				<span>/</span>
				<Link
					to="/projects/$projectId"
					params={{ projectId }}
					style={{ color: '#6b7280', textDecoration: 'none' }}
				>
					{project.name}
				</Link>
				<span>/</span>
				<span style={{ color: '#111827', fontWeight: 500 }}>Notifications</span>
			</div>

			<h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>
				Notification Settings
			</h1>

			{/* Double Opt-In Toggle */}
			<div
				style={{
					padding: '1.25rem',
					border: '1px solid #e5e7eb',
					borderRadius: '0.5rem',
					backgroundColor: '#fff',
					marginBottom: '1.5rem',
				}}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '0.25rem',
					}}
				>
					<h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Email Verification</h3>
					{optInStatus === 'saving' && (
						<span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Saving...</span>
					)}
					{optInStatus === 'saved' && (
						<span style={{ fontSize: '0.75rem', color: '#059669' }}>Saved</span>
					)}
					{optInStatus === 'error' && (
						<span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Failed to save</span>
					)}
				</div>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						padding: '0.75rem 0',
					}}
				>
					<div>
						<div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
							Require email verification
						</div>
						<div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
							New submissions will require email confirmation before becoming active entries
						</div>
					</div>
					<ToggleSwitch
						checked={doubleOptInData?.doubleOptIn ?? false}
						onChange={handleDoubleOptInToggle}
						disabled={toggleDoubleOptIn.isPending}
					/>
				</div>
			</div>

			{/* Notification Channels */}
			<div
				style={{
					padding: '1.25rem',
					border: '1px solid #e5e7eb',
					borderRadius: '0.5rem',
					backgroundColor: '#fff',
					marginBottom: '1.5rem',
				}}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '1rem',
					}}
				>
					<h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
						Notification Channels
					</h3>
					{!addingType && (
						<div style={{ position: 'relative' }}>
							<select
								value=""
								onChange={(e) => {
									if (e.target.value) {
										setAddingType(e.target.value as ChannelType);
									}
								}}
								style={{
									padding: '0.5rem 1rem',
									backgroundColor: '#111',
									color: '#fff',
									border: 'none',
									borderRadius: '0.375rem',
									fontSize: '0.875rem',
									fontWeight: 500,
									cursor: 'pointer',
									appearance: 'none',
									WebkitAppearance: 'none',
								}}
							>
								<option value="" disabled>
									+ Add channel
								</option>
								<option value="email">Email</option>
								<option value="slack">Slack</option>
								<option value="discord">Discord</option>
								<option value="telegram">Telegram</option>
								<option value="webhook">Webhook</option>
							</select>
						</div>
					)}
				</div>

				{/* Add channel form */}
				{addingType && (
					<div
						style={{
							padding: '1rem',
							border: '1px solid #e5e7eb',
							borderRadius: '0.375rem',
							backgroundColor: '#f9fafb',
							marginBottom: '1rem',
						}}
					>
						<h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
							Add {channelTypeLabels[addingType]} Channel
						</h4>
						<NotificationChannelForm
							type={addingType}
							onSubmit={(config) => {
								createChannel.mutate({ projectId, type: addingType, config });
							}}
							onCancel={() => setAddingType(null)}
							isLoading={createChannel.isPending}
						/>
					</div>
				)}

				{/* Channel list */}
				{channelsPending && (
					<p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading channels...</p>
				)}

				{channels && channels.length === 0 && !addingType && (
					<p
						style={{
							color: '#9ca3af',
							fontSize: '0.875rem',
							textAlign: 'center',
							padding: '2rem 0',
						}}
					>
						No notification channels configured. Add a channel to get notified about new
						submissions.
					</p>
				)}

				{channels && channels.length > 0 && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
						{channels.map((channel) => (
							<div
								key={channel.id}
								style={{
									display: 'flex',
									flexDirection: 'column',
									border: '1px solid #e5e7eb',
									borderRadius: '0.375rem',
									backgroundColor: '#fff',
								}}
							>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										padding: '0.75rem 1rem',
									}}
								>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
											<span
												style={{
													fontSize: '0.875rem',
													fontWeight: 500,
													color: channel.enabled ? '#111827' : '#9ca3af',
												}}
											>
												{channelTypeLabels[channel.type as ChannelType] ?? channel.type}
											</span>
											{!channel.enabled && (
												<span
													style={{
														fontSize: '0.6875rem',
														color: '#9ca3af',
														backgroundColor: '#f3f4f6',
														padding: '0.125rem 0.5rem',
														borderRadius: '9999px',
													}}
												>
													Disabled
												</span>
											)}
										</div>
										<div
											style={{
												fontSize: '0.75rem',
												color: '#9ca3af',
												marginTop: '0.125rem',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{channelConfigSummary(channel.type, channel.config)}
										</div>
									</div>

									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
										{channel.type === 'webhook' && (
											<button
												type="button"
												onClick={() => regenerateSecret.mutate({ projectId, channelId: channel.id })}
												disabled={regenerateSecret.isPending}
												style={{
													padding: '0.375rem 0.5rem',
													border: '1px solid #d1d5db',
													borderRadius: '0.375rem',
													backgroundColor: '#fff',
													fontSize: '0.75rem',
													cursor: regenerateSecret.isPending ? 'not-allowed' : 'pointer',
													color: '#374151',
												}}
											>
												Regenerate Secret
											</button>
										)}
										<button
											type="button"
											onClick={() =>
												setEditingChannelId(
													editingChannelId === channel.id ? null : channel.id,
												)
											}
											style={{
												padding: '0.375rem 0.5rem',
												border: '1px solid #d1d5db',
												borderRadius: '0.375rem',
												backgroundColor: '#fff',
												fontSize: '0.75rem',
												cursor: 'pointer',
												color: '#374151',
											}}
										>
											{editingChannelId === channel.id ? 'Cancel' : 'Edit'}
										</button>
										<ToggleSwitch
											checked={channel.enabled}
											onChange={(val) => handleToggleEnabled(channel.id, val)}
											disabled={updateChannel.isPending}
										/>
										<button
											type="button"
											onClick={() => setDeleteConfirmId(channel.id)}
											style={{
												padding: '0.375rem 0.5rem',
												border: '1px solid #fecaca',
												borderRadius: '0.375rem',
												backgroundColor: '#fff',
												fontSize: '0.75rem',
												cursor: 'pointer',
												color: '#dc2626',
											}}
										>
											Delete
										</button>
									</div>
								</div>

								{/* Edit form */}
								{editingChannelId === channel.id && (
									<div
										style={{
											padding: '1rem',
											borderTop: '1px solid #e5e7eb',
											backgroundColor: '#f9fafb',
										}}
									>
										<NotificationChannelForm
											type={channel.type as ChannelType}
											initialConfig={channel.config}
											onSubmit={(config) => {
												updateChannel.mutate({
													projectId,
													channelId: channel.id,
													config,
												});
											}}
											onCancel={() => setEditingChannelId(null)}
											isLoading={updateChannel.isPending}
										/>
									</div>
								)}

								{/* Delete confirmation */}
								{deleteConfirmId === channel.id && (
									<div
										style={{
											padding: '1rem',
											borderTop: '1px solid #fecaca',
											backgroundColor: '#fef2f2',
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
										}}
									>
										<span style={{ fontSize: '0.875rem', color: '#dc2626' }}>
											Delete this {channelTypeLabels[channel.type as ChannelType] ?? channel.type} channel?
										</span>
										<div style={{ display: 'flex', gap: '0.5rem' }}>
											<button
												type="button"
												onClick={() => setDeleteConfirmId(null)}
												style={{
													padding: '0.375rem 0.75rem',
													border: '1px solid #d1d5db',
													borderRadius: '0.375rem',
													backgroundColor: '#fff',
													fontSize: '0.8125rem',
													cursor: 'pointer',
												}}
											>
												Cancel
											</button>
											<button
												type="button"
												onClick={() =>
													deleteChannel.mutate({ projectId, channelId: channel.id })
												}
												disabled={deleteChannel.isPending}
												style={{
													padding: '0.375rem 0.75rem',
													border: 'none',
													borderRadius: '0.375rem',
													backgroundColor: '#dc2626',
													color: '#fff',
													fontSize: '0.8125rem',
													fontWeight: 500,
													cursor: deleteChannel.isPending ? 'not-allowed' : 'pointer',
												}}
											>
												{deleteChannel.isPending ? 'Deleting...' : 'Confirm Delete'}
											</button>
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Secret reveal dialog */}
			{revealedSecret && (
				<SecretRevealDialog
					secret={revealedSecret}
					onClose={() => setRevealedSecret(null)}
				/>
			)}
		</div>
	);
}
