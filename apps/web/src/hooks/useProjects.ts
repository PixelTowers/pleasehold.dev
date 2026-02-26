// ABOUTME: React hooks for fetching project data via tRPC.
// ABOUTME: Provides useProjects() for listing all projects and useProject(id) for a single project.

import { trpc } from '../lib/trpc';

export function useProjects() {
	return trpc.project.list.useQuery();
}

export function useProject(id: string) {
	return trpc.project.getById.useQuery({ id });
}
