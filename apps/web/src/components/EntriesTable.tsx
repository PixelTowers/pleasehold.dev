// ABOUTME: Headless TanStack Table wrapper for entry data with column definitions and pagination controls.
// ABOUTME: Uses manual pagination mode with entry UUID row IDs to prevent stale selection across page changes.

import { useState } from 'react';
import {
	type ColumnDef,
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { EntryStatusBadge } from './EntryStatusBadge';

interface Entry {
	id: string;
	email: string;
	name: string | null;
	status: string;
	position: number;
	createdAt: Date;
}

interface EntriesTableProps {
	data: Entry[];
	total: number;
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	rowSelection: RowSelectionState;
	onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
	onEntryClick: (entryId: string) => void;
}

const columns: ColumnDef<Entry, unknown>[] = [
	{
		id: 'select',
		header: ({ table }) => (
			<input
				type="checkbox"
				checked={table.getIsAllPageRowsSelected()}
				onChange={table.getToggleAllPageRowsSelectedHandler()}
			/>
		),
		cell: ({ row }) => (
			<input
				type="checkbox"
				checked={row.getIsSelected()}
				onChange={row.getToggleSelectedHandler()}
			/>
		),
		size: 40,
	},
	{
		accessorKey: 'email',
		header: 'Email',
	},
	{
		accessorKey: 'name',
		header: 'Name',
		cell: ({ getValue }) => {
			const value = getValue() as string | null;
			return value ?? '\u2014';
		},
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ getValue }) => <EntryStatusBadge status={getValue() as string} />,
	},
	{
		accessorKey: 'position',
		header: '#',
	},
	{
		accessorKey: 'createdAt',
		header: 'Submitted',
		cell: ({ getValue }) => {
			const value = getValue() as Date | string;
			const date = value instanceof Date ? value : new Date(value);
			return date.toLocaleDateString();
		},
	},
];

const headerCellStyle: React.CSSProperties = {
	padding: '0.5rem 0.75rem',
	textAlign: 'left',
	fontWeight: 500,
	borderBottom: '2px solid #e5e7eb',
	color: '#6b7280',
	fontSize: '0.75rem',
	textTransform: 'uppercase',
	letterSpacing: '0.05em',
};

const cellStyle: React.CSSProperties = {
	padding: '0.5rem 0.75rem',
	borderBottom: '1px solid #f3f4f6',
};

const paginationStyle: React.CSSProperties = {
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	padding: '0.75rem 0',
	fontSize: '0.875rem',
	color: '#6b7280',
};

const pageButtonStyle: React.CSSProperties = {
	padding: '0.25rem 0.75rem',
	border: '1px solid #d1d5db',
	borderRadius: '0.25rem',
	backgroundColor: '#fff',
	fontSize: '0.875rem',
	cursor: 'pointer',
};

const pageButtonDisabledStyle: React.CSSProperties = {
	...pageButtonStyle,
	opacity: 0.5,
	cursor: 'not-allowed',
};

export function EntriesTable({
	data,
	total,
	page,
	pageSize,
	onPageChange,
	rowSelection,
	onRowSelectionChange,
	onEntryClick,
}: EntriesTableProps) {
	const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
	const totalPages = Math.ceil(total / pageSize);

	const table = useReactTable({
		data,
		columns,
		pageCount: totalPages,
		state: {
			rowSelection,
			pagination: { pageIndex: page - 1, pageSize },
		},
		onRowSelectionChange,
		manualPagination: true,
		getCoreRowModel: getCoreRowModel(),
		enableRowSelection: true,
		getRowId: (row) => row.id,
	});

	const startEntry = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const endEntry = Math.min(page * pageSize, total);

	return (
		<div>
			<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th key={header.id} style={headerCellStyle}>
									{header.isPlaceholder
										? null
										: flexRender(header.column.columnDef.header, header.getContext())}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.length === 0 ? (
						<tr>
							<td
								colSpan={columns.length}
								style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}
							>
								No entries found
							</td>
						</tr>
					) : (
						table.getRowModel().rows.map((row) => (
							<tr
								key={row.id}
								style={{
									backgroundColor: hoveredRowId === row.id ? '#f9fafb' : 'transparent',
									cursor: 'pointer',
								}}
								onMouseEnter={() => setHoveredRowId(row.id)}
								onMouseLeave={() => setHoveredRowId(null)}
								onClick={(e) => {
									const target = e.target as HTMLElement;
									if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
										return;
									}
									onEntryClick(row.original.id);
								}}
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} style={cellStyle}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>

			{/* Pagination controls */}
			<div style={paginationStyle}>
				<span>
					Showing {startEntry} to {endEntry} of {total} entries
				</span>
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
					<button
						type="button"
						style={page <= 1 ? pageButtonDisabledStyle : pageButtonStyle}
						disabled={page <= 1}
						onClick={() => onPageChange(page - 1)}
					>
						Previous
					</button>
					<span>
						Page {page} of {totalPages || 1}
					</span>
					<button
						type="button"
						style={page >= totalPages ? pageButtonDisabledStyle : pageButtonStyle}
						disabled={page >= totalPages}
						onClick={() => onPageChange(page + 1)}
					>
						Next
					</button>
				</div>
			</div>
		</div>
	);
}
