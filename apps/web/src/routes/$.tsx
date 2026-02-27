// ABOUTME: Catch-all splat route for unmatched root-level paths.
// ABOUTME: Delegates to shared NotFoundContent for branded 404 display.

import { createFileRoute } from '@tanstack/react-router';
import { NotFoundContent } from '@/components/NotFoundContent';

export const Route = createFileRoute('/$')({
	component: NotFoundContent,
});
