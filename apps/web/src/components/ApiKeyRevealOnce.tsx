// ABOUTME: One-time API key display with copy button and security warning.
// ABOUTME: The key is shown exactly once after creation; never stored in persistent client storage.

import { useCallback, useState } from 'react';

interface ApiKeyRevealOnceProps {
	apiKey: string;
	onDismiss: () => void;
}

export function ApiKeyRevealOnce({ apiKey, onDismiss }: ApiKeyRevealOnceProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(apiKey);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback for environments where clipboard API is unavailable
			const textArea = document.createElement('textarea');
			textArea.value = apiKey;
			textArea.style.position = 'fixed';
			textArea.style.opacity = '0';
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	}, [apiKey]);

	return (
		<div style={{ padding: '1.5rem' }}>
			{/* Security warning */}
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					gap: '0.75rem',
					padding: '0.75rem 1rem',
					backgroundColor: '#fffbeb',
					border: '1px solid #fde68a',
					borderRadius: '0.375rem',
					marginBottom: '1.25rem',
				}}
			>
				<span style={{ fontSize: '1.125rem', flexShrink: 0, marginTop: '0.125rem' }}>!</span>
				<p style={{ margin: 0, fontSize: '0.8125rem', color: '#92400e', lineHeight: '1.5' }}>
					This key will only be shown once. Copy it now and store it securely.
					You will not be able to see it again.
				</p>
			</div>

			{/* Key display */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.5rem',
					padding: '0.75rem 1rem',
					backgroundColor: '#111827',
					borderRadius: '0.5rem',
					marginBottom: '1.25rem',
				}}
			>
				<code
					style={{
						flex: 1,
						fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
						fontSize: '0.8125rem',
						color: '#f3f4f6',
						wordBreak: 'break-all',
						lineHeight: '1.5',
					}}
				>
					{apiKey}
				</code>
				<button
					type="button"
					onClick={handleCopy}
					style={{
						flexShrink: 0,
						padding: '0.375rem 0.75rem',
						backgroundColor: copied ? '#059669' : '#374151',
						color: '#fff',
						border: 'none',
						borderRadius: '0.25rem',
						fontSize: '0.75rem',
						fontWeight: 500,
						cursor: 'pointer',
						transition: 'background-color 150ms ease',
						minWidth: '4.5rem',
					}}
				>
					{copied ? 'Copied!' : 'Copy'}
				</button>
			</div>

			{/* Dismiss button */}
			<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
				<button
					type="button"
					onClick={onDismiss}
					style={{
						padding: '0.5rem 1rem',
						backgroundColor: '#111',
						color: '#fff',
						border: 'none',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						fontWeight: 500,
						cursor: 'pointer',
					}}
				>
					Done
				</button>
			</div>
		</div>
	);
}
