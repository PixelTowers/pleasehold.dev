// ABOUTME: Two-column application layout with fixed sidebar and scrollable content area.
// ABOUTME: On mobile, sidebar becomes a slide-out drawer triggered by a hamburger menu.

import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
	children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<div className="flex h-screen">
			{/* Mobile header bar */}
			<div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center border-b border-sidebar-border bg-sidebar px-4 md:hidden">
				<button
					type="button"
					onClick={() => setMobileMenuOpen(true)}
					className="mr-3 rounded-md p-1 text-muted hover:bg-accent hover:text-foreground"
				>
					<Menu className="h-5 w-5" />
				</button>
				<span className="text-sm font-bold text-foreground">pleasehold</span>
			</div>

			{/* Backdrop overlay */}
			{mobileMenuOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/30 md:hidden"
					onClick={() => setMobileMenuOpen(false)}
					aria-label="Close menu"
				/>
			)}

			{/* Sidebar — hidden on mobile, drawer when open */}
			<div
				className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 md:static md:translate-x-0 ${
					mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				{/* Mobile close button inside drawer */}
				<div className="absolute right-2 top-2 z-10 md:hidden">
					<button
						type="button"
						onClick={() => setMobileMenuOpen(false)}
						className="rounded-md p-1 text-muted hover:bg-accent hover:text-foreground"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
				<Sidebar onClose={() => setMobileMenuOpen(false)} />
			</div>

			<main className="flex-1 overflow-y-auto bg-background p-4 pt-16 md:p-6 md:pt-6">
				{children}
			</main>
		</div>
	);
}
