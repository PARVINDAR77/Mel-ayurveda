import ExcelJS from 'exceljs';

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
 * - Generates clean native Microsoft Excel .xlsx workbooks using ExcelJS
 * - Exact official theme styling (Office Blue header fill #4F81BD, bold font, light cell borders)
 * - Supports duplicate header names (e.g. repeated 'QUANITY' columns)
 * - Handles nested paths ('customer.fullName', 'order.orderNumber')
 * - Supports custom computed formatter functions
 * - Client-side download with zero server delay
 */
export async function exportToExcel<T = any>({
  data,
  columns,
  fileName,
  sheetName = 'Sales Export',
}: ExportToExcelOptions<T>): Promise<boolean> {
  try {
    if (!data || data.length === 0) {
      alert('No data records available to export.');
      return false;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Melayurveda CRM';
    workbook.lastModifiedBy = 'Melayurveda System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const cleanSheetName = (sheetName || 'Sheet1').replace(/[*?:/\\\[\]]/g, '').substring(0, 31);
    const worksheet = workbook.addWorksheet(cleanSheetName, {
      views: [{ showGridLines: true }],
    });

    // 1. Setup Columns with precise widths
    worksheet.columns = columns.map((col, idx) => ({
      header: col.header,
      key: `col_${idx}`,
      width: col.width || Math.min(Math.max((col.header || '').length + 4, 14), 45),
    }));

    // 2. Transform objects into row value arrays matching column definitions
    data.forEach((item) => {
      const rowValues = columns.map((col) => {
        let value: any;

        if (typeof col.accessor === 'function') {
          try {
            value = col.accessor(item);
          } catch {
            value = '';
          }
        } else if (typeof col.accessor === 'string' && col.accessor.includes('.')) {
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

        // Formatting
        if (value === null || value === undefined) {
          return '';
        } else if (value instanceof Date) {
          const d = value;
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        } else if (typeof value === 'boolean') {
          return value ? 'YES' : 'NO';
        } else if (typeof value === 'object') {
          if (Array.isArray(value)) {
            return value
              .map((v) => (v?.name || v?.product?.name ? `${v.name || v.product.name} (x${v.quantity || 1})` : JSON.stringify(v)))
              .join('; ');
          } else {
            return JSON.stringify(value);
          }
        }
        return value;
      });

      worksheet.addRow(rowValues);
    });

    // 3. Style Header Row (Row 1) - Exact Match to Official Template
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30; // Prominent header row height

    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      // Official Accent Blue background fill
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }, // Exact Excel Template Theme Blue (#4F81BD)
      };
      // Crisp bold typography
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FF000000' }, // Bold black text
      };
      // Centered alignment with text wrapping
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      // Distinct cell grid borders
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1F497D' } },
        left: { style: 'thin', color: { argb: 'FF1F497D' } },
        bottom: { style: 'medium', color: { argb: 'FF1F497D' } },
        right: { style: 'thin', color: { argb: 'FF1F497D' } },
      };
    });

    // 4. Style Data Rows (Row 2 onwards) with thin borders and readable alignment
    const rowCount = worksheet.rowCount;
    for (let r = 2; r <= rowCount; r++) {
      const dataRow = worksheet.getRow(r);
      dataRow.height = 22;
      dataRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = {
          name: 'Calibri',
          size: 10,
          color: { argb: 'FF1A202C' },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: typeof cell.value === 'number' ? 'right' : 'left',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
      });
    }

    // 5. Generate buffer and trigger client download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const dateStamp = new Date().toISOString().split('T')[0];
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName}_${dateStamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);

    return true;
  } catch (err: any) {
    console.error('Failed to export Excel file with ExcelJS:', err);
    alert(`Export failed: ${err.message || 'Unknown error generating spreadsheet'}`);
    return false;
  }
}
