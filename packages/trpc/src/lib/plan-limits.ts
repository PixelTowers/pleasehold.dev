// ABOUTME: Plan limit constants and billing-enabled check for free vs pro tier enforcement.
// ABOUTME: Self-hosted instances bypass all limits when STRIPE_SECRET_KEY is not set.

export const PLAN_LIMITS = {
	free: {
		maxEntriesPerMonth: 100,
		maxProjects: 1,
		customBranding: false,
		customEmailTemplates: false,
		removeBadge: false,
		maxTeamMembers: 1,
	},
	pro: {
		maxEntriesPerMonth: Number.POSITIVE_INFINITY,
		maxProjects: Number.POSITIVE_INFINITY,
		customBranding: true,
		customEmailTemplates: true,
		removeBadge: true,
		maxTeamMembers: 5,
	},
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function isBillingEnabled(): boolean {
	return !!process.env.STRIPE_SECRET_KEY;
}
