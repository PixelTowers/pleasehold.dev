// ABOUTME: Button that fetches all project entries via tRPC export procedure and triggers a CSV download.
// ABOUTME: Generates RFC 4180-compliant CSV with UTF-8 BOM and field-config-aware column headers.

import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

interface CsvExportButtonProps {
	projectId: string;
	projectName: string;
}

interface FieldConfig {
	collectName: boolean;
	collectCompany: boolean;
	collectMessage: boolean;
}

interface ExportEntry {
	email: string;
	name: string | null;
	company: string | null;
	message: string | null;
	status: string;
	position: number;
	createdAt: Date;
	metadata: Record<string, unknown> | null;
}

function escapeField(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}
	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function generateCsv(exportEntries: ExportEntry[], fieldConfig: FieldConfig): string {
	const BOM = '\uFEFF';

	const headers: string[] = ['Email'];
	if (fieldConfig.collectName) {
		headers.push('Name');
	}
	if (fieldConfig.collectCompany) {
		headers.push('Company');
	}
	headers.push('Status', 'Position', 'Submitted');
	if (fieldConfig.collectMessage) {
		headers.push('Message');
	}
	headers.push('Metadata');

	const rows = exportEntries.map((entry) => {
		const row: string[] = [escapeField(entry.email)];
		if (fieldConfig.collectName) {
			row.push(escapeField(entry.name));
		}
		if (fieldConfig.collectCompany) {
			row.push(escapeField(entry.company));
		}
		row.push(
			escapeField(entry.status),
			escapeField(entry.position),
			escapeField(
				entry.createdAt instanceof Date ? entry.createdAt.toISOString() : String(entry.createdAt),
			),
		);
		if (fieldConfig.collectMessage) {
			row.push(escapeField(entry.message));
		}
		row.push(escapeField(entry.metadata ? JSON.stringify(entry.metadata) : null));
		return row.join(',');
	});

	return `${BOM}${headers.join(',')}\r\n${rows.join('\r\n')}`;
}

function downloadCsv(csvString: string, filename: string) {
	const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.style.display = 'none';
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

export function CsvExportButton({ projectId, projectName }: CsvExportButtonProps) {
	const [isExporting, setIsExporting] = useState(false);
	const utils = trpc.useUtils();

	async function handleExport() {
		setIsExporting(true);
		try {
			const data = await utils.entry.export.fetch({ projectId });
			const csv = generateCsv(data.entries as ExportEntry[], data.fieldConfig);
			const date = new Date().toISOString().split('T')[0];
			const safeName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-');
			downloadCsv(csv, `${safeName}-entries-${date}.csv`);
		} finally {
			setIsExporting(false);
		}
	}

	return (
		<Button variant="outline" size="sm" disabled={isExporting} onClick={handleExport}>
			<Download className="mr-1.5 h-4 w-4" />
			{isExporting ? 'Exporting...' : 'Export CSV'}
		</Button>
	);
}
