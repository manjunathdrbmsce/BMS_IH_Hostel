'use client';

import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Skeleton } from './skeleton';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  loadingRows?: number;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  loadingRows = 8,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  rowKey,
  emptyMessage = 'No data found',
  className,
}: DataTableProps<T>) {
  const getSortIcon = (key: string) => {
    if (sortKey !== key)
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    if (sortDir === 'asc')
      return <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />;
    return <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />;
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                  col.sortable && onSort ? 'cursor-pointer select-none hover:text-gray-700' : '',
                  col.headerClassName,
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  {col.sortable && onSort && getSortIcon(col.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading
            ? Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <Skeleton className="h-5 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            : data.length === 0
              ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-gray-500 text-sm"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )
              : data.map((row, index) => (
                <tr
                  key={rowKey ? rowKey(row) : index}
                  className={cn(
                    'hover:bg-gray-50/60 transition',
                    onRowClick ? 'cursor-pointer' : '',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3.5 text-sm', col.className)}>
                      {col.render
                        ? col.render(row, index)
                        : (row as Record<string, unknown>)[col.key]?.toString() ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
