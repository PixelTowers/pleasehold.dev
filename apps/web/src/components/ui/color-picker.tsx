// ABOUTME: Popover-based color picker with preset swatch grid and custom hex input.
// ABOUTME: Controlled component accepting value/onChange for use in forms and settings.

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
	{ hex: '#0d9488', label: 'Teal' },
	{ hex: '#5e6ad2', label: 'Indigo' },
	{ hex: '#e11d48', label: 'Rose' },
	{ hex: '#ea580c', label: 'Orange' },
	{ hex: '#16a34a', label: 'Green' },
	{ hex: '#2563eb', label: 'Blue' },
	{ hex: '#9333ea', label: 'Purple' },
	{ hex: '#0891b2', label: 'Cyan' },
	{ hex: '#d97706', label: 'Amber' },
	{ hex: '#64748b', label: 'Slate' },
] as const;

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

interface ColorPickerProps {
	value: string;
	onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
	const [draft, setDraft] = useState(value);
	const [open, setOpen] = useState(false);

	const isValidHex = HEX_REGEX.test(value);
	const displayColor = isValidHex ? value : '#0d9488';

	const handleSwatchClick = (hex: string) => {
		setDraft(hex);
		onChange(hex);
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
					className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent"
				>
					<span
						className="h-5 w-5 flex-shrink-0 rounded-full border border-border/50"
						style={{ backgroundColor: displayColor }}
					/>
					<span className="font-mono text-xs text-muted-foreground">{value || '#0d9488'}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-64 p-3">
				<div className="mb-3 grid grid-cols-5 gap-2">
					{PRESET_COLORS.map((preset) => (
						<button
							key={preset.hex}
							type="button"
							title={preset.label}
							onClick={() => handleSwatchClick(preset.hex)}
							className={cn(
								'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
								value === preset.hex ? 'border-foreground' : 'border-transparent',
							)}
						>
							<span className="h-6 w-6 rounded-full" style={{ backgroundColor: preset.hex }} />
						</button>
					))}
				</div>
				<div className="flex items-center gap-2">
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
