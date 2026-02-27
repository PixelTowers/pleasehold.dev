// ABOUTME: Table of API keys showing prefix + start, label, status badge, and revoke action.
// ABOUTME: Only shows first 8 chars via start field; never displays full key or hash.

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useIsMobile } from '@/hooks/useIsMobile';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface ApiKeyListProps {
	projectId: string;
}

export function ApiKeyList({ projectId }: ApiKeyListProps) {
	const { data: keys, isPending, error } = trpc.apiKey.list.useQuery({ projectId });
	const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
	const isMobile = useIsMobile();

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

	const revokeTarget = keys?.find((k) => k.id === revokeConfirmId);

	if (isPending) {
		return (
			<div className="py-8 text-center">
				<p className="text-sm text-muted">Loading keys...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
				Failed to load API keys. Please try again.
			</div>
		);
	}

	if (!keys || keys.length === 0) {
		return (
			<div className="py-12 text-center">
				<p className="text-sm text-muted-foreground">
					No API keys yet. Create one to start accepting submissions.
				</p>
			</div>
		);
	}

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Label</TableHead>
						<TableHead>Key</TableHead>
						<TableHead>Status</TableHead>
						{!isMobile && <TableHead>Created</TableHead>}
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{keys.map((key) => (
						<TableRow key={key.id} className={cn(!key.enabled && 'opacity-50')}>
							<TableCell className={cn('font-medium', !key.enabled && 'text-muted-foreground')}>
								{key.name || 'API Key'}
							</TableCell>
							<TableCell>
								<code
									className={cn(
										'rounded bg-accent px-1.5 py-0.5 font-mono text-xs',
										!key.enabled && 'text-muted-foreground',
									)}
								>
									{key.prefix}
									{key.start}...
								</code>
							</TableCell>
							<TableCell>
								{key.enabled ? (
									<span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
										<span className="h-1.5 w-1.5 rounded-full bg-green-500" />
										Active
									</span>
								) : (
									<span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
										<span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
										Revoked
									</span>
								)}
							</TableCell>
							{!isMobile && (
								<TableCell className="text-xs text-muted">
									{new Date(key.createdAt).toLocaleDateString()}
								</TableCell>
							)}
							<TableCell className="text-right">
								{key.enabled && (
									<button
										type="button"
										className="rounded px-2 py-1 text-xs text-destructive hover:bg-red-50"
										onClick={() => setRevokeConfirmId(key.id)}
									>
										Revoke
									</button>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{/* Revoke confirmation dialog */}
			<Dialog open={!!revokeConfirmId} onOpenChange={(open) => !open && setRevokeConfirmId(null)}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Revoke API Key</DialogTitle>
						<DialogDescription>
							Are you sure you want to revoke <strong>{revokeTarget?.name || 'this key'}</strong>?
							This action cannot be undone. Any integrations using this key will stop working.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" size="sm" onClick={() => setRevokeConfirmId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							size="sm"
							disabled={revokeKey.isPending}
							onClick={() => revokeConfirmId && handleRevoke(revokeConfirmId)}
						>
							{revokeKey.isPending ? 'Revoking...' : 'Revoke Key'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
