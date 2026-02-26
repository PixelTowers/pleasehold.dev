// ABOUTME: Dashboard card component displaying a project summary at a glance.
// ABOUTME: Shows project name, mode badge, entry count, and last activity with a link to project overview.

import { Link } from '@tanstack/react-router';

interface ProjectCardProps {
	id: string;
	name: string;
	mode: 'waitlist' | 'demo-booking';
	createdAt: Date;
	updatedAt: Date;
}

const modeBadgeStyles: Record<string, React.CSSProperties> = {
	waitlist: {
		display: 'inline-block',
		padding: '0.125rem 0.5rem',
		fontSize: '0.75rem',
		fontWeight: 500,
		borderRadius: '9999px',
		backgroundColor: '#dbeafe',
		color: '#1d4ed8',
	},
	'demo-booking': {
		display: 'inline-block',
		padding: '0.125rem 0.5rem',
		fontSize: '0.75rem',
		fontWeight: 500,
		borderRadius: '9999px',
		backgroundColor: '#ede9fe',
		color: '#6d28d9',
	},
};

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - new Date(date).getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffMinutes < 1) return 'Just now';
	if (diffMinutes < 60) return `${diffMinutes}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 30) return `${diffDays}d ago`;
	return new Date(date).toLocaleDateString();
}

export function ProjectCard({ id, name, mode, createdAt, updatedAt }: ProjectCardProps) {
	return (
		<Link
			to="/projects/$projectId"
			params={{ projectId: id }}
			style={{
				display: 'block',
				padding: '1.25rem',
				border: '1px solid #e5e7eb',
				borderRadius: '0.5rem',
				backgroundColor: '#fff',
				textDecoration: 'none',
				color: 'inherit',
				transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
				e.currentTarget.style.borderColor = '#d1d5db';
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.boxShadow = 'none';
				e.currentTarget.style.borderColor = '#e5e7eb';
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
				<h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{name}</h3>
				<span style={modeBadgeStyles[mode]}>{mode === 'demo-booking' ? 'Demo Booking' : 'Waitlist'}</span>
			</div>

			<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#6b7280' }}>
				<span>0 entries</span>
				<span>Active {formatRelativeTime(updatedAt)}</span>
			</div>

			<div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
				Created {new Date(createdAt).toLocaleDateString()}
			</div>
		</Link>
	);
}
