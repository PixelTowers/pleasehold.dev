// ABOUTME: Layout route for project-scoped pages (overview, settings).
// ABOUTME: Simply renders the child route via Outlet; no shared chrome needed at this level.

import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/projects/$projectId')({
	component: ProjectLayout,
});

function ProjectLayout() {
	return <Outlet />;
}
