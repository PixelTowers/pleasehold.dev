// ABOUTME: Billing settings page showing current plan, usage stats, and upgrade/manage buttons.
// ABOUTME: Free users see upgrade CTA; Pro users see Stripe portal link; self-hosted shows all-unlocked.

import { createFileRoute } from '@tanstack/react-router';
import confetti from 'canvas-confetti';
import { Check, Crown, Zap } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBillingEnabled, useSubscription, useSubscriptionUsage } from '@/hooks/useSubscription';
import { capture } from '@/lib/tracking';
import { trpc } from '@/lib/trpc';

export const Route = createFileRoute('/settings/billing')({
	component: BillingPage,
});

function BillingPage() {
	const { data: billing, isPending: billingLoading } = useBillingEnabled();
	const { data: sub, isPending: subLoading } = useSubscription();
	const { data: usage, isPending: usageLoading } = useSubscriptionUsage();

	const checkout = trpc.subscription.createCheckoutSession.useMutation({
		onSuccess: (data) => {
			capture('upgrade_clicked', { source: 'billing_page' });
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
	const confettiFired = useRef(false);

	useEffect(() => {
		if (!billingLoading && !subLoading) {
			capture('billing_page_viewed', { plan, billingEnabled });
		}
	}, [billingLoading, subLoading, plan, billingEnabled]);

	// Fire confetti on successful Stripe checkout redirect
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get('success') !== 'true' || confettiFired.current) return;
		confettiFired.current = true;

		// Clean up the URL param
		params.delete('success');
		const newUrl = params.toString()
			? `${window.location.pathname}?${params.toString()}`
			: window.location.pathname;
		window.history.replaceState({}, '', newUrl);

		// Fire confetti bursts from both sides + center
		const fire = (opts: confetti.Options) => confetti({ ...opts, disableForReducedMotion: true });
		fire({ particleCount: 80, spread: 70, origin: { x: 0.3, y: 0.5 } });
		fire({ particleCount: 80, spread: 70, origin: { x: 0.7, y: 0.5 } });
		const timer = setTimeout(() => {
			fire({ particleCount: 50, spread: 100, origin: { x: 0.5, y: 0.3 } });
		}, 250);
		return () => clearTimeout(timer);
	}, []);

	if (billingLoading || subLoading || usageLoading) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading billing...</p>
			</div>
		);
	}

	// Self-hosted mode
	if (!billing?.enabled) {
		return (
			<div className="mx-auto max-w-4xl">
				<h1 className="mb-1 text-xl font-semibold text-foreground">Billing</h1>
				<p className="mb-6 text-sm text-muted-foreground">Manage your subscription.</p>

				<div className="rounded-lg border border-border bg-card p-6">
					<div className="flex items-center gap-3 mb-3">
						<Zap className="h-5 w-5 text-primary" />
						<h2 className="text-base font-semibold text-foreground">Self-Hosted Mode</h2>
					</div>
					<p className="text-sm text-muted-foreground">
						All features are unlocked. Self-hosted instances have no restrictions.
					</p>
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
		<div className="mx-auto max-w-4xl">
			<h1 className="mb-1 text-xl font-semibold text-foreground">Billing</h1>
			<p className="mb-6 text-sm text-muted-foreground">Manage your subscription and usage.</p>

			{/* Current plan */}
			<div className="mb-6">
				<h2 className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
					Current Plan
				</h2>
				<div className="rounded-lg border border-border bg-card p-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							{isPro ? (
								<Crown className="h-5 w-5 text-amber-500" />
							) : (
								<Zap className="h-5 w-5 text-muted-foreground" />
							)}
							<div>
								<div className="flex items-center gap-2">
									<span className="text-base font-semibold text-foreground">
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
								{isPro && sub?.currentPeriodEnd && (
									<p className="text-xs text-muted-foreground">
										{sub.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
										{new Date(sub.currentPeriodEnd).toLocaleDateString()}
									</p>
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
			</div>

			{/* Usage stats */}
			{usage && (
				<div className="mb-6">
					<h2 className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Usage</h2>
					<div className="border-t border-border/50">
						{/* Entries */}
						<div className="border-b border-border/50 py-3">
							<div className="flex items-center justify-between mb-1">
								<span className="text-sm text-foreground">Entries this month</span>
								<span className="text-sm text-muted-foreground">
									{usage.entriesThisMonth.toLocaleString()}
									{usage.maxEntriesPerMonth !== Number.POSITIVE_INFINITY
										? ` / ${usage.maxEntriesPerMonth.toLocaleString()}`
										: ' / Unlimited'}
								</span>
							</div>
							{usage.maxEntriesPerMonth !== Number.POSITIVE_INFINITY && (
								<div className="h-1.5 w-full rounded-full bg-muted">
									<div
										className="h-1.5 rounded-full bg-primary transition-all"
										style={{ width: `${entriesPercent}%` }}
									/>
								</div>
							)}
						</div>

						{/* Projects */}
						<div className="border-b border-border/50 py-3">
							<div className="flex items-center justify-between">
								<span className="text-sm text-foreground">Projects</span>
								<span className="text-sm text-muted-foreground">
									{usage.projectCount}
									{usage.maxProjects !== Number.POSITIVE_INFINITY
										? ` / ${usage.maxProjects}`
										: ' / Unlimited'}
								</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Pro features list (for free users) */}
			{!isPro && (
				<div className="mb-6">
					<h2 className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
						Pro includes
					</h2>
					<div className="rounded-lg border border-border bg-card p-5">
						<ul className="space-y-2">
							{[
								'Unlimited entries per month',
								'Unlimited projects',
								'Custom email templates',
								'Custom branding & colors',
								'"Powered by pleasehold" badge removed',
								'Up to 5 team members',
								'Priority support',
							].map((feat) => (
								<li key={feat} className="flex items-center gap-2 text-sm text-foreground">
									<Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
									{feat}
								</li>
							))}
						</ul>
						<Button
							className="mt-4 h-8 text-xs"
							disabled={checkout.isPending}
							onClick={() => checkout.mutate()}
						>
							{checkout.isPending ? 'Loading...' : 'Upgrade — $20/year'}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
