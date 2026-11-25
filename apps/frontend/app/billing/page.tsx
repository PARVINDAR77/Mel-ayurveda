'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { DataTable, Column } from '../../components/ui/data-table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Drawer } from '../../components/ui/drawer';
import { Modal } from '../../components/ui/modal';
import {
  FileText,
  Boxes,
  PackageCheck,
  RefreshCw,
  Search,
  Eye,
  Printer,
  CheckCircle2,
  AlertCircle,
  Building,
  Layers,
  ArrowRight,
  ShieldCheck,
  Truck,
  Leaf,
  PlusCircle,
  Clock,
  Phone,
  MapPin,
} from 'lucide-react';

export default function BillingWorkspacePage() {
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'STOCK' | 'INVOICES'>('QUEUE');

  // Stats
  const [stats, setStats] = useState({
    awaitingBillingCount: 0,
    billedTodayCount: 0,
    totalInvoicedRevenue: 0,
    lowStockAlerts: 0,
  });

  // Billing Queue State
  const [billingQueue, setBillingQueue] = useState<any[]>([]);
  const [queueSearch, setQueueSearch] = useState('');
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);

  // Stock Inventory State
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Issued Invoices State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Bill Generation Modal State
  const [selectedOrderForBilling, setSelectedOrderForBilling] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Printable Invoice Drawer State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<any | null>(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

  // Feedback Messages
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // -------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------
  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/invoices/billing-stats');
      setStats(res.data);
    } catch (err: any) {
      console.warn('Could not fetch billing stats:', err.message);
    }
  };

  const fetchBillingQueue = async () => {
    try {
      setIsLoadingQueue(true);
      setError(null);
      const params = new URLSearchParams();
      if (queueSearch) params.append('search', queueSearch);
      const res = await apiClient.get(`/invoices/billing-queue?${params.toString()}`);
      setBillingQueue(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const fetchStock = async () => {
    try {
      setIsLoadingStock(true);
      const res = await apiClient.get('/inventory');
      setInventoryList(res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingStock(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setIsLoadingInvoices(true);
      const res = await apiClient.get('/invoices?limit=50');
      setInvoices(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const refreshAll = () => {
    fetchStats();
    if (activeTab === 'QUEUE') fetchBillingQueue();
    if (activeTab === 'STOCK') fetchStock();
    if (activeTab === 'INVOICES') fetchInvoices();
  };

  useEffect(() => {
    fetchStats();
    fetchBillingQueue();
  }, []);

  useEffect(() => {
    if (activeTab === 'QUEUE') fetchBillingQueue();
    if (activeTab === 'STOCK') fetchStock();
    if (activeTab === 'INVOICES') fetchInvoices();
  }, [activeTab]);

  // -------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------
  const handleGenerateInvoice = async () => {
    if (!selectedOrderForBilling) return;

    try {
      setIsGenerating(true);
      setError(null);
      const res = await apiClient.post(`/invoices/generate/${selectedOrderForBilling.id}`, {});
      const createdInvoice = res.data;

      setSuccessMsg(
        `GST Tax Bill ${createdInvoice?.invoiceNumber || ''} generated successfully! Order has been released to the Dispatch Section.`,
      );

      setSelectedOrderForBilling(null);
      fetchStats();
      fetchBillingQueue();

      // Automatically open the printed invoice drawer for inspection & printout
      if (createdInvoice?.id) {
        openInvoiceDetail(createdInvoice.id);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const openInvoiceDetail = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setLoadingInvoiceDetail(true);
    try {
      const res = await apiClient.get(`/invoices/${invoiceId}`);
      setInvoiceDetail(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setSelectedInvoiceId(null);
    } finally {
      setLoadingInvoiceDetail(false);
    }
  };

  // -------------------------------------------------------------
  // BILLING QUEUE COLUMNS
  // -------------------------------------------------------------
  const queueColumns: Column<any>[] = [
    {
      key: 'orderNumber',
      header: 'Order Reference',
      render: (order) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900 block">{order.orderNumber}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Patient Details',
      render: (order) => (
        <div>
          <span className="font-bold text-xs text-slate-800 block">{order.customer?.fullName || 'N/A'}</span>
          <span className="text-[11px] font-mono text-slate-500 block flex items-center gap-1">
            <Phone className="h-3 w-3 text-slate-400" />
            {order.customer?.phoneNumber || 'N/A'}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {order.customer?.city ? `${order.customer.city}, ` : ''}
            {order.customer?.state || 'Gujarat'} {order.customer?.pincode ? `(${order.customer.pincode})` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Formulation Prescription',
      render: (order) => (
        <div className="space-y-1">
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
              <span className="font-medium text-slate-800">{item.product?.name || 'Ayurvedic Medicine'}</span>
              <span className="text-[11px] font-mono font-bold text-emerald-800">×{item.quantity}</span>
              <span className="text-[10px] font-mono text-slate-400">(@ ₹{Number(item.unitPrice).toLocaleString('en-IN')})</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'financials',
      header: 'Tax & Grand Total',
      render: (order) => {
        const isGujarat = (order.customer?.state || '').trim().toLowerCase() === 'gujarat';
        return (
          <div>
            <span className="font-mono text-xs font-black text-slate-900 block">
              ₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-mono text-slate-500 block">
              Tax: ₹{Number(order.taxAmount).toFixed(2)} ({isGujarat ? 'CGST+SGST 12%' : 'IGST 12%'})
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 block">
              {order.paymentMode?.replace(/_/g, ' ') || 'COD'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'approvalStatus',
      header: 'Workflow Stage',
      render: () => (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <Clock className="h-3 w-3 text-amber-600" /> Approved • Awaiting Bill
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Billing Operations',
      className: 'text-right',
      render: (order) => (
        <Button
          size="sm"
          onClick={() => setSelectedOrderForBilling(order)}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5"
        >
          <FileText className="h-3.5 w-3.5" />
          Create Bill & Dispatch
        </Button>
      ),
    },
  ];

  // -------------------------------------------------------------
  // STOCK INVENTORY COLUMNS
  // -------------------------------------------------------------
  const filteredStock = inventoryList.filter((inv) => {
    if (!stockSearch.trim()) return true;
    const q = stockSearch.toLowerCase();
    return (
      inv.product?.name?.toLowerCase().includes(q) ||
      inv.product?.sku?.toLowerCase().includes(q) ||
      inv.product?.targetDisease?.toLowerCase().includes(q)
    );
  });

  const stockColumns: Column<any>[] = [
    {
      key: 'sku',
      header: 'SKU & Code',
      render: (inv) => <span className="font-mono text-xs font-bold text-slate-800">{inv.product?.sku || 'SKU-000'}</span>,
    },
    {
      key: 'product',
      header: 'Formulation Name & Disease',
      render: (inv) => (
        <div>
          <span className="font-bold text-xs text-slate-900 block">{inv.product?.name}</span>
          <span className="text-[10px] text-emerald-800 font-semibold block">{inv.product?.targetDisease || 'General Wellness'}</span>
        </div>
      ),
    },
    {
      key: 'pricing',
      header: 'Pricing & Tax',
      render: (inv) => (
        <div className="text-xs">
          <span className="font-mono text-slate-900 font-bold block">₹{Number(inv.product?.sellingPrice || 0).toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 block line-through">MRP ₹{Number(inv.product?.mrpPrice || 0).toLocaleString('en-IN')}</span>
          <span className="text-[10px] font-mono text-slate-500 block">GST: {Number(inv.product?.gstRate || 12)}%</span>
        </div>
      ),
    },
    {
      key: 'stockLevels',
      header: 'Warehouse Stock',
      render: (inv) => {
        const isLowStock = inv.availableQuantity <= inv.lowStockThreshold;
        return (
          <div className="flex items-center gap-2">
            <span
              className={`font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-lg border ${
                isLowStock
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {inv.availableQuantity} Units
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              (Reserved: {inv.reservedQuantity} | Min: {inv.lowStockThreshold})
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Stock Readiness',
      render: (inv) => {
        if (inv.availableQuantity <= 0) {
          return <Badge variant="danger">Out of Stock</Badge>;
        }
        if (inv.availableQuantity <= inv.lowStockThreshold) {
          return <Badge variant="warning">Low Stock Alert</Badge>;
        }
        return <Badge variant="success">Fully In Stock</Badge>;
      },
    },
  ];

  // -------------------------------------------------------------
  // ISSUED INVOICES COLUMNS
  // -------------------------------------------------------------
  const filteredInvoices = invoices.filter((inv) => {
    if (!invoiceSearch.trim()) return true;
    const q = invoiceSearch.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.order?.orderNumber?.toLowerCase().includes(q) ||
      inv.order?.customer?.fullName?.toLowerCase().includes(q)
    );
  });

  const invoiceColumns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'GST Invoice #',
      render: (inv) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900 block">{inv.invoiceNumber}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            Issued: {new Date(inv.issuedAt).toLocaleDateString('en-IN')}
          </span>
        </div>
      ),
    },
    {
      key: 'orderNumber',
      header: 'Order Code',
      render: (inv) => <span className="font-mono text-xs text-slate-700">{inv.order?.orderNumber || 'N/A'}</span>,
    },
    {
      key: 'customer',
      header: 'Customer Details',
      render: (inv) => (
        <div>
          <span className="font-bold text-xs text-slate-900 block">{inv.order?.customer?.fullName || 'N/A'}</span>
          <span className="text-[10px] text-slate-500 font-mono block">{inv.order?.customer?.state || 'Gujarat'}</span>
        </div>
      ),
    },
    {
      key: 'taxBifurcation',
      header: 'GST Breakdown',
      render: (inv) => {
        const isIntra = Number(inv.igstAmount) === 0;
        return (
          <div className="text-[11px] font-mono text-slate-600">
            {isIntra ? (
              <span>
                CGST: ₹{Number(inv.cgstAmount).toFixed(2)} | SGST: ₹{Number(inv.sgstAmount).toFixed(2)}
              </span>
            ) : (
              <span>IGST: ₹{Number(inv.igstAmount).toFixed(2)}</span>
            )}
            <span className="block text-[10px] text-slate-400">Total Tax: ₹{Number(inv.totalTax).toFixed(2)}</span>
          </div>
        );
      },
    },
    {
      key: 'grandTotal',
      header: 'Invoice Amount',
      render: (inv) => (
        <span className="font-mono text-xs font-black text-slate-900">
          ₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Fulfillment State',
      render: (inv) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <Truck className="h-3 w-3 text-emerald-600" /> Billed • Dispatched
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (inv) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => openInvoiceDetail(inv.id)}
          className="text-xs font-semibold inline-flex items-center gap-1"
        >
          <Eye className="h-3.5 w-3.5" />
          View & Print Bill
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 uppercase tracking-widest">
              Panel 07 • Billing & Inventory Desk
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Gujarat GST (HSN 30049011) Compliant
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Billing & Stock Management Workspace
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage warehouse inventory, verify formulation stock allocation, and generate GST tax bills. Once billed, orders automatically transition to Courier Dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Desk
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold hover:underline">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">✕</button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Awaiting Billing</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{stats.awaitingBillingCount} Orders</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Approved by Medical Officer</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Billed Today</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{stats.billedTodayCount} Bills</span>
            <span className="text-[11px] text-emerald-600 mt-0.5 block">Released to Dispatch</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200">
            <PackageCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Invoiced Revenue</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              ₹{stats.totalInvoicedRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Statutory GST Inclusive</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 border border-blue-200">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Low Stock Alerts</span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{stats.lowStockAlerts} SKUs</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Below threshold (&lt;20 units)</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200">
            <Boxes className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Segmented Control Tabs (Zero Native Scrollbar) */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-1.5 md:gap-2 shadow-2xs">
        <button
          onClick={() => setActiveTab('QUEUE')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
            activeTab === 'QUEUE'
              ? 'bg-emerald-800 text-white shadow-sm ring-1 ring-emerald-900/10'
              : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Billing Queue (Awaiting Invoicing)</span>
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'QUEUE' ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {billingQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('STOCK')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
            activeTab === 'STOCK'
              ? 'bg-emerald-800 text-white shadow-sm ring-1 ring-emerald-900/10'
              : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
          }`}
        >
          <Boxes className="h-3.5 w-3.5" />
          <span>Warehouse Stock & Inventory Control</span>
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'STOCK' ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {inventoryList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
            activeTab === 'INVOICES'
              ? 'bg-emerald-800 text-white shadow-sm ring-1 ring-emerald-900/10'
              : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Issued GST Invoices & Bills</span>
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'INVOICES' ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {invoices.length}
          </span>
        </button>
      </div>

      {/* TAB 1: BILLING QUEUE */}
      {activeTab === 'QUEUE' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Approved Orders Ready for GST Invoicing</h3>
                <p className="text-xs text-slate-500">
                  These formulation orders have passed clinical triage and medical approval. Generate the official GST invoice to release each order into the Dispatch Queue.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by order #, patient name, phone..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchBillingQueue()}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <DataTable
              columns={queueColumns}
              data={billingQueue}
              isLoading={isLoadingQueue}
              emptyMessage="No approved orders currently awaiting billing. All caught up!"
            />
          </div>
        </div>
      )}

      {/* TAB 2: WAREHOUSE STOCK */}
      {activeTab === 'STOCK' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Warehouse Stock & Batch Inventory</h3>
                <p className="text-xs text-slate-500">
                  Live stock levels across all Ayurvedic single herbs, classical rasayanas, and proprietary formulations.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter stock by name, SKU, ailment..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <DataTable
              columns={stockColumns}
              data={filteredStock}
              isLoading={isLoadingStock}
              emptyMessage="No inventory records found."
            />
          </div>
        </div>
      )}

      {/* TAB 3: ISSUED INVOICES */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Statutory GST Invoices & Bills Ledger</h3>
                <p className="text-xs text-slate-500">
                  Historical repository of all issued tax invoices. Invoices are permanently archived and transmitted to courier fulfillment.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice #, order #, patient..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <DataTable
              columns={invoiceColumns}
              data={filteredInvoices}
              isLoading={isLoadingInvoices}
              emptyMessage="No GST tax invoices issued yet."
            />
          </div>
        </div>
      )}

      {/* CREATE BILL & DISPATCH MODAL */}
      <Modal
        isOpen={!!selectedOrderForBilling}
        onClose={() => setSelectedOrderForBilling(null)}
        title="Generate Official GST Tax Bill & Release to Dispatch"
        description="Verify prescription items and tax jurisdiction before issuing official fiscal invoice."
      >
        {selectedOrderForBilling && (
          <div className="space-y-4 text-xs text-slate-700">
            {/* Order & Customer Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedOrderForBilling.orderNumber}
                </span>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Medical Clearance Verified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Patient Name</span>
                  <span className="font-semibold text-slate-800">{selectedOrderForBilling.customer?.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Shipping Destination</span>
                  <span className="font-semibold text-slate-800">
                    {selectedOrderForBilling.customer?.city || 'Gujarat'}, {selectedOrderForBilling.customer?.state || 'Gujarat'}
                  </span>
                </div>
              </div>
            </div>

            {/* Formulation Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-2">Formulation</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Agreed Rate</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrderForBilling.items?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="p-2 font-medium text-slate-800">{item.product?.name}</td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-800">{item.quantity}</td>
                      <td className="p-2 text-right font-mono">₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-bold">₹{Number(item.totalPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tax Calculation Card */}
            {(() => {
              const customerState = (selectedOrderForBilling.customer?.state || '').trim().toLowerCase();
              const isIntraState = customerState === 'gujarat';
              const tax = Number(selectedOrderForBilling.taxAmount);
              const total = Number(selectedOrderForBilling.totalAmount);

              return (
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-1.5">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-semibold">₹{Number(selectedOrderForBilling.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>
                      GST Bifurcation ({isIntraState ? 'Gujarat Intra-State CGST 6% + SGST 6%' : 'Inter-State IGST 12%'}):
                    </span>
                    <span className="font-mono font-semibold">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-950 font-black text-sm pt-1 border-t border-emerald-200">
                    <span>Invoice Grand Total:</span>
                    <span className="font-mono">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrderForBilling(null)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGenerateInvoice}
                isLoading={isGenerating}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
              >
                Confirm Bill & Release to Dispatch
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* OFFICIAL PRINTABLE TAX INVOICE DRAWER */}
      <Drawer
        isOpen={!!selectedInvoiceId}
        onClose={() => {
          setSelectedInvoiceId(null);
          setInvoiceDetail(null);
        }}
        title="Official GST Tax Invoice & Delivery Bill"
        width="lg"
      >
        {loadingInvoiceDetail ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading tax bill...</div>
        ) : !invoiceDetail ? (
          <div className="py-20 text-center text-xs text-slate-400">Invoice document not found</div>
        ) : (
          <div className="space-y-6 text-xs text-slate-700 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            {/* Print Button Bar */}
            <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600">Tax Invoice Ready for Dispatch</span>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold inline-flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Invoice / Bill Slip
              </Button>
            </div>

            {/* Corporate Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-black tracking-wider text-emerald-900 uppercase">
                  MELAYURVEDA INDIA PVT. LTD.
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Corporate HQ: 101 Ayurveda Bhavan, S.G. Highway, Ahmedabad, Gujarat - 380054
                </p>
                <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                  <strong>GSTIN:</strong> 24AABCM1234F1Z5 | <strong>State:</strong> Gujarat (Code 24)
                </p>
                <p className="text-[10px] text-emerald-800 font-semibold italic mt-1">
                  Nature Se Nirog, Ayurveda Se Swasth
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded block">
                  {invoiceDetail.invoiceNumber}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono mt-1">
                  Issued: {new Date(invoiceDetail.issuedAt).toLocaleDateString('en-IN')}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                  Order Ref: {invoiceDetail.order?.orderNumber}
                </span>
              </div>
            </div>

            {/* Bill To & Ship To */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4 text-xs">
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block mb-1">
                  Patient & Billing Information
                </span>
                <span className="font-bold text-slate-900 block">{invoiceDetail.order?.customer?.fullName}</span>
                <span className="text-slate-600 block">{invoiceDetail.order?.customer?.address || 'Ahmedabad, Gujarat'}</span>
                <span className="text-slate-600 block">
                  {invoiceDetail.order?.customer?.city}, {invoiceDetail.order?.customer?.state} - {invoiceDetail.order?.customer?.pincode}
                </span>
                <span className="text-slate-600 block font-mono mt-1">Phone: {invoiceDetail.order?.customer?.phoneNumber}</span>
              </div>
              <div className="text-right">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block mb-1">
                  Tax Jurisdiction Details
                </span>
                <span className="block text-slate-700">
                  Place of Supply: <strong>{invoiceDetail.order?.customer?.state || 'Gujarat'}</strong>
                </span>
                <span className="block text-slate-700">
                  Tax Type:{' '}
                  <strong>
                    {Number(invoiceDetail.igstAmount) === 0 ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
                  </strong>
                </span>
                <span className="block text-slate-700">
                  Payment Mode: <strong>{invoiceDetail.order?.paymentMode?.replace(/_/g, ' ') || 'COD'}</strong>
                </span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Prescribed Formulation</th>
                    <th className="p-2.5 text-center">HSN</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Rate</th>
                    <th className="p-2.5 text-right">Taxable</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceDetail.order?.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <span className="font-bold text-slate-900 block">{item.product?.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">SKU: {item.product?.sku}</span>
                      </td>
                      <td className="p-2.5 text-center font-mono text-[11px] text-slate-500">30049011</td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-800">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono">₹{Number(item.totalPrice).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{Number(item.totalPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{Number(invoiceDetail.order?.subtotal || 0).toFixed(2)}</span>
                </div>
                {Number(invoiceDetail.cgstAmount) > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>CGST (6%):</span>
                      <span className="font-mono">₹{Number(invoiceDetail.cgstAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST (6%):</span>
                      <span className="font-mono">₹{Number(invoiceDetail.sgstAmount).toFixed(2)}</span>
                    </div>
                  </>
                )}
                {Number(invoiceDetail.igstAmount) > 0 && (
                  <div className="flex justify-between">
                    <span>IGST (12%):</span>
                    <span className="font-mono">₹{Number(invoiceDetail.igstAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-900">₹{Number(invoiceDetail.grandTotal).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Declaration & Signatures */}
            <div className="border-t border-slate-200 pt-4 flex justify-between items-end text-[10px] text-slate-400">
              <div>
                <span>This is a computer-generated tax invoice issued under Section 31 of CGST Act.</span>
                <span className="block mt-0.5">Goods once sold are packed under verified pharmaceutical inspection.</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-700 block text-xs">For MELAYURVEDA INDIA PVT. LTD.</span>
                <span className="block text-[10px] text-slate-400 mt-6">Authorized Signatory / Billing Desk</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
