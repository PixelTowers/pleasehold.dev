// ABOUTME: Action bar for bulk status changes on selected entries, shown above the entries table.
// ABOUTME: Renders status change buttons when one or more entries are selected; hidden when none selected.

import type React from 'react';

const barStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: '0.75rem',
	padding: '0.5rem 1rem',
	backgroundColor: '#eff6ff',
	border: '1px solid #bfdbfe',
	borderRadius: '0.375rem',
	marginBottom: '1rem',
	fontSize: '0.875rem',
};

const buttonStyle: React.CSSProperties = {
	padding: '0.25rem 0.625rem',
	border: '1px solid #d1d5db',
	borderRadius: '0.25rem',
	backgroundColor: '#fff',
	fontSize: '0.75rem',
	cursor: 'pointer',
};

const disabledButtonStyle: React.CSSProperties = {
	...buttonStyle,
	cursor: 'not-allowed',
	opacity: 0.5,
};

interface BulkActionBarProps {
	selectedCount: number;
	onStatusChange: (status: string) => void;
	isPending: boolean;
}

const statuses = ['new', 'contacted', 'converted', 'archived'] as const;

export function BulkActionBar({ selectedCount, onStatusChange, isPending }: BulkActionBarProps) {
	if (selectedCount === 0) {
		return null;
	}

	return (
		<div style={barStyle}>
			<span style={{ fontWeight: 500 }}>
				{selectedCount} selected
			</span>
			<span style={{ color: '#6b7280' }}>Set status:</span>
			{statuses.map((status) => (
				<button
					key={status}
					type="button"
					style={isPending ? disabledButtonStyle : buttonStyle}
					disabled={isPending}
					onClick={() => onStatusChange(status)}
				>
					{status.charAt(0).toUpperCase() + status.slice(1)}
				</button>
			))}
		</div>
	);
}
