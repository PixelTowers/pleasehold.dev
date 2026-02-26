// ABOUTME: Notification settings page for configuring per-project notification channels.
// ABOUTME: Allows adding, editing, removing, and toggling notification channels and double opt-in.

import { createFileRoute, Link } from '@tanstack/react-router';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { NotificationChannelForm } from '@/components/NotificationChannelForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProject } from '@/hooks/useProjects';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

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
			const r = config.recipients as string[] | undefined;
			return r ? `${r.length} recipient${r.length === 1 ? '' : 's'}` : 'No recipients';
		}
		case 'slack':
		case 'discord': {
			const u = config.webhookUrl as string | undefined;
			return u ? `${u.substring(0, 40)}...` : 'No URL';
		}
		case 'telegram':
			return `Chat: ${(config.chatId as string) ?? 'unknown'}`;
		case 'webhook': {
			const u = config.url as string | undefined;
			return u ? `${u.substring(0, 40)}...` : 'No URL';
		}
		default:
			return '';
	}
}

function ToggleSwitch({
	checked,
	onChange,
	disabled,
}: {
	checked: boolean;
	onChange: (val: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={() => !disabled && onChange(!checked)}
			className={cn(
				'relative h-6 w-11 shrink-0 rounded-full border-0 transition-colors',
				checked ? 'bg-foreground' : 'bg-gray-300',
				disabled && 'opacity-50 cursor-not-allowed',
			)}
		>
			<div
				className={cn(
					'absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-[left]',
					checked ? 'left-[23px]' : 'left-[3px]',
				)}
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
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Webhook HMAC Secret</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 p-1">
					<p className="text-sm text-muted">
						This secret will only be shown once. Copy it now and store it securely. Use it to verify
						incoming webhook payloads by computing an HMAC-SHA256 signature.
					</p>
					<div className="flex items-center gap-2 rounded-md border bg-accent p-3">
						<code className="flex-1 break-all font-mono text-xs">{secret}</code>
						<Button
							variant="outline"
							size="sm"
							className="h-7 shrink-0 text-xs"
							onClick={handleCopy}
						>
							{copied ? (
								<>
									<Check className="mr-1 h-3 w-3" />
									Copied
								</>
							) : (
								<>
									<Copy className="mr-1 h-3 w-3" />
									Copy
								</>
							)}
						</Button>
					</div>
					<div className="flex justify-end">
						<Button onClick={onClose}>Done</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
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

	const utils = trpc.useUtils();

	const createChannel = trpc.notification.create.useMutation({
		onSuccess: (data) => {
			toast.success('Channel created');
			utils.notification.list.invalidate({ projectId });
			setAddingType(null);
			if (data.type === 'webhook' && data.config) {
				const config = data.config as Record<string, unknown>;
				if (typeof config.secret === 'string') setRevealedSecret(config.secret);
			}
		},
		onError: (err) => {
			toast.error(err.message ?? 'Failed to create channel');
		},
	});

	const updateChannel = trpc.notification.update.useMutation({
		onSuccess: () => {
			toast.success('Channel updated');
			utils.notification.list.invalidate({ projectId });
			setEditingChannelId(null);
		},
		onError: (err) => {
			toast.error(err.message ?? 'Failed to update channel');
		},
	});

	const deleteChannel = trpc.notification.delete.useMutation({
		onSuccess: () => {
			toast.success('Channel deleted');
			utils.notification.list.invalidate({ projectId });
			setDeleteConfirmId(null);
		},
		onError: (err) => {
			toast.error(err.message ?? 'Failed to delete channel');
		},
	});

	const regenerateSecret = trpc.notification.regenerateSecret.useMutation({
		onSuccess: (data) => {
			setRevealedSecret(data.secret);
		},
		onError: () => {
			toast.error('Failed to regenerate secret');
		},
	});

	const toggleDoubleOptIn = trpc.notification.toggleDoubleOptIn.useMutation({
		onSuccess: () => {
			toast.success('Email verification setting saved');
			utils.notification.getDoubleOptIn.invalidate({ projectId });
		},
		onError: () => {
			toast.error('Failed to save email verification setting');
		},
	});

	const handleToggleEnabled = (channelId: string, enabled: boolean) => {
		updateChannel.mutate({ projectId, channelId, enabled });
	};
	const handleDoubleOptInToggle = (enabled: boolean) => {
		toggleDoubleOptIn.mutate({ projectId, enabled });
	};

	if (projectPending) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading...</p>
			</div>
		);
	}

	if (projectError || !project) {
		return (
			<div className="mx-auto max-w-3xl">
				<div className="mb-4">
					<Link to="/" className="text-sm text-muted hover:text-foreground">
						&larr; Back to dashboard
					</Link>
				</div>
				<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
					Failed to load project. Please try again.
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-3xl">
			{/* Breadcrumb */}
			<div className="mb-6 flex items-center gap-1.5 text-sm text-muted">
				<Link to="/" className="hover:text-foreground">
					Dashboard
				</Link>
				<span>/</span>
				<Link to="/projects/$projectId" params={{ projectId }} className="hover:text-foreground">
					{project.name}
				</Link>
				<span>/</span>
				<span className="font-medium text-foreground">Notifications</span>
			</div>

			<h1 className="mb-8 text-2xl font-semibold text-foreground">Notification Settings</h1>

			{/* Double Opt-In Toggle */}
			<Card className="mb-6 p-5">
				<h3 className="mb-1 text-base font-semibold">Email Verification</h3>
				<div className="flex items-center justify-between py-3">
					<div>
						<div className="text-sm font-medium">Require email verification</div>
						<div className="text-xs text-muted-foreground">
							New submissions will require email confirmation before becoming active entries
						</div>
					</div>
					<ToggleSwitch
						checked={doubleOptInData?.doubleOptIn ?? false}
						onChange={handleDoubleOptInToggle}
						disabled={toggleDoubleOptIn.isPending}
					/>
				</div>
			</Card>

			{/* Notification Channels */}
			<Card className="mb-6 p-5">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-base font-semibold">Notification Channels</h3>
					{!addingType && (
						<select
							value=""
							onChange={(e) => {
								if (e.target.value) setAddingType(e.target.value as ChannelType);
							}}
							className="rounded-md border border-input bg-card px-3 py-1.5 text-sm"
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
					)}
				</div>

				{/* Add channel form */}
				{addingType && (
					<div className="mb-4 rounded-md border bg-accent p-4">
						<h4 className="mb-4 text-sm font-semibold">
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

				{channelsPending && <p className="text-sm text-muted">Loading channels...</p>}

				{channels && channels.length === 0 && !addingType && (
					<p className="py-8 text-center text-sm text-muted-foreground">
						No notification channels configured. Add a channel to get notified about new
						submissions.
					</p>
				)}

				{channels && channels.length > 0 && (
					<div className="flex flex-col gap-2">
						{channels.map((channel) => (
							<div key={channel.id} className="flex flex-col rounded-md border bg-card">
								<div className="flex items-center justify-between px-4 py-3">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span
												className={cn(
													'text-sm font-medium',
													!channel.enabled && 'text-muted-foreground',
												)}
											>
												{channelTypeLabels[channel.type as ChannelType] ?? channel.type}
											</span>
											{!channel.enabled && (
												<Badge variant="secondary" className="text-[0.6875rem]">
													Disabled
												</Badge>
											)}
										</div>
										<div className="mt-0.5 truncate text-xs text-muted-foreground">
											{channelConfigSummary(channel.type, channel.config)}
										</div>
									</div>
									<div className="flex items-center gap-2">
										{channel.type === 'webhook' && (
											<Button
												variant="outline"
												size="sm"
												className="h-7 text-xs"
												disabled={regenerateSecret.isPending}
												onClick={() =>
													regenerateSecret.mutate({ projectId, channelId: channel.id })
												}
											>
												Regenerate Secret
											</Button>
										)}
										<Button
											variant="outline"
											size="sm"
											className="h-7 text-xs"
											onClick={() =>
												setEditingChannelId(editingChannelId === channel.id ? null : channel.id)
											}
										>
											{editingChannelId === channel.id ? 'Cancel' : 'Edit'}
										</Button>
										<ToggleSwitch
											checked={channel.enabled}
											onChange={(val) => handleToggleEnabled(channel.id, val)}
											disabled={updateChannel.isPending}
										/>
										<Button
											variant="outline"
											size="sm"
											className="h-7 border-red-200 text-xs text-destructive hover:bg-red-50"
											onClick={() => setDeleteConfirmId(channel.id)}
										>
											Delete
										</Button>
									</div>
								</div>

								{editingChannelId === channel.id && (
									<div className="border-t bg-accent p-4">
										<NotificationChannelForm
											type={channel.type as ChannelType}
											initialConfig={channel.config}
											onSubmit={(config) => {
												updateChannel.mutate({ projectId, channelId: channel.id, config });
											}}
											onCancel={() => setEditingChannelId(null)}
											isLoading={updateChannel.isPending}
										/>
									</div>
								)}

								{deleteConfirmId === channel.id && (
									<div className="flex items-center justify-between border-t border-red-200 bg-red-50 p-4">
										<span className="text-sm text-destructive">
											Delete this {channelTypeLabels[channel.type as ChannelType] ?? channel.type}{' '}
											channel?
										</span>
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												className="h-7"
												onClick={() => setDeleteConfirmId(null)}
											>
												Cancel
											</Button>
											<Button
												variant="destructive"
												size="sm"
												className="h-7"
												disabled={deleteChannel.isPending}
												onClick={() => deleteChannel.mutate({ projectId, channelId: channel.id })}
											>
												{deleteChannel.isPending ? 'Deleting...' : 'Confirm Delete'}
											</Button>
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</Card>

			{revealedSecret && (
				<SecretRevealDialog secret={revealedSecret} onClose={() => setRevealedSecret(null)} />
			)}
		</div>
	);
}
