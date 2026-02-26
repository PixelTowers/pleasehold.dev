// ABOUTME: Guided multi-step project creation flow for first-time users.
// ABOUTME: Step 1: name, Step 2: mode selection, Step 3: review and create.

import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { trpc } from '../lib/trpc';

type Mode = 'waitlist' | 'demo-booking';

const modeDescriptions: Record<Mode, { label: string; description: string; fields: string }> = {
	waitlist: {
		label: 'Waitlist',
		description: 'Collect email addresses for a simple waitlist or early access signup.',
		fields: 'Collects: Email only',
	},
	'demo-booking': {
		label: 'Demo Booking',
		description: 'Collect detailed contact information for demo requests or sales inquiries.',
		fields: 'Collects: Email, Name, Company, Message',
	},
};

export function CreateProjectFlow() {
	const navigate = useNavigate();
	const [step, setStep] = useState(1);
	const [name, setName] = useState('');
	const [mode, setMode] = useState<Mode | null>(null);
	const [error, setError] = useState<string | null>(null);

	const createProject = trpc.project.create.useMutation({
		onSuccess: (data) => {
			navigate({ to: '/projects/$projectId', params: { projectId: data.id } });
		},
		onError: (err) => {
			setError(err.message ?? 'Failed to create project. Please try again.');
		},
	});

	const handleCreate = () => {
		if (!name || !mode) return;
		setError(null);
		createProject.mutate({ name, mode });
	};

	return (
		<div style={{ maxWidth: '32rem', margin: '0 auto' }}>
			<div style={{ textAlign: 'center', marginBottom: '2rem' }}>
				<h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
					Create your first project
				</h1>
				<p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
					Projects organize your signups. Let&apos;s get started.
				</p>
			</div>

			{/* Step indicator */}
			<div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
				{[1, 2, 3].map((s) => (
					<div
						key={s}
						style={{
							width: '2rem',
							height: '0.25rem',
							borderRadius: '9999px',
							backgroundColor: s <= step ? '#111' : '#e5e7eb',
							transition: 'background-color 0.2s',
						}}
					/>
				))}
			</div>

			{error && (
				<div
					style={{
						padding: '0.75rem 1rem',
						marginBottom: '1rem',
						backgroundColor: '#fef2f2',
						border: '1px solid #fecaca',
						borderRadius: '0.375rem',
						color: '#dc2626',
						fontSize: '0.875rem',
					}}
				>
					{error}
				</div>
			)}

			{/* Step 1: Project Name */}
			{step === 1 && (
				<div>
					<label
						htmlFor="project-name"
						style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}
					>
						Project name
					</label>
					<input
						id="project-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="My Landing Page"
						maxLength={100}
						style={{
							width: '100%',
							padding: '0.625rem 0.75rem',
							border: '1px solid #d1d5db',
							borderRadius: '0.375rem',
							fontSize: '0.875rem',
							boxSizing: 'border-box',
						}}
					/>
					<p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
						Give your project a name you&apos;ll recognize in the dashboard.
					</p>
					<button
						type="button"
						onClick={() => setStep(2)}
						disabled={!name.trim()}
						style={{
							marginTop: '1.5rem',
							width: '100%',
							padding: '0.625rem',
							backgroundColor: name.trim() ? '#111' : '#d1d5db',
							color: '#fff',
							border: 'none',
							borderRadius: '0.375rem',
							fontSize: '0.875rem',
							fontWeight: 500,
							cursor: name.trim() ? 'pointer' : 'not-allowed',
						}}
					>
						Continue
					</button>
				</div>
			)}

			{/* Step 2: Mode Selection */}
			{step === 2 && (
				<div>
					<p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
						Choose a mode
					</p>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
						{(['waitlist', 'demo-booking'] as const).map((m) => {
							const info = modeDescriptions[m];
							const isSelected = mode === m;
							return (
								<button
									key={m}
									type="button"
									onClick={() => setMode(m)}
									style={{
										padding: '1rem',
										border: isSelected ? '2px solid #111' : '1px solid #e5e7eb',
										borderRadius: '0.5rem',
										backgroundColor: isSelected ? '#f9fafb' : '#fff',
										cursor: 'pointer',
										textAlign: 'left',
									}}
								>
									<div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
										{info.label}
									</div>
									<div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.375rem' }}>
										{info.description}
									</div>
									<div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
										{info.fields}
									</div>
								</button>
							);
						})}
					</div>
					<p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem' }}>
						Mode cannot be changed after project creation.
					</p>
					<div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
						<button
							type="button"
							onClick={() => setStep(1)}
							style={{
								flex: 1,
								padding: '0.625rem',
								backgroundColor: '#fff',
								color: '#374151',
								border: '1px solid #d1d5db',
								borderRadius: '0.375rem',
								fontSize: '0.875rem',
								cursor: 'pointer',
							}}
						>
							Back
						</button>
						<button
							type="button"
							onClick={() => setStep(3)}
							disabled={!mode}
							style={{
								flex: 1,
								padding: '0.625rem',
								backgroundColor: mode ? '#111' : '#d1d5db',
								color: '#fff',
								border: 'none',
								borderRadius: '0.375rem',
								fontSize: '0.875rem',
								fontWeight: 500,
								cursor: mode ? 'pointer' : 'not-allowed',
							}}
						>
							Continue
						</button>
					</div>
				</div>
			)}

			{/* Step 3: Review and Create */}
			{step === 3 && mode && (
				<div>
					<p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem' }}>
						Review your project
					</p>
					<div
						style={{
							padding: '1rem',
							border: '1px solid #e5e7eb',
							borderRadius: '0.5rem',
							backgroundColor: '#f9fafb',
							marginBottom: '1.5rem',
						}}
					>
						<div style={{ marginBottom: '0.75rem' }}>
							<span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Name</span>
							<span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{name}</span>
						</div>
						<div style={{ marginBottom: '0.75rem' }}>
							<span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Mode</span>
							<span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
								{modeDescriptions[mode].label}
							</span>
						</div>
						<div>
							<span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Fields collected</span>
							<span style={{ fontSize: '0.875rem' }}>
								{mode === 'waitlist' ? 'Email only' : 'Email, Name, Company, Message'}
							</span>
						</div>
					</div>
					<div style={{ display: 'flex', gap: '0.75rem' }}>
						<button
							type="button"
							onClick={() => setStep(2)}
							style={{
								flex: 1,
								padding: '0.625rem',
								backgroundColor: '#fff',
								color: '#374151',
								border: '1px solid #d1d5db',
								borderRadius: '0.375rem',
								fontSize: '0.875rem',
								cursor: 'pointer',
							}}
						>
							Back
						</button>
						<button
							type="button"
							onClick={handleCreate}
							disabled={createProject.isPending}
							style={{
								flex: 1,
								padding: '0.625rem',
								backgroundColor: createProject.isPending ? '#6b7280' : '#111',
								color: '#fff',
								border: 'none',
								borderRadius: '0.375rem',
								fontSize: '0.875rem',
								fontWeight: 500,
								cursor: createProject.isPending ? 'not-allowed' : 'pointer',
							}}
						>
							{createProject.isPending ? 'Creating...' : 'Create Project'}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
