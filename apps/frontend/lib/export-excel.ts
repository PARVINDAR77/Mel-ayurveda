import * as XLSX from 'xlsx';

export interface ExcelColumnDef<T = any> {
  header: string;
  accessor: keyof T | string | ((item: T) => any);
  width?: number;
}

export interface ExportToExcelOptions<T = any> {
  data: T[];
  columns: ExcelColumnDef<T>[];
  fileName: string;
  sheetName?: string;
}

/**
 * Universal Excel (.xlsx) Exporter for Melayurveda CRM
 * Features:
 * - Generates clean native Microsoft Excel .xlsx workbooks
 * - Handles nested paths ('customer.fullName', 'order.orderNumber')
 * - Supports custom computed formatter functions
 * - Computes dynamic auto-column widths so text is never truncated
 * - Client-side download with zero server delay
 */
export function exportToExcel<T = any>({
  data,
  columns,
  fileName,
  sheetName = 'Melayurveda Export',
}: ExportToExcelOptions<T>): boolean {
  try {
    if (!data || data.length === 0) {
      alert('No data records available to export.');
      return false;
    }

    // 1. Transform objects into row arrays matching column definitions (supports identical header names like QUANITY)
    const headers = columns.map((col) => col.header);

    const dataRows = data.map((item) => {
      return columns.map((col) => {
        let value: any;

        if (typeof col.accessor === 'function') {
          try {
            value = col.accessor(item);
          } catch {
            value = '';
          }
        } else if (typeof col.accessor === 'string' && col.accessor.includes('.')) {
          // Resolve deep nested paths like 'customer.fullName'
          const parts = col.accessor.split('.');
          let current: any = item;
          for (const part of parts) {
            if (current === undefined || current === null) {
              current = '';
              break;
            }
            current = current[part];
          }
          value = current;
        } else {
          value = item[col.accessor as keyof T];
        }

        // Clean formatting for Excel cells
        if (value === null || value === undefined) {
          return '';
        } else if (value instanceof Date) {
          return value.toLocaleString('en-IN');
        } else if (typeof value === 'boolean') {
          return value ? 'YES' : 'NO';
        } else if (typeof value === 'object') {
          // If array of items (e.g. order items), format as readable comma string
          if (Array.isArray(value)) {
            return value
              .map((v) => (v?.name || v?.product?.name ? `${v.name || v.product.name} (x${v.quantity || 1})` : JSON.stringify(v)))
              .join('; ');
          } else {
            return JSON.stringify(value);
          }
        } else {
          return value;
        }
      });
    });

    // 2. Create Sheet from Array of Arrays (AOA) preserving all 27 distinct columns
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // 3. Calculate dynamic column widths (wch) based on cell lengths
    const colWidths = columns.map((col, colIdx) => {
      if (col.width) return { wch: col.width };

      let maxLen = (col.header || '').length;
      dataRows.forEach((row) => {
        const valStr = String(row[colIdx] ?? '');
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });

      // Clamp column width between 12 and 48 characters
      return { wch: Math.min(Math.max(maxLen + 3, 12), 48) };
    });

    worksheet['!cols'] = colWidths;

    // 4. Create Workbook and Append Sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31)); // Excel limits sheet name to 31 chars

    // 5. Trigger download with date stamp
    const dateStamp = new Date().toISOString().split('T')[0];
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(workbook, `${safeFileName}_${dateStamp}.xlsx`);

    return true;
  } catch (err: any) {
    console.error('Failed to export Excel file:', err);
    alert(`Export failed: ${err.message || 'Unknown error generating spreadsheet'}`);
    return false;
  }
}
