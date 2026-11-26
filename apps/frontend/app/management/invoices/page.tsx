'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Drawer } from '../../../components/ui/drawer';
import { Modal } from '../../../components/ui/modal';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import {
  FileText,
  RefreshCw,
  Search,
  PlusCircle,
  Eye,
  Printer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Building,
} from 'lucide-react';

export default function GSTInvoicingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Invoice Detail Drawer
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Generate Invoice Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [unInvoicedOrders, setUnInvoicedOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get('/invoices?limit=50');
      setInvoices(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const openInvoiceDetail = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/invoices/${invoiceId}`);
      setInvoiceDetail(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setSelectedInvoiceId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openGenerateModal = async () => {
    setIsGenerateModalOpen(true);
    setLoadingOrders(true);
    try {
      const res = await apiClient.get('/orders?status=CONFIRMED&limit=50');
      const orders = (res.data?.data || res.data || []).filter((o: any) => !o.invoice);
      setUnInvoicedOrders(orders);
      if (orders.length > 0) {
        setSelectedOrderId(orders[0].id);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;

    try {
      setIsGenerating(true);
      setError(null);
      const res = await apiClient.post(`/invoices/generate/${selectedOrderId}`, {});
      setSuccessMsg(`GST Tax Invoice ${res.data?.invoiceNumber} generated successfully.`);
      setIsGenerateModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice Number',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {item.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'orderNumber',
      header: 'Order Reference',
      render: (item) => (
        <span className="font-mono font-semibold text-slate-700 text-xs">
          {item.order?.orderNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Billed To',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.order?.customer?.fullName}</span>
          <span className="block font-mono text-[10px] text-slate-400">
            {item.order?.customer?.city || 'Gujarat'}, {item.order?.customer?.state || 'Gujarat'}
          </span>
        </div>
      ),
    },
    {
      key: 'supplyType',
      header: 'Supply Type',
      render: (item) => {
        const isIntraState = Number(item.cgstAmount) > 0 || Number(item.sgstAmount) > 0;
        return (
          <Badge variant={isIntraState ? 'info' : 'warning'}>
            {isIntraState ? 'Intra-State (Gujarat)' : 'Inter-State (IGST)'}
          </Badge>
        );
      },
    },
    {
      key: 'taxSplit',
      header: 'GST Breakdown',
      render: (item) => (
        <div className="text-xs font-mono">
          {Number(item.cgstAmount) > 0 ? (
            <div className="text-[11px] text-slate-600">
              <span>CGST: ₹{Number(item.cgstAmount).toLocaleString('en-IN')}</span> •{' '}
              <span>SGST: ₹{Number(item.sgstAmount).toLocaleString('en-IN')}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-600">
              IGST: ₹{Number(item.igstAmount).toLocaleString('en-IN')}
            </span>
          )}
          <span className="text-[10px] text-slate-400 block">
            Tax: ₹{Number(item.totalTax).toLocaleString('en-IN')}
          </span>
        </div>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Invoice Total',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          ₹{Number(item.grandTotal).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'issuedAt',
      header: 'Issued Date',
      render: (item) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(item.issuedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openInvoiceDetail(item.id)}
          icon={<Eye className="h-3 w-3" />}
        >
          View Tax Invoice
        </Button>
      ),
    },
  ];

  const invoicesExportColumns: ExcelColumnDef[] = [
    { header: 'GST Invoice #', accessor: 'invoiceNumber' },
    { header: 'Issued Date', accessor: (inv: any) => inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('en-IN') : '' },
    { header: 'Order Reference', accessor: 'order.orderNumber' },
    { header: 'Patient Name', accessor: 'order.customer.fullName' },
    { header: 'Contact Phone', accessor: 'order.customer.phoneNumber' },
    { header: 'City', accessor: 'order.customer.city' },
    { header: 'State', accessor: 'order.customer.state' },
    { header: 'Subtotal (₹)', accessor: (inv: any) => Number(inv.subtotal || 0) },
    { header: 'CGST (₹)', accessor: (inv: any) => Number(inv.cgstAmount || 0) },
    { header: 'SGST (₹)', accessor: (inv: any) => Number(inv.sgstAmount || 0) },
    { header: 'IGST (₹)', accessor: (inv: any) => Number(inv.igstAmount || 0) },
    { header: 'Total Tax (₹)', accessor: (inv: any) => Number(inv.totalTax || 0) },
    { header: 'Grand Total (₹)', accessor: (inv: any) => Number(inv.grandTotal || 0) },
    { header: 'Payment Mode', accessor: (inv: any) => inv.order?.paymentMode || 'COD' },
    { header: 'Status', accessor: 'status' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-forest-800 uppercase tracking-widest">
              MEL-MGT-001
            </span>
            <Badge variant="role">GST Tax Invoicing</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            GST Tax Invoicing & Statutory Compliance
          </h2>
          <p className="text-xs text-slate-500">
            Generate sequential GST invoices (`MEL-INV-YYYY-XXXXX`), compute CGST/SGST vs IGST automatically, and audit commercial liability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButton
            data={invoices}
            columns={invoicesExportColumns}
            fileName="Melayurveda_GST_Invoices"
            sheetName="Tax Invoices"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openGenerateModal}
            icon={<PlusCircle className="h-3.5 w-3.5" />}
          >
            Generate Tax Invoice
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Corporate GST Legal Banner */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Building className="h-5 w-5 text-forest-700 shrink-0" />
          <div>
            <span className="font-bold text-slate-900">MELAYURVEDA INDIA PVT. LTD.</span>
            <span className="block text-slate-500 font-mono text-[11px]">
              GSTIN: 24AABCM1234F1Z5 • State: Gujarat (Code 24) • HSN Chapter 3004
            </span>
          </div>
        </div>
        <Badge variant="success">Statutory Compliant</Badge>
      </div>

      {/* Invoices DataTable */}
      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        emptyMessage="No GST tax invoices issued yet."
        exportConfig={{
          fileName: 'Melayurveda_GST_Invoices',
          sheetName: 'Tax Invoices',
          columns: invoicesExportColumns,
        }}
      />

      {/* Professional Tax Invoice View Drawer */}
      <Drawer
        isOpen={!!selectedInvoiceId}
        onClose={() => {
          setSelectedInvoiceId(null);
          setInvoiceDetail(null);
        }}
        title="Official Tax Invoice (GST Format)"
        width="lg"
      >
        {loadingDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading tax invoice...</div>
        ) : !invoiceDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Invoice not found</div>
        ) : (
          <div className="space-y-6 text-xs text-slate-700 border border-slate-200 bg-white p-5 rounded-lg shadow-sm">
            {/* Invoice Top Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-black tracking-wider text-forest-800 uppercase">
                  MELAYURVEDA INDIA PVT. LTD.
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Corporate HQ: 101 Ayurveda Bhavan, S.G. Highway, Ahmedabad, Gujarat - 380054
                </p>
                <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                  <strong>GSTIN:</strong> 24AABCM1234F1Z5 | <strong>State:</strong> Gujarat (24)
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded block">
                  {invoiceDetail.invoiceNumber}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono mt-1">
                  Issued: {new Date(invoiceDetail.issuedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Bill To & Ship To */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4 text-xs">
              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                  Bill To / Customer:
                </span>
                <p className="font-semibold text-slate-900">{invoiceDetail.order?.customer?.fullName}</p>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                  Phone: {invoiceDetail.order?.customer?.phoneNumber}
                </p>
                <p className="text-slate-500 mt-0.5">
                  {[
                    invoiceDetail.order?.customer?.deliveryAddress,
                    invoiceDetail.order?.customer?.city,
                    invoiceDetail.order?.customer?.state,
                    invoiceDetail.order?.customer?.pincode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                  Invoice Details:
                </span>
                <p className="font-mono text-slate-800">Order: {invoiceDetail.order?.orderNumber}</p>
                <p className="font-mono text-slate-800">Payment: {invoiceDetail.order?.paymentMode}</p>
                <p className="text-slate-800">
                  Place of Supply: <strong>{invoiceDetail.order?.customer?.state || 'Gujarat'}</strong>
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-2">Description</th>
                    <th className="p-2 font-mono">HSN</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Rate (₹)</th>
                    <th className="p-2 text-right">Taxable (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceDetail.order?.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="p-2 font-medium text-slate-900">{it.product?.name}</td>
                      <td className="p-2 font-mono text-slate-500">3004.90</td>
                      <td className="p-2 text-center font-mono">{it.quantity}</td>
                      <td className="p-2 text-right font-mono">
                        {Number(it.unitPrice).toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono font-medium">
                        {Number(it.totalPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Statutory Tax Summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    ₹{(Number(invoiceDetail.grandTotal) - Number(invoiceDetail.totalTax)).toFixed(2)}
                  </span>
                </div>

                {Number(invoiceDetail.cgstAmount) > 0 ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (6%):</span>
                      <span className="font-mono">₹{Number(invoiceDetail.cgstAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (6%):</span>
                      <span className="font-mono">₹{Number(invoiceDetail.sgstAmount).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST (12%):</span>
                    <span className="font-mono">₹{Number(invoiceDetail.igstAmount).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-forest-800">
                    ₹{Number(invoiceDetail.grandTotal).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center">
              This is a computer-generated GST tax invoice issued under Rule 48 of CGST Rules, 2017.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedInvoiceId(null);
                  setInvoiceDetail(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                icon={<Printer className="h-3.5 w-3.5" />}
              >
                Print Invoice
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Generate Tax Invoice Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate Official GST Tax Invoice"
        description="Select a CONFIRMED formulation order to calculate CGST/SGST vs IGST tax liabilities."
        maxWidth="md"
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4 text-xs">
          {loadingOrders ? (
            <div className="py-6 text-center text-slate-400">Loading confirmed orders...</div>
          ) : unInvoicedOrders.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-amber-800">
              No uninvoiced confirmed orders found. All active orders possess valid tax invoices.
            </div>
          ) : (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Confirmed Order *
                </label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                >
                  {unInvoicedOrders.map((ord: any) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.orderNumber} - {ord.customer?.fullName} (₹{ord.totalAmount}) •{' '}
                      {ord.customer?.state || 'Gujarat'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-[11px] text-indigo-900">
                <strong>Automatic Tax Bifurcation:</strong> If the destination state is Gujarat,
                CGST (50%) and SGST (50%) will be charged. If outside Gujarat, 100% IGST will be applied.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGenerateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isGenerating}>
                  Generate Invoice
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
