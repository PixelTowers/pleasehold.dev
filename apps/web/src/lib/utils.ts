// ABOUTME: Utility functions for the web dashboard.
// ABOUTME: Provides cn() helper for merging Tailwind CSS class names with conflict resolution.

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
