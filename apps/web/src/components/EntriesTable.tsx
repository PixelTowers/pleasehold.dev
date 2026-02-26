// ABOUTME: Headless TanStack Table wrapper for entry data with column definitions and pagination controls.
// ABOUTME: Uses manual pagination mode with entry UUID row IDs to prevent stale selection across page changes.

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type RowSelectionState,
	useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
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
				className="h-4 w-4 rounded border-gray-300"
			/>
		),
		cell: ({ row }) => (
			<input
				type="checkbox"
				checked={row.getIsSelected()}
				onChange={row.getToggleSelectedHandler()}
				className="h-4 w-4 rounded border-gray-300"
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
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									className="text-xs font-medium uppercase tracking-wider text-muted"
								>
									{header.isPlaceholder
										? null
										: flexRender(header.column.columnDef.header, header.getContext())}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="py-8 text-center text-muted-foreground"
							>
								No entries found
							</TableCell>
						</TableRow>
					) : (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								className="cursor-pointer hover:bg-accent"
								onClick={(e) => {
									const target = e.target as HTMLElement;
									if (
										target.tagName === 'INPUT' &&
										(target as HTMLInputElement).type === 'checkbox'
									) {
										return;
									}
									onEntryClick(row.original.id);
								}}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>

			{/* Pagination controls */}
			<div className="flex items-center justify-between px-3 py-3 text-sm text-muted">
				<span>
					Showing {startEntry} to {endEntry} of {total} entries
				</span>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="h-7"
						disabled={page <= 1}
						onClick={() => onPageChange(page - 1)}
					>
						Previous
					</Button>
					<span>
						Page {page} of {totalPages || 1}
					</span>
					<Button
						variant="outline"
						size="sm"
						className="h-7"
						disabled={page >= totalPages}
						onClick={() => onPageChange(page + 1)}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
