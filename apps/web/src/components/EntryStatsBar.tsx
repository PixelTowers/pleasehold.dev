// ABOUTME: Row of stat cards displaying total entry count and per-status breakdowns above the entries table.
// ABOUTME: Uses the established stat card styling pattern from the project overview page.

import type React from 'react';
import { EntryStatusBadge } from './EntryStatusBadge';

const gridStyle: React.CSSProperties = {
	display: 'grid',
	gridTemplateColumns: 'repeat(5, 1fr)',
	gap: '1rem',
};

const cardStyle: React.CSSProperties = {
	padding: '1rem',
	border: '1px solid #e5e7eb',
	borderRadius: '0.5rem',
	backgroundColor: '#fff',
};

const labelStyle: React.CSSProperties = {
	fontSize: '0.75rem',
	color: '#9ca3af',
	marginBottom: '0.25rem',
};

const valueStyle: React.CSSProperties = {
	fontSize: '1.5rem',
	fontWeight: 600,
};

interface EntryStatsBarProps {
	total: number;
	byStatus: Record<string, number>;
}

const statuses = ['new', 'contacted', 'converted', 'archived'] as const;

export function EntryStatsBar({ total, byStatus }: EntryStatsBarProps) {
	return (
		<div style={gridStyle}>
			<div style={cardStyle}>
				<div style={labelStyle}>Total Entries</div>
				<div style={valueStyle}>{total}</div>
			</div>
			{statuses.map((status) => (
				<div key={status} style={cardStyle}>
					<div style={labelStyle}>
						<EntryStatusBadge status={status} />
					</div>
					<div style={valueStyle}>{byStatus[status] ?? 0}</div>
				</div>
			))}
		</div>
	);
}
