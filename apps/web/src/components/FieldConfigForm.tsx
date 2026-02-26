// ABOUTME: Field configuration toggle form for project settings.
// ABOUTME: Displays email as always required and provides toggle switches for name, company, and message fields.

import { useState } from 'react';
import { trpc } from '../lib/trpc';

interface FieldConfigFormProps {
	projectId: string;
	collectName: boolean;
	collectCompany: boolean;
	collectMessage: boolean;
}

function ToggleSwitch({ checked, onChange, label, description }: {
	checked: boolean;
	onChange: (val: boolean) => void;
	label: string;
	description: string;
}) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				padding: '0.75rem 0',
				borderBottom: '1px solid #f3f4f6',
			}}
		>
			<div>
				<div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
				<div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{description}</div>
			</div>
			<button
				type="button"
				onClick={() => onChange(!checked)}
				style={{
					width: '2.75rem',
					height: '1.5rem',
					borderRadius: '9999px',
					border: 'none',
					backgroundColor: checked ? '#111' : '#d1d5db',
					cursor: 'pointer',
					position: 'relative',
					transition: 'background-color 0.2s',
					flexShrink: 0,
				}}
			>
				<div
					style={{
						width: '1.125rem',
						height: '1.125rem',
						borderRadius: '9999px',
						backgroundColor: '#fff',
						position: 'absolute',
						top: '0.1875rem',
						left: checked ? '1.4375rem' : '0.1875rem',
						transition: 'left 0.2s',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
					}}
				/>
			</button>
		</div>
	);
}

export function FieldConfigForm({ projectId, collectName, collectCompany, collectMessage }: FieldConfigFormProps) {
	const [fields, setFields] = useState({
		collectName,
		collectCompany,
		collectMessage,
	});
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

	const utils = trpc.useUtils();
	const updateFields = trpc.project.updateFields.useMutation({
		onSuccess: () => {
			setSaveStatus('saved');
			utils.project.getById.invalidate({ id: projectId });
			setTimeout(() => setSaveStatus('idle'), 2000);
		},
		onError: () => {
			setSaveStatus('error');
			setTimeout(() => setSaveStatus('idle'), 3000);
		},
	});

	const handleToggle = (field: keyof typeof fields, value: boolean) => {
		const updated = { ...fields, [field]: value };
		setFields(updated);
		setSaveStatus('saving');
		updateFields.mutate({ projectId, ...updated });
	};

	return (
		<div>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
				<h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Field Configuration</h3>
				{saveStatus === 'saving' && (
					<span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Saving...</span>
				)}
				{saveStatus === 'saved' && (
					<span style={{ fontSize: '0.75rem', color: '#059669' }}>Saved</span>
				)}
				{saveStatus === 'error' && (
					<span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Failed to save</span>
				)}
			</div>

			{/* Email is always required */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '0.75rem 0',
					borderBottom: '1px solid #f3f4f6',
				}}
			>
				<div>
					<div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email</div>
					<div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Primary contact field</div>
				</div>
				<span style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>
					Always required
				</span>
			</div>

			<ToggleSwitch
				checked={fields.collectName}
				onChange={(val) => handleToggle('collectName', val)}
				label="Name"
				description="Collect the submitter's name"
			/>
			<ToggleSwitch
				checked={fields.collectCompany}
				onChange={(val) => handleToggle('collectCompany', val)}
				label="Company"
				description="Collect company or organization name"
			/>
			<ToggleSwitch
				checked={fields.collectMessage}
				onChange={(val) => handleToggle('collectMessage', val)}
				label="Message"
				description="Allow a freeform message or note"
			/>
		</div>
	);
}
