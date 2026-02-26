// ABOUTME: Two-column application layout with fixed sidebar and scrollable content area.
// ABOUTME: Used for all authenticated pages; auth pages bypass this and use a centered layout.

import { Sidebar } from './Sidebar';

interface AppLayoutProps {
	children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	return (
		<div className="flex h-screen">
			<Sidebar />
			<main className="flex-1 overflow-y-auto bg-background p-6">
				{children}
			</main>
		</div>
	);
}
