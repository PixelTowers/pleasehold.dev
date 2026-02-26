// ABOUTME: One-time API key display with copy button and security warning.
// ABOUTME: The key is shown exactly once after creation; never stored in persistent client storage.

import { useCallback, useState } from 'react';
import { AlertTriangle, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
		<div className="p-6">
			{/* Security warning */}
			<div className="mb-5 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
				<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
				<p className="text-[0.8125rem] leading-relaxed text-amber-800">
					This key will only be shown once. Copy it now and store it securely.
					You will not be able to see it again.
				</p>
			</div>

			{/* Key display */}
			<div className="mb-5 flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-3">
				<code className="flex-1 break-all font-mono text-[0.8125rem] leading-relaxed text-gray-100">
					{apiKey}
				</code>
				<Button
					variant="secondary"
					size="sm"
					className={cn(
						'h-7 shrink-0 text-xs',
						copied && 'bg-green-600 text-white hover:bg-green-600',
					)}
					onClick={handleCopy}
				>
					{copied ? (
						<>
							<Check className="mr-1 h-3 w-3" />
							Copied!
						</>
					) : (
						<>
							<Copy className="mr-1 h-3 w-3" />
							Copy
						</>
					)}
				</Button>
			</div>

			{/* Dismiss button */}
			<div className="flex justify-end">
				<Button onClick={onDismiss}>Done</Button>
			</div>
		</div>
	);
}
