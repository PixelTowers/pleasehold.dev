// ABOUTME: Popover-based color picker using react-colorful for spectrum/gradient selection.
// ABOUTME: Controlled component accepting value/onChange for use in forms and settings.

import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

interface ColorPickerProps {
	value: string;
	onChange: (color: string) => void;
	className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
	const [draft, setDraft] = useState(value);
	const [open, setOpen] = useState(false);

	const isValidHex = HEX_REGEX.test(value);
	const displayColor = isValidHex ? value : '#0d9488';

	const handlePickerChange = (color: string) => {
		setDraft(color);
		onChange(color);
	};

	const handleInputChange = (input: string) => {
		// Auto-prepend # if user types without it
		const normalized = input.startsWith('#') ? input : `#${input}`;
		setDraft(normalized);
		if (HEX_REGEX.test(normalized)) {
			onChange(normalized);
		}
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			setDraft(value);
		}
		setOpen(isOpen);
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={
						className ??
						'flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent'
					}
				>
					<span
						className="h-5 w-5 flex-shrink-0 rounded-full border border-border/50"
						style={{ backgroundColor: displayColor }}
					/>
					<span className="font-mono text-xs text-muted-foreground">{value || '#0d9488'}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="z-50 w-auto rounded-md border bg-white p-3 shadow-md dark:bg-popover"
			>
				<HexColorPicker color={displayColor} onChange={handlePickerChange} />
				<div className="mt-3 flex items-center gap-2">
					<span
						className="h-7 w-7 flex-shrink-0 rounded border border-border/50"
						style={{
							backgroundColor: HEX_REGEX.test(draft) ? draft : displayColor,
						}}
					/>
					<Input
						type="text"
						value={draft}
						onChange={(e) => handleInputChange(e.target.value)}
						placeholder="#0d9488"
						maxLength={7}
						className="h-7 flex-1 font-mono text-xs"
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}
