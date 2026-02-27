// ABOUTME: Shared 404 content used by both the catch-all splat route and the root notFoundComponent.
// ABOUTME: Shows branded "page not found" with PauseLogo and a link back to the dashboard.

import { Link } from '@tanstack/react-router';
import { PauseLogo } from '@/components/PauseLogo';

export function NotFoundContent() {
	return (
		<div className="flex flex-col items-center justify-center py-24">
			<PauseLogo size={64} className="mb-6 text-border" />
			<h1 className="mb-2 text-lg font-semibold text-foreground">Page not found</h1>
			<p className="mb-6 text-sm text-muted-foreground">
				The page you're looking for doesn't exist or has been moved.
			</p>
			<Link to="/" className="text-sm font-medium text-primary hover:underline">
				Back to dashboard
			</Link>
		</div>
	);
}
