'use client';

import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { clsx } from 'clsx';
import { Input } from './input';
import { Button } from './button';
import { ExcelColumnDef } from '../../lib/export-excel';
import { ExportButton } from './export-button';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableExportConfig<T = any> {
  fileName: string;
  sheetName?: string;
  columns?: ExcelColumnDef<T>[];
  label?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKey?: keyof T | string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  pageSize?: number;
  totalRecords?: number;
  exportConfig?: DataTableExportConfig<T>;
  actions?: React.ReactNode;
  hideToolbar?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search records...',
  isLoading = false,
  emptyMessage = 'No records found',
  onRowClick,
  pageSize = 10,
  exportConfig,
  actions,
  hideToolbar = false,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term & date matching across all records
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase().trim();
    return data.filter((item) => {
      // 1. Check primary searchKey
      if (searchKey) {
        const val = item[searchKey as string];
        if (val !== undefined && val !== null && String(val).toLowerCase().includes(term)) {
          return true;
        }
      }
      // 2. Check any standard timestamp / date fields on the item
      const dateFields = [
        'createdAt',
        'updatedAt',
        'issuedAt',
        'calledAt',
        'scheduledTime',
        'orderDate',
        'date',
        'created_at',
      ];
      for (const df of dateFields) {
        const dVal = item[df];
        if (dVal) {
          const d = new Date(dVal);
          if (!isNaN(d.getTime())) {
            const iso = d.toISOString().split('T')[0]; // 2026-11-27
            const enIn = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase(); // 27 nov 2026
            const numSlash = d.toLocaleDateString('en-IN').toLowerCase(); // 27/11/2026
            const monthName = d.toLocaleDateString('en-US', { month: 'long' }).toLowerCase(); // november
            const shortMonth = d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase(); // nov
            if (
              iso.includes(term) ||
              enIn.includes(term) ||
              numSlash.includes(term) ||
              monthName.includes(term) ||
              shortMonth.includes(term)
            ) {
              return true;
            }
          }
        }
      }
      return false;
    });
  }, [data, searchTerm, searchKey]);

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="w-full space-y-3">
      {!hideToolbar && (searchKey || exportConfig || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-sm">
            {searchKey && (
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                leftIcon={<Search className="h-4 w-4" />}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {actions}
            {exportConfig && (
              <ExportButton
                data={filteredData}
                fileName={exportConfig.fileName}
                sheetName={exportConfig.sheetName}
                label={exportConfig.label || 'Export to Excel'}
                columns={
                  exportConfig.columns ||
                  columns.map((c) => ({
                    header: c.header,
                    accessor: c.key,
                  }))
                }
              />
            )}
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredData.length} entries
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3.5 ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest-800 border-t-transparent" />
                      <span className="text-xs">Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="h-8 w-8 stroke-[1.25] text-slate-300" />
                      <span className="text-sm font-medium text-slate-500">{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, rowIdx) => (
                  <tr
                    key={item.id || rowIdx}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={clsx(
                      'transition hover:bg-slate-50/80',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                        {col.render ? col.render(item) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <span className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-700">{currentPage}</span> of{' '}
              <span className="font-semibold text-slate-700">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                icon={<ChevronLeft className="h-3.5 w-3.5" />}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                icon={<ChevronRight className="h-3.5 w-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
