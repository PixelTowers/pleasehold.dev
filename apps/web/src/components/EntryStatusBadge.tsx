// ABOUTME: Color-coded pill badge that displays entry status values (new, contacted, converted, archived).
// ABOUTME: Uses inline styles matching the existing mode badge pattern from the project overview page.

import type React from 'react';

const statusStyles: Record<string, React.CSSProperties> = {
	new: {
		backgroundColor: '#dbeafe',
		color: '#1d4ed8',
	},
	contacted: {
		backgroundColor: '#fef3c7',
		color: '#92400e',
	},
	converted: {
		backgroundColor: '#dcfce7',
		color: '#166534',
	},
	archived: {
		backgroundColor: '#f3f4f6',
		color: '#6b7280',
	},
};

const baseStyle: React.CSSProperties = {
	display: 'inline-block',
	borderRadius: '9999px',
	padding: '0.125rem 0.5rem',
	fontSize: '0.75rem',
	fontWeight: 500,
};

interface EntryStatusBadgeProps {
	status: string;
}

export function EntryStatusBadge({ status }: EntryStatusBadgeProps) {
	const colorStyle = statusStyles[status] ?? statusStyles.archived;
	const label = status.charAt(0).toUpperCase() + status.slice(1);

	return <span style={{ ...baseStyle, ...colorStyle }}>{label}</span>;
}
