// ABOUTME: Table of API keys showing prefix + start, label, status badge, and revoke action.
// ABOUTME: Only shows first 8 chars via start field; never displays full key or hash.

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

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
			<Card className="bg-accent p-12 text-center">
				<p className="text-sm text-muted">
					No API keys yet. Create one to start accepting submissions.
				</p>
			</Card>
		);
	}

	return (
		<Card className="overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted">
							Label
						</TableHead>
						<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted">
							Key
						</TableHead>
						<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted">
							Status
						</TableHead>
						<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted">
							Created
						</TableHead>
						<TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted">
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{keys.map((key) => (
						<TableRow key={key.id} className={cn(!key.enabled && 'bg-accent')}>
							<TableCell className={cn('font-medium', !key.enabled && 'text-muted-foreground')}>
								{key.name || 'API Key'}
							</TableCell>
							<TableCell>
								<code
									className={cn(
										'rounded px-2 py-0.5 font-mono text-[0.8125rem]',
										key.enabled ? 'bg-gray-100 text-foreground' : 'text-muted-foreground',
									)}
								>
									{key.prefix}
									{key.start}...
								</code>
							</TableCell>
							<TableCell>
								{key.enabled ? (
									<Badge
										variant="secondary"
										className="border-0 bg-green-100 text-green-800 hover:bg-green-100"
									>
										Active
									</Badge>
								) : (
									<Badge
										variant="secondary"
										className="border-0 bg-red-100 text-red-800 hover:bg-red-100"
									>
										Revoked
									</Badge>
								)}
							</TableCell>
							<TableCell className="text-[0.8125rem] text-muted">
								{new Date(key.createdAt).toLocaleDateString()}
							</TableCell>
							<TableCell className="text-right">
								{key.enabled && revokeConfirmId !== key.id && (
									<Button
										variant="outline"
										size="sm"
										className="h-7 border-red-200 text-xs text-destructive hover:bg-red-50"
										onClick={() => setRevokeConfirmId(key.id)}
									>
										Revoke
									</Button>
								)}
								{key.enabled && revokeConfirmId === key.id && (
									<div className="flex items-center justify-end gap-1.5">
										<span className="text-xs text-destructive">Are you sure?</span>
										<Button
											size="sm"
											variant="destructive"
											className="h-7 text-xs"
											disabled={revokeKey.isPending}
											onClick={() => handleRevoke(key.id)}
										>
											{revokeKey.isPending ? '...' : 'Yes'}
										</Button>
										<Button
											size="sm"
											variant="outline"
											className="h-7 text-xs"
											onClick={() => setRevokeConfirmId(null)}
										>
											No
										</Button>
									</div>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Card>
	);
}
