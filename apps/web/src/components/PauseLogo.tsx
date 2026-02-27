// ABOUTME: SVG pause-button logo component for pleasehold branding.
// ABOUTME: Used in sidebar header, empty states, and anywhere the logo mark is needed.

import { cn } from '@/lib/utils';

interface PauseLogoProps {
	size?: number;
	className?: string;
}

export function PauseLogo({ size = 20, className }: PauseLogoProps) {
	const barWidth = size * 0.09;
	const barHeight = size * 0.45;
	const barRadius = barWidth / 2;
	const barY = (size - barHeight) / 2;
	const gap = size * 0.22;
	const barX1 = (size - gap - barWidth * 2) / 2;
	const barX2 = barX1 + barWidth + gap;

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={`0 0 ${size} ${size}`}
			width={size}
			height={size}
			fill="none"
			className={cn('shrink-0', className)}
			aria-label="pleasehold logo"
		>
			<rect
				x={size * 0.03}
				y={size * 0.03}
				width={size * 0.94}
				height={size * 0.94}
				rx={size * 0.14}
				stroke="currentColor"
				strokeWidth={size * 0.055}
				fill="none"
			/>
			<rect
				x={barX1}
				y={barY}
				width={barWidth}
				height={barHeight}
				rx={barRadius}
				fill="currentColor"
			/>
			<rect
				x={barX2}
				y={barY}
				width={barWidth}
				height={barHeight}
				rx={barRadius}
				fill="currentColor"
			/>
		</svg>
	);
}
