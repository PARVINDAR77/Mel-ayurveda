'use client';

import React, { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Modal } from './modal';
import { Button } from './button';
import { Badge } from './badge';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { exportToExcel } from '../../lib/export-excel';
import {
  OFFICIAL_SALES_ORDERS_EXPORT_COLUMNS,
  OFFICIAL_SALES_LEADS_EXPORT_COLUMNS,
} from '../../lib/official-sales-export';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  ArrowRight,
  Database,
  Layers,
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'orders' | 'leads';
  title?: string;
  onSuccess?: () => void;
}

export function ImportModal({
  isOpen,
  onClose,
  mode = 'orders',
  title,
  onSuccess,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    total: number;
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setIsParsing(false);
    setIsSubmitting(false);
    setError(null);
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Download official 27-column sample template
  const handleDownloadTemplate = async () => {
    const isOrders = mode === 'orders';
    const sampleData = isOrders
      ? [
          {
            customer: {
              fullName: 'Rajubhai Patel',
              phoneNumber: '9104882237',
              alternatePhone: '9104882737',
              address: 'Shop 4, Dholka Market, Dholka',
              pincode: '382225',
              city: 'Dholka',
              state: 'Gujarat',
              convertedFrom: { sourceType: 'FACEBOOK_ADS', productInterest: 'Joint Pain' },
            },
            orderNumber: 'MEL-ORD-2026-00101',
            createdAt: new Date().toISOString(),
            paymentMode: 'CASH_ON_DELIVERY',
            orderStatus: 'DELIVERED',
            totalAmount: 2350,
            createdBy: { firstName: 'Ramesh', lastName: 'Patel', employeeCode: 'MEL-SAL-001' },
            items: [
              { product: { name: 'Amrit Plus Tablets', targetDisease: 'Joint Pain' }, quantity: 1 },
              { product: { name: 'H.M Horse Taila', targetDisease: 'Joint Pain' }, quantity: 1 },
            ],
          },
        ]
      : [
          {
            customerName: 'Kailashben Dave',
            phoneNumber: '9825077823',
            alternatePhone: '9826175756',
            address: 'B-201, Green City, Satellite',
            pincode: '380015',
            city: 'Ahmedabad',
            state: 'Gujarat',
            sourceType: 'GOOGLE_ADS',
            primaryAilment: 'Arthritis & Joint Stiffness',
            productInterest: 'Artho Amrit Tablets',
            status: 'NEW',
            createdAt: new Date().toISOString(),
            estimatedValue: 1850,
            assignedTo: { firstName: 'Suresh', lastName: 'Kumar', employeeCode: 'MEL-SAL-002' },
          },
        ];

    await exportToExcel({
      data: sampleData,
      columns: isOrders ? OFFICIAL_SALES_ORDERS_EXPORT_COLUMNS : OFFICIAL_SALES_LEADS_EXPORT_COLUMNS,
      fileName: `Melayurveda_Sample_${isOrders ? 'Orders' : 'Leads'}_Template`,
      sheetName: isOrders ? 'Orders Template' : 'Leads Template',
    });
  };

  // Parse uploaded Excel file in browser
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setError(null);
    setImportResult(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet || worksheet.rowCount < 2) {
        throw new Error('Spreadsheet has no rows or is empty.');
      }

      // Read header row
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell) => {
        headers.push(String(cell.value || '').trim());
      });

      const rows: any[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const getCellVal = (colIdx: number) => {
          const c = row.getCell(colIdx);
          if (!c || c.value === null || c.value === undefined) return '';
          if (typeof c.value === 'object' && 'result' in (c.value as any)) {
            return String((c.value as any).result || '');
          }
          if (typeof c.value === 'object' && 'text' in (c.value as any)) {
            return String((c.value as any).text || '');
          }
          return String(c.value).trim();
        };

        if (mode === 'orders') {
          // Map 27 columns matching the template
          const sourceOfLead = getCellVal(1);
          const paymentMode = getCellVal(2);
          const status = getCellVal(3);
          const orderId = getCellVal(4);
          const date = getCellVal(5);
          const agent = getCellVal(6);
          const customerName = getCellVal(7);
          const mobile = getCellVal(8);
          const alternateMobile = getCellVal(9);
          const address = getCellVal(10);
          const pincode = getCellVal(11);
          const city = getCellVal(12);
          const state = getCellVal(13);
          const disease = getCellVal(14);
          const amount = Number(getCellVal(15).replace(/[^0-9.]/g, '')) || 0;

          // Products 1 through 6
          const products: Array<{ name: string; quantity: number }> = [];
          for (let p = 0; p < 6; p++) {
            const prodNameCol = 16 + p * 2;
            const prodQtyCol = 17 + p * 2;
            const pName = getCellVal(prodNameCol);
            const pQty = parseInt(getCellVal(prodQtyCol), 10) || 1;
            if (pName) {
              products.push({ name: pName, quantity: pQty });
            }
          }

          if (mobile || customerName) {
            rows.push({
              sourceOfLead,
              paymentMode,
              status,
              orderId,
              date,
              agent,
              customerName,
              mobile,
              alternateMobile,
              address,
              pincode,
              city,
              state,
              disease,
              amount,
              products,
              isValid: Boolean(mobile && mobile.replace(/[^0-9]/g, '').length >= 8),
            });
          }
        } else {
          // Map Leads
          const sourceOfLead = getCellVal(1);
          const paymentMode = getCellVal(2);
          const status = getCellVal(3);
          const leadCode = getCellVal(4);
          const date = getCellVal(5);
          const agent = getCellVal(6);
          const customerName = getCellVal(7);
          const mobile = getCellVal(8);
          const alternateMobile = getCellVal(9);
          const address = getCellVal(10);
          const pincode = getCellVal(11);
          const city = getCellVal(12);
          const state = getCellVal(13);
          const disease = getCellVal(14);
          const amount = Number(getCellVal(15).replace(/[^0-9.]/g, '')) || 0;
          const productInterest = getCellVal(16);

          if (mobile || customerName) {
            rows.push({
              sourceOfLead,
              paymentMode,
              status,
              leadCode,
              date,
              agent,
              customerName,
              mobile,
              alternateMobile,
              address,
              pincode,
              city,
              state,
              disease,
              amount,
              productInterest: productInterest || disease,
              isValid: Boolean(mobile && mobile.replace(/[^0-9]/g, '').length >= 8),
            });
          }
        }
      });

      if (rows.length === 0) {
        throw new Error('No valid records found in the spreadsheet. Please ensure phone numbers and names are filled.');
      }

      setParsedRows(rows);
    } catch (err: any) {
      console.error('File parse error:', err);
      setError(err.message || 'Failed to read spreadsheet file');
      setFile(null);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Submit parsed data to backend API
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = mode === 'orders' ? '/orders/bulk-import' : '/leads/bulk-import';
      const payload = mode === 'orders' ? { orders: parsedRows } : { leads: parsedRows };

      const res = await apiClient.post(endpoint, payload);
      setImportResult(res.data);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title || `Bulk Import Historical ${mode === 'orders' ? 'Orders' : 'Leads'} from Excel`}
      description="Upload your Excel (.xlsx, .xls) spreadsheet to import legacy records directly into the CRM database."
      maxWidth="2xl"
    >
      <div className="space-y-5 text-sm">
        {/* Top Instructions & Sample Template Banner */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sky-950">Official 27-Column Format Compatible</div>
              <div className="text-xs text-sky-800 mt-0.5">
                Upload your historical order book or sales lead records. Columns, products, agents, and dates will be mapped automatically.
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            icon={<Download className="h-3.5 w-3.5 text-sky-800" />}
            className="border-sky-300 text-sky-900 bg-white hover:bg-sky-100 font-bold shrink-0 cursor-pointer shadow-2xs"
          >
            Download Sample Format
          </Button>
        </div>

        {/* File Dropzone */}
        {!file && !importResult && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="h-12 w-12 rounded-full bg-emerald-100/80 group-hover:bg-emerald-200/80 flex items-center justify-center text-emerald-800 transition shadow-xs">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="font-bold text-slate-800 text-base">Click to select or drag & drop Excel spreadsheet</div>
            <div className="text-xs text-slate-500">Supports native Microsoft Excel .xlsx, .xls, and .csv files</div>
          </div>
        )}

        {/* Parsing Loader */}
        {isParsing && (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
            <div className="font-bold text-slate-800">Reading and validating spreadsheet...</div>
            <div className="text-xs text-slate-500 mt-1">Inspecting 27 columns, products, and contact numbers</div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Data Preview Table */}
        {parsedRows.length > 0 && !importResult && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/80 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">File: {file?.name}</span>
                <Badge variant="slate" className="font-bold bg-white text-slate-700">
                  {parsedRows.length} Rows Detected
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {validCount} Ready to Import
                </span>
                {invalidCount > 0 && (
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {invalidCount} Missing Phone
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetState}
                  className="text-red-600 hover:text-red-800 font-bold ml-2 text-xs cursor-pointer"
                >
                  Clear File
                </button>
              </div>
            </div>

            {/* Compact Preview Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Customer</th>
                    <th className="p-2">Mobile</th>
                    <th className="p-2">Location</th>
                    <th className="p-2">{mode === 'orders' ? 'Amount (₹)' : 'Ailment'}</th>
                    <th className="p-2">{mode === 'orders' ? 'Items' : 'Source'}</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.slice(0, 8).map((row, idx) => (
                    <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/40 text-red-900'}>
                      <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-bold text-slate-900">{row.customerName || 'N/A'}</td>
                      <td className="p-2 font-mono">{row.mobile || '—'}</td>
                      <td className="p-2 text-slate-600">
                        {row.city || row.state ? `${row.city || ''}, ${row.state || ''}` : '—'}
                      </td>
                      <td className="p-2 font-mono font-bold">
                        {mode === 'orders' ? `₹${row.amount || 0}` : (row.disease || row.productInterest || 'General')}
                      </td>
                      <td className="p-2 text-slate-600">
                        {mode === 'orders'
                          ? row.products?.map((p: any) => `${p.name} (x${p.quantity})`).join(', ') || '1 Item'
                          : row.sourceOfLead || 'Inbound'}
                      </td>
                      <td className="p-2">
                        {row.isValid ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200">
                            Ready
                          </span>
                        ) : (
                          <span className="text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded text-[10px] border border-red-200">
                            Invalid Phone
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 8 && (
              <div className="text-[11px] text-slate-500 text-center font-medium">
                ...and {parsedRows.length - 8} more records will be processed.
              </div>
            )}
          </div>
        )}

        {/* Import Results Screen */}
        {importResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
              <span>Import Completed Successfully!</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <div className="text-xl font-black text-slate-900">{importResult.total}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Total Rows</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <div className="text-xl font-black text-emerald-600">{importResult.imported}</div>
                <div className="text-[10px] uppercase font-bold text-emerald-700">Imported</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <div className="text-xl font-black text-amber-600">{importResult.skipped}</div>
                <div className="text-[10px] uppercase font-bold text-amber-700">Skipped/Duplicate</div>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="bg-white/80 p-2.5 rounded border border-amber-200 text-xs text-amber-900 max-h-24 overflow-y-auto space-y-0.5">
                <div className="font-bold">Skipped Items Note:</div>
                {importResult.errors.map((err, i) => (
                  <div key={i} className="text-[11px] text-amber-800">
                    • {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>

          {!importResult && parsedRows.length > 0 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmImport}
              isLoading={isSubmitting}
              disabled={validCount === 0 || isSubmitting}
              icon={<Database className="h-4 w-4" />}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
            >
              Import {validCount} Records to Database
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
