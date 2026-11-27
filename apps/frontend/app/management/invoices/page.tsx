'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Drawer } from '../../../components/ui/drawer';
import { Modal } from '../../../components/ui/modal';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import { TaxInvoiceDocument } from '../../../components/billing/tax-invoice-document';
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
  Clock,
  History,
  Phone,
  MapPin,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
} from 'lucide-react';

function GSTInvoicingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');

  const [activeTab, setActiveTab] = useState<'HISTORY' | 'QUEUE'>(
    tabParam === 'queue' ? 'QUEUE' : 'HISTORY'
  );

  useEffect(() => {
    if (tabParam === 'queue') {
      setActiveTab('QUEUE');
    } else if (tabParam === 'history') {
      setActiveTab('HISTORY');
    }
  }, [tabParam]);

  // Invoices & Queue Data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [billingQueue, setBillingQueue] = useState<any[]>([]);
  const [stats, setStats] = useState({
    awaitingBillingCount: 0,
    billedTodayCount: 0,
    totalInvoicedRevenue: 0,
    totalInvoicesCount: 0,
  });

  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Date Filters
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [invoiceDateFilter, setInvoiceDateFilter] = useState('');
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueDateFilter, setQueueDateFilter] = useState('');

  // Invoice Detail Drawer
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Bill Generation Action Modal
  const [selectedOrderForBilling, setSelectedOrderForBilling] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Date helper calculations
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/invoices/billing-stats');
      setStats(res.data);
    } catch {
      // Quiet fail on stats
    }
  };

  const fetchInvoices = async () => {
    try {
      setIsLoadingInvoices(true);
      setError(null);
      const res = await apiClient.get('/invoices?limit=100');
      setInvoices(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const fetchBillingQueue = async () => {
    try {
      setIsLoadingQueue(true);
      setError(null);
      const res = await apiClient.get('/invoices/billing-queue?limit=100');
      setBillingQueue(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const refreshAll = () => {
    fetchStats();
    fetchInvoices();
    fetchBillingQueue();
  };

  useEffect(() => {
    fetchStats();
    fetchInvoices();
    fetchBillingQueue();
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

  const handleGenerateInvoice = async () => {
    if (!selectedOrderForBilling) return;

    try {
      setIsGenerating(true);
      setError(null);
      const res = await apiClient.post(`/invoices/generate/${selectedOrderForBilling.id}`, {});
      const createdInvoice = res.data;

      setSuccessMsg(
        `GST Tax Bill ${createdInvoice?.invoiceNumber || ''} generated successfully! Order released to Dispatch.`
      );

      setSelectedOrderForBilling(null);
      refreshAll();

      if (createdInvoice?.id) {
        openInvoiceDetail(createdInvoice.id);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper date matching
  const matchesDate = (dateVal: any, targetYmd: string): boolean => {
    if (!targetYmd) return true;
    if (!dateVal) return false;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    return d.toISOString().split('T')[0] === targetYmd;
  };

  const matchesSearch = (text: string, q: string): boolean => {
    return text.toLowerCase().includes(q.toLowerCase().trim());
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (invoiceDateFilter && !matchesDate(inv.issuedAt, invoiceDateFilter)) {
        return false;
      }
      if (!invoiceSearchQuery.trim()) return true;
      const q = invoiceSearchQuery.toLowerCase().trim();
      const num = inv.invoiceNumber?.toLowerCase() || '';
      const ordNum = inv.order?.orderNumber?.toLowerCase() || '';
      const custName = inv.order?.customer?.fullName?.toLowerCase() || '';
      const phone = inv.order?.customer?.phoneNumber || '';
      const city = inv.order?.customer?.city?.toLowerCase() || '';
      const dateStr = inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('en-IN') : '';

      return (
        num.includes(q) ||
        ordNum.includes(q) ||
        custName.includes(q) ||
        phone.includes(q) ||
        city.includes(q) ||
        dateStr.includes(q)
      );
    });
  }, [invoices, invoiceDateFilter, invoiceSearchQuery]);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return billingQueue.filter((ord) => {
      if (queueDateFilter && !matchesDate(ord.createdAt, queueDateFilter)) {
        return false;
      }
      if (!queueSearchQuery.trim()) return true;
      const q = queueSearchQuery.toLowerCase().trim();
      const ordNum = ord.orderNumber?.toLowerCase() || '';
      const custName = ord.customer?.fullName?.toLowerCase() || '';
      const phone = ord.customer?.phoneNumber || '';
      const city = ord.customer?.city?.toLowerCase() || '';
      const dateStr = ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN') : '';

      return (
        ordNum.includes(q) ||
        custName.includes(q) ||
        phone.includes(q) ||
        city.includes(q) ||
        dateStr.includes(q)
      );
    });
  }, [billingQueue, queueDateFilter, queueSearchQuery]);

  // Columns: Invoices
  const invoiceColumns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice Number',
      className: 'whitespace-nowrap min-w-[170px]',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
          {item.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'orderNumber',
      header: 'Order Reference',
      className: 'whitespace-nowrap min-w-[150px]',
      render: (item) => (
        <span className="font-mono font-semibold text-slate-700 text-xs">
          {item.order?.orderNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Billed To (Patient)',
      className: 'min-w-[180px]',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900 block">{item.order?.customer?.fullName}</span>
          <span className="block font-mono text-[11px] text-slate-500">
            {item.order?.customer?.phoneNumber}
          </span>
          <span className="block text-[10px] text-slate-400">
            {item.order?.customer?.city || 'Gujarat'}, {item.order?.customer?.state || 'Gujarat'}
          </span>
        </div>
      ),
    },
    {
      key: 'supplyType',
      header: 'Supply Type',
      className: 'whitespace-nowrap min-w-[140px]',
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
      className: 'whitespace-nowrap min-w-[180px]',
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
            Total Tax: ₹{Number(item.totalTax).toLocaleString('en-IN')}
          </span>
        </div>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Invoice Total',
      className: 'whitespace-nowrap min-w-[130px]',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          ₹{Number(item.grandTotal).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'issuedAt',
      header: 'Issued Date',
      className: 'whitespace-nowrap min-w-[120px]',
      render: (item) => (
        <span className="text-xs text-slate-500 font-mono">
          {item.issuedAt ? new Date(item.issuedAt).toLocaleDateString('en-IN') : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right whitespace-nowrap min-w-[140px]',
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

  // Columns: Queue
  const queueColumns: Column<any>[] = [
    {
      key: 'orderNumber',
      header: 'Order Reference',
      className: 'whitespace-nowrap min-w-[160px]',
      render: (order) => (
        <div className="space-y-1">
          <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap inline-block shadow-2xs">
            {order.orderNumber}
          </span>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <Calendar className="h-3 w-3 text-emerald-700 shrink-0" />
            <span>
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Patient Details',
      className: 'min-w-[190px]',
      render: (order) => (
        <div>
          <span className="font-bold text-xs text-slate-900 block">{order.customer?.fullName || 'N/A'}</span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 mt-0.5 whitespace-nowrap">
            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
            <span>{order.customer?.phoneNumber || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="truncate">
              {[order.customer?.city, order.customer?.state].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Formulation Prescription',
      className: 'min-w-[260px]',
      render: (order) => (
        <div className="space-y-1">
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-800 truncate">
                • {item.product?.name || 'Formulation Kit'}
                <span className="font-mono text-[11px] text-slate-500 ml-1 font-semibold">×{item.quantity}</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500 shrink-0">
                (@ ₹{Number(item.unitPrice || 0).toLocaleString('en-IN')})
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'totals',
      header: 'Tax & Grand Total',
      className: 'whitespace-nowrap min-w-[150px]',
      render: (order) => {
        const isHold = order.notes?.toUpperCase().includes('HOLD') || order.status === 'HOLD';
        return (
          <div className="space-y-0.5">
            <span className="font-mono text-xs font-black text-slate-900 block">
              ₹{Number(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-mono text-slate-500 block">
              Tax: ₹{Number(order.taxAmount || 0).toFixed(2)}
            </span>
            <div className="pt-0.5">
              {isHold ? (
                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                  HOLD
                </span>
              ) : (
                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {order.paymentMode || 'COD'}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Billing Action',
      className: 'text-right whitespace-nowrap min-w-[160px]',
      render: (order) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setSelectedOrderForBilling(order)}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
          icon={<FileText className="h-3.5 w-3.5" />}
        >
          Create Bill & Dispatch
        </Button>
      ),
    },
  ];

  // Excel Export Definitions
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
  ];

  const queueExportColumns: ExcelColumnDef[] = [
    { header: 'Order Number', accessor: 'orderNumber' },
    { header: 'Booking Date', accessor: (o: any) => o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '' },
    { header: 'Patient Name', accessor: 'customer.fullName' },
    { header: 'Phone Number', accessor: 'customer.phoneNumber' },
    { header: 'City', accessor: 'customer.city' },
    { header: 'State', accessor: 'customer.state' },
    { header: 'Subtotal (₹)', accessor: (o: any) => Number(o.subtotalAmount || 0) },
    { header: 'Tax Amount (₹)', accessor: (o: any) => Number(o.taxAmount || 0) },
    { header: 'Grand Total (₹)', accessor: (o: any) => Number(o.totalAmount || 0) },
    { header: 'Payment Mode', accessor: 'paymentMode' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200 uppercase tracking-widest">
              Panel 07 • Operations Billing Desk
            </span>
            <Badge variant="role">Statutory GST & Invoices</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Billing History & GST Tax Invoicing
          </h2>
          <p className="text-xs text-slate-500">
            Inspect issued GST bills, verify statutory tax bifurcations (CGST/SGST vs IGST), generate bills for approved formulation orders, and release consignments to Dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            isLoading={isLoadingInvoices || isLoadingQueue}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Desk
          </Button>
        </div>
      </div>

      {/* KPI Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Issued Bills & Invoices
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {stats.totalInvoicesCount || invoices.length}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">Official GST tax invoices</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100">
            <History className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Awaiting Billing
            </span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {stats.awaitingBillingCount || billingQueue.length}
            </span>
            <span className="text-[10px] text-amber-800 font-medium">Approved by Medical Officer</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-700 border border-amber-100">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Billed Today
            </span>
            <span className="text-2xl font-black text-emerald-800 mt-1 block">
              {stats.billedTodayCount} Bills
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">Released to Dispatch Queue</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100">
            <Package className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Invoiced Revenue
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              ₹{Number(stats.totalInvoicedRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Statutory GST Inclusive</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-slate-700 border border-slate-200">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab('HISTORY');
            router.replace('/management/invoices?tab=history');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'border-forest-700 text-forest-800 bg-forest-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Billing History & Issued Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('QUEUE');
            router.replace('/management/invoices?tab=queue');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'QUEUE'
              ? 'border-forest-700 text-forest-800 bg-forest-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Billing Queue (Awaiting Invoicing) ({billingQueue.length})</span>
        </button>
      </div>

      {/* TAB 1: Billing History & Invoices */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          {/* Universal Search & Date Filter Bar */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by invoice #, order #, patient name, phone, or date..."
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-forest-600 focus:outline-none transition"
                />
                {invoiceSearchQuery && (
                  <button
                    onClick={() => setInvoiceSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Date Quick Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setInvoiceDateFilter('')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    !invoiceDateFilter
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Dates
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceDateFilter(todayStr)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    invoiceDateFilter === todayStr
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceDateFilter(yesterdayStr)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    invoiceDateFilter === yesterdayStr
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Yesterday
                </button>
              </div>

              {/* Date Picker Input */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <input
                  type="date"
                  value={invoiceDateFilter}
                  onChange={(e) => setInvoiceDateFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 outline-none font-medium cursor-pointer"
                />
                {invoiceDateFilter && (
                  <button
                    onClick={() => setInvoiceDateFilter('')}
                    className="text-slate-400 hover:text-slate-600 text-xs ml-1"
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ExportButton
                data={filteredInvoices}
                columns={invoicesExportColumns}
                fileName="Melayurveda_GST_Invoices"
                sheetName="Issued Invoices"
              />
            </div>
          </div>

          {/* Invoices DataTable */}
          <DataTable
            columns={invoiceColumns}
            data={filteredInvoices}
            isLoading={isLoadingInvoices}
            emptyMessage="No GST tax invoices found matching your filters."
            hideToolbar={true}
          />
        </div>
      )}

      {/* TAB 2: Billing Queue (Orders Awaiting Bill) */}
      {activeTab === 'QUEUE' && (
        <div className="space-y-4">
          {/* Universal Search & Date Filter Bar */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search queue by order #, patient name, phone, or date..."
                  value={queueSearchQuery}
                  onChange={(e) => setQueueSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-forest-600 focus:outline-none transition"
                />
                {queueSearchQuery && (
                  <button
                    onClick={() => setQueueSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Date Quick Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setQueueDateFilter('')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    !queueDateFilter
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Dates
                </button>
                <button
                  type="button"
                  onClick={() => setQueueDateFilter(todayStr)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    queueDateFilter === todayStr
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQueueDateFilter(yesterdayStr)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    queueDateFilter === yesterdayStr
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Yesterday
                </button>
              </div>

              {/* Date Picker Input */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <input
                  type="date"
                  value={queueDateFilter}
                  onChange={(e) => setQueueDateFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 outline-none font-medium cursor-pointer"
                />
                {queueDateFilter && (
                  <button
                    onClick={() => setQueueDateFilter('')}
                    className="text-slate-400 hover:text-slate-600 text-xs ml-1"
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ExportButton
                data={filteredQueue}
                columns={queueExportColumns}
                fileName="Melayurveda_Billing_Queue"
                sheetName="Awaiting Billing"
              />
            </div>
          </div>

          {/* Queue DataTable */}
          <DataTable
            columns={queueColumns}
            data={filteredQueue}
            isLoading={isLoadingQueue}
            emptyMessage="No approved orders awaiting billing. All confirmed orders are billed!"
            hideToolbar={true}
          />
        </div>
      )}

      {/* Bill Generation Confirmation Modal */}
      <Modal
        isOpen={!!selectedOrderForBilling}
        onClose={() => setSelectedOrderForBilling(null)}
        title="Confirm GST Tax Bill Generation"
        description="Verify prescription items and tax bifurcation before official GST invoice issuance."
        maxWidth="md"
      >
        {selectedOrderForBilling && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/90 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-600">Order Reference:</span>
                <span className="font-mono font-bold text-slate-900">{selectedOrderForBilling.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-600">Patient:</span>
                <span className="font-bold text-slate-900">{selectedOrderForBilling.customer?.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-600">Shipping State:</span>
                <span className="font-semibold text-slate-900">{selectedOrderForBilling.customer?.state || 'Gujarat'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-600">Tax Bifurcation:</span>
                <span className="font-bold text-forest-800">
                  {(selectedOrderForBilling.customer?.state || 'Gujarat').toLowerCase().includes('gujarat')
                    ? 'CGST (6%) + SGST (6%) [Intra-State]'
                    : 'IGST (12%) [Inter-State]'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800">Grand Total:</span>
                <span className="font-mono font-black text-sm text-forest-900">
                  ₹{Number(selectedOrderForBilling.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-900 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Once confirmed, an official sequential invoice (`MEL-INV-YYYY-XXXXX`) will be recorded, stock allocated, and this order will immediately transition to <strong>Courier Dispatch</strong>.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrderForBilling(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleGenerateInvoice}
                isLoading={isGenerating}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
              >
                Confirm & Release to Dispatch
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Official Printable Tax Invoice View Drawer */}
      <Drawer
        isOpen={!!selectedInvoiceId}
        onClose={() => {
          setSelectedInvoiceId(null);
          setInvoiceDetail(null);
        }}
        title="Official Tax Invoice (GST Format)"
        width="3xl"
      >
        {loadingDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading tax invoice...</div>
        ) : !invoiceDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Invoice not found</div>
        ) : (
          <div className="p-2 sm:p-4 bg-slate-50 min-h-full">
            <TaxInvoiceDocument
              invoice={invoiceDetail}
              onClose={() => {
                setSelectedInvoiceId(null);
                setInvoiceDetail(null);
              }}
              showToolbar={true}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default function GSTInvoicingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading GST Invoices Desk...</div>}>
      <GSTInvoicingContent />
    </Suspense>
  );
}
