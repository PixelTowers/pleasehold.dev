// ABOUTME: Linear-style settings dialog with sidebar tabs for Profile, Billing, and plan management.
// ABOUTME: Replaces separate /settings and /settings/billing routes with a single modal overlay.

import { CreditCard, Crown, User, X, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useBillingEnabled, useSubscription, useSubscriptionUsage } from '@/hooks/useSubscription';
import { authClient } from '@/lib/auth-client';
import { capture } from '@/lib/tracking';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'billing';

interface SettingsDialogProps {
	open: boolean;
	onClose: () => void;
	defaultTab?: Tab;
}

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
	{ id: 'profile', label: 'Profile', icon: User },
	{ id: 'billing', label: 'Billing', icon: CreditCard },
];

export function SettingsDialog({ open, onClose, defaultTab = 'profile' }: SettingsDialogProps) {
	const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

	useEffect(() => {
		if (open) setActiveTab(defaultTab);
	}, [open, defaultTab]);

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent
				className="sm:max-w-[calc(100vw-80px)] sm:max-h-[calc(100vh-80px)] h-[calc(100vh-80px)] p-0 gap-0 overflow-hidden rounded-xl"
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">Settings</DialogTitle>
				<DialogDescription className="sr-only">
					Manage your account and billing settings
				</DialogDescription>

				<div className="flex h-full">
					{/* Sidebar */}
					<div className="w-52 shrink-0 border-r border-border p-4 flex flex-col">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-sm font-semibold text-foreground">Settings</h2>
							<button
								type="button"
								onClick={onClose}
								className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<nav className="space-y-px">
							{tabs.map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.id}
										type="button"
										onClick={() => setActiveTab(tab.id)}
										className={cn(
											'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors cursor-pointer',
											activeTab === tab.id
												? 'bg-accent font-medium text-foreground'
												: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
										)}
									>
										<Icon className="h-4 w-4" />
										{tab.label}
									</button>
								);
							})}
						</nav>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-8">
						{activeTab === 'profile' && <ProfileTab />}
						{activeTab === 'billing' && <BillingTab />}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function ProfileTab() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) return <TabLoading />;

	return (
		<div>
			<h2 className="text-lg font-semibold text-foreground">Profile</h2>
			<p className="mt-1 text-sm text-muted-foreground">Your account information.</p>

			<div className="mt-6 space-y-5">
				<Field label="Name" value={session?.user?.name ?? '—'} />
				<Field label="Email" value={session?.user?.email ?? '—'} />
			</div>
		</div>
	);
}

function Field({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
			<div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
				{value}
			</div>
		</div>
	);
}

function BillingTab() {
	const { data: billing, isPending: billingLoading } = useBillingEnabled();
	const { data: sub, isPending: subLoading } = useSubscription();
	const { data: usage, isPending: usageLoading } = useSubscriptionUsage();

	const checkout = trpc.subscription.createCheckoutSession.useMutation({
		onSuccess: (data) => {
			capture('upgrade_clicked', { source: 'settings_dialog' });
			if (data.url) window.location.href = data.url;
		},
	});

	const portal = trpc.subscription.createPortalSession.useMutation({
		onSuccess: (data) => {
			capture('manage_billing_clicked');
			if (data.url) window.location.href = data.url;
		},
	});

	const plan = sub?.plan ?? 'free';
	const billingEnabled = billing?.enabled ?? false;

	useEffect(() => {
		if (!billingLoading && !subLoading) {
			capture('billing_page_viewed', { plan, billingEnabled });
		}
	}, [billingLoading, subLoading, plan, billingEnabled]);

	if (billingLoading || subLoading || usageLoading) return <TabLoading />;

	if (!billingEnabled) {
		return (
			<div>
				<h2 className="text-lg font-semibold text-foreground">Billing</h2>
				<p className="mt-1 text-sm text-muted-foreground">Manage your subscription.</p>

				<div className="mt-6 flex items-start gap-3 rounded-lg border border-border p-4">
					<Zap className="mt-0.5 h-5 w-5 text-primary shrink-0" />
					<div>
						<p className="text-sm font-medium text-foreground">Self-Hosted Mode</p>
						<p className="mt-0.5 text-sm text-muted-foreground">
							All features are unlocked. No restrictions.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const isPro = plan === 'pro';
	const entriesPercent =
		usage && usage.maxEntriesPerMonth !== Number.POSITIVE_INFINITY
			? Math.min(100, (usage.entriesThisMonth / usage.maxEntriesPerMonth) * 100)
			: 0;

	return (
		<div>
			<h2 className="text-lg font-semibold text-foreground">Billing</h2>
			<p className="mt-1 text-sm text-muted-foreground">Manage your subscription and usage.</p>

			{/* Plan card */}
			<div className="mt-6 rounded-lg border border-border p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						{isPro ? (
							<div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100">
								<Crown className="h-4 w-4 text-amber-600" />
							</div>
						) : (
							<div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
								<Zap className="h-4 w-4 text-muted-foreground" />
							</div>
						)}
						<div>
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold text-foreground">
									{isPro ? 'Pro' : 'Free'}
								</span>
								{isPro && (
									<Badge
										variant="secondary"
										className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0"
									>
										Active
									</Badge>
								)}
							</div>
							{isPro && sub?.currentPeriodEnd ? (
								<p className="text-xs text-muted-foreground">
									{sub.cancelAtPeriodEnd ? 'Cancels' : 'Renews'}{' '}
									{new Date(sub.currentPeriodEnd).toLocaleDateString()}
								</p>
							) : (
								<p className="text-xs text-muted-foreground">$0 forever</p>
							)}
						</div>
					</div>
					{isPro ? (
						<Button
							variant="outline"
							size="sm"
							className="h-8 text-xs"
							disabled={portal.isPending}
							onClick={() => portal.mutate()}
						>
							{portal.isPending ? 'Loading...' : 'Manage Billing'}
						</Button>
					) : (
						<Button
							size="sm"
							className="h-8 text-xs"
							disabled={checkout.isPending}
							onClick={() => checkout.mutate()}
						>
							{checkout.isPending ? 'Loading...' : 'Upgrade — $20/year'}
						</Button>
					)}
				</div>
			</div>

			{/* Usage */}
			{usage && (
				<div className="mt-6">
					<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Usage
					</h3>
					<div className="space-y-4">
						<div>
							<div className="mb-1.5 flex items-center justify-between text-sm">
								<span className="text-foreground">Entries this month</span>
								<span className="tabular-nums text-muted-foreground">
									{usage.entriesThisMonth.toLocaleString()}
									{usage.maxEntriesPerMonth !== Number.POSITIVE_INFINITY
										? ` / ${usage.maxEntriesPerMonth.toLocaleString()}`
										: ' / ∞'}
								</span>
							</div>
							{usage.maxEntriesPerMonth !== Number.POSITIVE_INFINITY && (
								<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										className={cn(
											'h-full rounded-full transition-all',
											entriesPercent >= 90 ? 'bg-destructive' : 'bg-primary',
										)}
										style={{ width: `${entriesPercent}%` }}
									/>
								</div>
							)}
						</div>
						<div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-foreground">Projects</span>
								<span className="tabular-nums text-muted-foreground">
									{usage.projectCount}
									{usage.maxProjects !== Number.POSITIVE_INFINITY
										? ` / ${usage.maxProjects}`
										: ' / ∞'}
								</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Free vs Pro comparison (free users only) */}
			{!isPro && (
				<div className="mt-6">
					<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Upgrade to Pro to unlock
					</h3>
					<div className="rounded-lg border border-border overflow-hidden">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border bg-muted/30">
									<th className="px-4 py-2 text-left font-medium text-muted-foreground">Feature</th>
									<th className="px-4 py-2 text-center font-medium text-muted-foreground">Free</th>
									<th className="px-4 py-2 text-center font-medium text-muted-foreground">Pro</th>
								</tr>
							</thead>
							<tbody>
								{[
									{ feature: 'Entries / month', free: '1,000', pro: 'Unlimited' },
									{ feature: 'Projects', free: '1', pro: 'Unlimited' },
									{ feature: 'Email templates', free: 'Default', pro: 'Custom' },
									{ feature: 'Branding & colors', free: '—', pro: '✓' },
									{ feature: '"Powered by" badge', free: 'Shown', pro: 'Removed' },
									{ feature: 'Team members', free: '1', pro: '5' },
									{ feature: 'Support', free: 'Community', pro: 'Priority' },
								].map((row, i) => (
									<tr key={row.feature} className={i < 6 ? 'border-b border-border/50' : ''}>
										<td className="px-4 py-2 text-foreground">{row.feature}</td>
										<td className="px-4 py-2 text-center text-muted-foreground">{row.free}</td>
										<td className="px-4 py-2 text-center font-medium text-foreground">{row.pro}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<Button
						className="mt-4 w-full h-9 text-sm"
						disabled={checkout.isPending}
						onClick={() => checkout.mutate()}
					>
						{checkout.isPending ? 'Loading...' : 'Upgrade — $20/year'}
					</Button>
				</div>
			)}
		</div>
	);
}

function TabLoading() {
	return (
		<div className="flex h-full items-center justify-center">
			<p className="text-sm text-muted-foreground">Loading...</p>
		</div>
	);
}
