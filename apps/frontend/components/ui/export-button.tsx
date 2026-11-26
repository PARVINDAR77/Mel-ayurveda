'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import { Button } from './button';
import { exportToExcel, ExcelColumnDef } from '../../lib/export-excel';

interface ExportButtonProps<T = any> {
  data: T[];
  columns: ExcelColumnDef<T>[];
  fileName: string;
  sheetName?: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

export function ExportButton<T = any>({
  data,
  columns,
  fileName,
  sheetName,
  label = 'Export to Excel',
  size = 'sm',
  className = '',
  disabled = false,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportToExcel({
        data,
        columns,
        fileName,
        sheetName,
      });
    } finally {
      setTimeout(() => setIsExporting(false), 400);
    }
  };

  const count = data?.length || 0;

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleExport}
      disabled={disabled || count === 0 || isExporting}
      isLoading={isExporting}
      icon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />}
      className={`border-emerald-300 text-emerald-900 bg-emerald-50/50 hover:bg-emerald-100/70 font-bold transition shadow-2xs cursor-pointer ${className}`}
      title={`Export ${count} record${count === 1 ? '' : 's'} as Microsoft Excel (.xlsx)`}
    >
      <span>{label}</span>
      {count > 0 && (
        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.2 rounded-full border border-emerald-200">
          {count}
        </span>
      )}
    </Button>
  );
}
