// ABOUTME: Legacy project creation route that redirects to the dashboard.
// ABOUTME: Project creation now uses a dialog overlay on the dashboard page.

import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/projects/new')({
	component: RedirectToDashboard,
});

function RedirectToDashboard() {
	return <Navigate to="/" />;
}
