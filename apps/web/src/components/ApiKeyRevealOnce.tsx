// ABOUTME: One-time API key display with copy button and security warning.
// ABOUTME: The key is shown exactly once after creation; never stored in persistent client storage.

import { AlertTriangle, Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
					This key will only be shown once. Copy it now and store it securely. You will not be able
					to see it again.
				</p>
			</div>

			{/* Key display */}
			<div className="mb-4 rounded-lg bg-gray-900 px-4 py-3">
				<code className="break-all font-mono text-[0.8125rem] leading-relaxed text-gray-100">
					{apiKey}
				</code>
			</div>

			{/* Action buttons */}
			<div className="flex gap-2">
				<Button
					className={cn('flex-1', copied && 'bg-green-600 text-white hover:bg-green-600')}
					onClick={handleCopy}
				>
					{copied ? (
						<>
							<Check className="mr-2 h-4 w-4" />
							Copied to clipboard!
						</>
					) : (
						<>
							<Copy className="mr-2 h-4 w-4" />
							Copy API Key
						</>
					)}
				</Button>
				<Button variant="outline" onClick={onDismiss}>
					Done
				</Button>
			</div>
		</div>
	);
}
