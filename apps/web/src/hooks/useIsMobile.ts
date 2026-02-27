// ABOUTME: Hook that returns true when the viewport is below the md breakpoint (768px).
// ABOUTME: Uses window.matchMedia for responsive behavior without resize event listeners.

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(
		typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
	);

	useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
		mql.addEventListener('change', handler);
		setIsMobile(mql.matches);
		return () => mql.removeEventListener('change', handler);
	}, []);

	return isMobile;
}
