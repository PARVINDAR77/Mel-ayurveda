'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { DataTable, Column } from '../../components/ui/data-table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Drawer } from '../../components/ui/drawer';
import { Modal } from '../../components/ui/modal';
import { ExportButton } from '../../components/ui/export-button';
import { ExcelColumnDef } from '../../lib/export-excel';
import { TaxInvoiceDocument } from '../../components/billing/tax-invoice-document';
import {
  FileText,
  Boxes,
  PackageCheck,
  RefreshCw,
  Search,
  X,
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
  Plus,
  Minus,
  History,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';

function BillingWorkspaceContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');

  const getInitialTab = (): 'QUEUE' | 'STOCK' | 'INVOICES' => {
    if (tabParam === 'history' || tabParam === 'invoices') return 'INVOICES';
    if (tabParam === 'stock') return 'STOCK';
    return 'QUEUE';
  };

  const [activeTab, setActiveTab] = useState<'QUEUE' | 'STOCK' | 'INVOICES'>(getInitialTab);

  useEffect(() => {
    if (tabParam === 'history' || tabParam === 'invoices') {
      setActiveTab('INVOICES');
    } else if (tabParam === 'stock') {
      setActiveTab('STOCK');
    } else if (tabParam === 'queue') {
      setActiveTab('QUEUE');
    }
  }, [tabParam]);

  // Stats
  const [stats, setStats] = useState({
    awaitingBillingCount: 0,
    billedTodayCount: 0,
    totalInvoicedRevenue: 0,
    lowStockAlerts: 0,
    totalInvoicesCount: 0,
    totalInventoryCount: 0,
  });

  // Billing Queue State
  const [billingQueue, setBillingQueue] = useState<any[]>([]);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueDateFilter, setQueueDateFilter] = useState('');
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);

  // Stock Inventory State
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Issued Invoices State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceDateFilter, setInvoiceDateFilter] = useState('');
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Bill Generation Modal State
  const [selectedOrderForBilling, setSelectedOrderForBilling] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Printable Invoice Drawer State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<any | null>(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

  // Manage Stock Modal State (Add / Remove / Calibrate)
  const [selectedInventoryForManage, setSelectedInventoryForManage] = useState<any | null>(null);
  const [stockAction, setStockAction] = useState<'ADD' | 'REMOVE' | 'SET_COUNT'>('ADD');
  const [stockQuantity, setStockQuantity] = useState<number>(50);
  const [stockReason, setStockReason] = useState<string>('Factory Restock Batch');
  const [stockBatch, setStockBatch] = useState<string>('');
  const [stockThreshold, setStockThreshold] = useState<number>(20);
  const [stockNotes, setStockNotes] = useState<string>('');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // General Quick Restock Modal
  const [isGeneralRestockOpen, setIsGeneralRestockOpen] = useState(false);
  const [generalProductId, setGeneralProductId] = useState('');

  // Stock History Drawer State
  const [selectedInventoryForHistory, setSelectedInventoryForHistory] = useState<any | null>(null);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

  const fetchBillingQueue = async (customSearch = queueSearch, customDate = queueDateFilter) => {
    try {
      setIsLoadingQueue(true);
      setError(null);
      const params = new URLSearchParams();
      if (customSearch) params.append('search', customSearch);
      if (customDate) params.append('date', customDate);
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
      const res = await apiClient.get('/invoices?limit=100');
      setInvoices(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const refreshAll = () => {
    fetchStats();
    fetchBillingQueue();
    fetchInvoices();
    fetchStock();
  };

  useEffect(() => {
    fetchStats();
    fetchBillingQueue();
    fetchInvoices();
    fetchStock();
  }, []);

  useEffect(() => {
    if (activeTab === 'QUEUE') fetchBillingQueue();
    if (activeTab === 'STOCK') fetchStock();
    if (activeTab === 'INVOICES') fetchInvoices();
  }, [activeTab]);

  // -------------------------------------------------------------
  // ACTIONS: BILLING
  // -------------------------------------------------------------
  const handleGenerateInvoice = async () => {
    if (!selectedOrderForBilling) return;

    try {
      setIsGenerating(true);
      setError(null);
      const res = await apiClient.post(`/invoices/generate/${selectedOrderForBilling.id}`, {});
      const createdInvoice = res.data;

      setSuccessMsg(
        `GST Tax Bill ${createdInvoice?.invoiceNumber || ''} generated successfully! Order released to Dispatch. View the record in Billing History.`,
      );

      setSelectedOrderForBilling(null);
      fetchStats();
      fetchBillingQueue();
      fetchInvoices();
      fetchStock();

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
  // ACTIONS: STOCK MANAGEMENT (ADD / REMOVE / ADJUST)
  // -------------------------------------------------------------
  const openManageStockModal = (inv: any, defaultAction: 'ADD' | 'REMOVE' | 'SET_COUNT' = 'ADD') => {
    setSelectedInventoryForManage(inv);
    setStockAction(defaultAction);
    setStockQuantity(defaultAction === 'REMOVE' ? 5 : 50);
    setStockReason(defaultAction === 'REMOVE' ? 'Damaged Packaging' : 'Factory Restock Batch');
    setStockBatch(`BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setStockThreshold(inv.lowStockThreshold || 20);
    setStockNotes('');
  };

  const openGeneralRestockModal = () => {
    if (inventoryList.length > 0) {
      setGeneralProductId(inventoryList[0].productId || inventoryList[0].product?.id);
    }
    setStockAction('ADD');
    setStockQuantity(50);
    setStockReason('Factory Restock Batch');
    setStockBatch(`BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setStockThreshold(20);
    setStockNotes('');
    setIsGeneralRestockOpen(true);
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetProductId = selectedInventoryForManage
      ? selectedInventoryForManage.productId || selectedInventoryForManage.product?.id
      : generalProductId;

    if (!targetProductId) return;

    try {
      setIsSubmittingStock(true);
      setError(null);

      const res = await apiClient.post('/inventory/adjust', {
        productId: targetProductId,
        action: stockAction,
        quantity: Number(stockQuantity),
        reason: stockReason.trim(),
        batchNumber: stockBatch.trim() || undefined,
        lowStockThreshold: Number(stockThreshold) || 20,
        notes: stockNotes.trim() || undefined,
      });

      setSuccessMsg(res.data?.message || 'Warehouse stock updated successfully.');
      setSelectedInventoryForManage(null);
      setIsGeneralRestockOpen(false);
      fetchStock();
      fetchStats();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingStock(false);
    }
  };

  const openStockHistory = async (inv: any) => {
    setSelectedInventoryForHistory(inv);
    setIsLoadingHistory(true);
    try {
      const res = await apiClient.get(`/inventory/transactions?productId=${inv.productId || inv.product?.id}&limit=50`);
      setHistoryTransactions(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setSelectedInventoryForHistory(null);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // -------------------------------------------------------------
  // DATE MATCHING HELPERS
  // -------------------------------------------------------------
  const matchesDateText = (dateValue: any, query: string): boolean => {
    if (!dateValue || !query) return false;
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return false;
    const q = query.toLowerCase().trim();
    const iso = d.toISOString().split('T')[0]; // 2026-11-27
    const enIn = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase(); // 27 nov 2026
    const numSlash = d.toLocaleDateString('en-IN').toLowerCase(); // 27/11/2026
    const monthName = d.toLocaleDateString('en-US', { month: 'long' }).toLowerCase(); // november
    const shortMonth = d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase(); // nov
    const day = String(d.getDate()).padStart(2, '0');
    const year = String(d.getFullYear());

    return (
      iso.includes(q) ||
      enIn.includes(q) ||
      numSlash.includes(q) ||
      monthName.includes(q) ||
      shortMonth.includes(q) ||
      `${day} ${shortMonth}`.includes(q) ||
      `${shortMonth} ${year}`.includes(q)
    );
  };

  const isSameDay = (dateValue: any, targetYmd: string): boolean => {
    if (!dateValue || !targetYmd) return true;
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return false;
    return d.toISOString().split('T')[0] === targetYmd;
  };

  // -------------------------------------------------------------
  // BILLING QUEUE COLUMNS
  // -------------------------------------------------------------
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
              {[order.customer?.city, order.customer?.state].filter(Boolean).join(', ')} {order.customer?.pincode ? `(${order.customer.pincode})` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Formulation Prescription',
      className: 'min-w-[300px]',
      render: (order) => {
        let cleanNotes = '';
        if (order.notes) {
          cleanNotes = order.notes
            .split('|')
            .map((s: string) => s.trim())
            .filter(
              (s: string) =>
                !s.startsWith('[LEAD:') &&
                !s.startsWith('Booking Date:') &&
                !s.startsWith('Booking Agent:') &&
                !s.startsWith('[LEAD_CUSTOMER:')
            )
            .join(' | ');
        }
        return (
          <div className="space-y-1.5 py-0.5">
            <div className="bg-slate-50/90 rounded-lg p-2 border border-slate-200/80 space-y-1">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span className="truncate">{item.product?.name || 'Ayurvedic Medicine'}</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                    <span className="font-bold text-emerald-800">×{item.quantity}</span>
                    <span className="text-slate-400">(@ ₹{Number(item.unitPrice).toLocaleString('en-IN')})</span>
                  </div>
                </div>
              ))}
            </div>
            {cleanNotes && (
              <p className="text-[10px] text-slate-500 italic line-clamp-1">
                📝 &quot;{cleanNotes}&quot;
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'financials',
      header: 'Tax & Grand Total',
      className: 'whitespace-nowrap min-w-[170px]',
      render: (order) => {
        const isGujarat = (order.customer?.state || '').trim().toLowerCase() === 'gujarat';
        const mode = order.paymentMode || 'CASH_ON_DELIVERY';
        let paymentBadgeVariant: any = 'success';
        if (mode === 'HOLD') paymentBadgeVariant = 'warning';
        else if (mode === 'PREPAID') paymentBadgeVariant = 'info';
        else if (mode === 'FACE_TO_FACE') paymentBadgeVariant = 'role';

        return (
          <div className="space-y-1">
            <span className="font-mono text-sm font-black text-slate-900 block">
              ₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-mono font-medium text-slate-500 block">
              Tax: ₹{Number(order.taxAmount).toFixed(2)} ({isGujarat ? 'CGST+SGST 12%' : 'IGST 12%'})
            </span>
            <Badge variant={paymentBadgeVariant} className="text-[10px] px-1.5 py-0.2">
              {mode.replace(/_/g, ' ')}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'approvalStatus',
      header: 'Workflow Stage',
      className: 'whitespace-nowrap min-w-[160px]',
      render: () => (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 shadow-2xs whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>Approved • Awaiting Bill</span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Billing Operations',
      className: 'text-right whitespace-nowrap min-w-[200px]',
      render: (order) => (
        <Button
          size="sm"
          onClick={() => setSelectedOrderForBilling(order)}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Create Bill & Dispatch</span>
        </Button>
      ),
    },
  ];

  // -------------------------------------------------------------
  // BILLING QUEUE FILTER (REAL-TIME INSTANT SEARCH & DATE FILTER)
  // -------------------------------------------------------------
  const filteredBillingQueue = useMemo(() => {
    let result = billingQueue;

    // Filter by specific date if date picker is active
    if (queueDateFilter) {
      result = result.filter((ord: any) => isSameDay(ord.createdAt || ord.updatedAt, queueDateFilter));
    }

    // Filter by search term (matches text fields AND any parsed date)
    if (queueSearch.trim()) {
      const q = queueSearch.toLowerCase().trim();
      result = result.filter((ord: any) => {
        const orderNum = (ord.orderNumber || '').toLowerCase();
        const patientName = (ord.customer?.fullName || '').toLowerCase();
        const phone = (ord.customer?.phoneNumber || '').toLowerCase();
        const altPhone = (ord.customer?.alternatePhone || '').toLowerCase();
        const city = (ord.customer?.city || '').toLowerCase();
        const notes = (ord.notes || '').toLowerCase();
        const items = (ord.items || []).map((it: any) => (it.product?.name || '').toLowerCase()).join(' ');
        const matchesDate = matchesDateText(ord.createdAt, q) || matchesDateText(ord.updatedAt, q);

        return (
          orderNum.includes(q) ||
          patientName.includes(q) ||
          phone.includes(q) ||
          altPhone.includes(q) ||
          city.includes(q) ||
          notes.includes(q) ||
          items.includes(q) ||
          matchesDate
        );
      });
    }

    return result;
  }, [billingQueue, queueSearch, queueDateFilter]);

  // -------------------------------------------------------------
  // STOCK INVENTORY COLUMNS WITH ACTIONS (ADD / REMOVE / HISTORY)
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
      className: 'whitespace-nowrap min-w-[130px]',
      render: (inv) => <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{inv.product?.sku || 'SKU-000'}</span>,
    },
    {
      key: 'product',
      header: 'Formulation Name & Disease',
      className: 'min-w-[220px]',
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
      className: 'whitespace-nowrap min-w-[140px]',
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
      className: 'whitespace-nowrap min-w-[200px]',
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
      className: 'whitespace-nowrap min-w-[140px]',
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
    {
      key: 'actions',
      header: 'Stock Actions',
      className: 'text-right whitespace-nowrap min-w-[240px]',
      render: (inv) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
          <button
            onClick={() => openManageStockModal(inv, 'ADD')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-800 text-white hover:bg-emerald-900 shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0"
            title="Add Units / Batch Restock"
          >
            <Plus className="h-3 w-3" />
            <span>Add Stock</span>
          </button>
          <button
            onClick={() => openManageStockModal(inv, 'REMOVE')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0"
            title="Remove / Deduct Damaged or Expired Units"
          >
            <Minus className="h-3 w-3" />
            <span>Remove</span>
          </button>
          <button
            onClick={() => openStockHistory(inv)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0"
            title="Inspect Stock Movement Ledger"
          >
            <History className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // -------------------------------------------------------------
  // ISSUED INVOICES COLUMNS (WITH REAL-TIME INSTANT SEARCH & DATE FILTER)
  // -------------------------------------------------------------
  const filteredInvoices = useMemo(() => {
    let result = invoices;

    if (invoiceDateFilter) {
      result = result.filter((inv: any) => isSameDay(inv.issuedAt || inv.createdAt, invoiceDateFilter));
    }

    if (invoiceSearch.trim()) {
      const q = invoiceSearch.toLowerCase().trim();
      result = result.filter((inv: any) => {
        const invNum = (inv.invoiceNumber || '').toLowerCase();
        const orderNum = (inv.order?.orderNumber || '').toLowerCase();
        const patient = (inv.order?.customer?.fullName || '').toLowerCase();
        const phone = (inv.order?.customer?.phoneNumber || '').toLowerCase();
        const city = (inv.order?.customer?.city || '').toLowerCase();
        const state = (inv.order?.customer?.state || '').toLowerCase();
        const matchesDate = matchesDateText(inv.issuedAt, q) || matchesDateText(inv.createdAt, q);

        return (
          invNum.includes(q) ||
          orderNum.includes(q) ||
          patient.includes(q) ||
          phone.includes(q) ||
          city.includes(q) ||
          state.includes(q) ||
          matchesDate
        );
      });
    }

    return result;
  }, [invoices, invoiceSearch, invoiceDateFilter]);

  const invoiceColumns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'GST Invoice #',
      className: 'whitespace-nowrap min-w-[170px]',
      render: (inv) => (
        <div className="space-y-1">
          <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap inline-block shadow-2xs">
            {inv.invoiceNumber}
          </span>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <Calendar className="h-3 w-3 text-emerald-700 shrink-0" />
            <span>
              {new Date(inv.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'orderNumber',
      header: 'Order Code',
      className: 'whitespace-nowrap min-w-[140px]',
      render: (inv) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          {inv.order?.orderNumber || 'N/A'}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer Details',
      className: 'min-w-[190px]',
      render: (inv) => (
        <div>
          <span className="font-bold text-xs text-slate-900 block">{inv.order?.customer?.fullName || 'N/A'}</span>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono mt-0.5">
            {inv.order?.customer?.phoneNumber && <span>📞 {inv.order.customer.phoneNumber}</span>}
          </div>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
            {[inv.order?.customer?.city, inv.order?.customer?.state].filter(Boolean).join(', ')}
          </span>
        </div>
      ),
    },
    {
      key: 'taxBifurcation',
      header: 'GST Breakdown',
      className: 'whitespace-nowrap min-w-[170px]',
      render: (inv) => {
        const isIntra = Number(inv.igstAmount) === 0;
        return (
          <div className="text-[11px] font-mono text-slate-700 space-y-0.5">
            {isIntra ? (
              <span className="block font-medium">
                CGST: ₹{Number(inv.cgstAmount).toFixed(2)} | SGST: ₹{Number(inv.sgstAmount).toFixed(2)}
              </span>
            ) : (
              <span className="block font-medium">IGST: ₹{Number(inv.igstAmount).toFixed(2)}</span>
            )}
            <span className="block text-[10px] text-slate-500 font-semibold">Total Tax: ₹{Number(inv.totalTax).toFixed(2)}</span>
          </div>
        );
      },
    },
    {
      key: 'grandTotal',
      header: 'Invoice Amount',
      className: 'whitespace-nowrap min-w-[140px]',
      render: (inv) => (
        <span className="font-mono text-sm font-black text-slate-900 block">
          ₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Fulfillment State',
      className: 'whitespace-nowrap min-w-[150px]',
      render: (inv) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs whitespace-nowrap">
          <Truck className="h-3 w-3 text-emerald-600 shrink-0" />
          <span>Billed • Dispatched</span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right whitespace-nowrap min-w-[150px]',
      render: (inv) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => openInvoiceDetail(inv.id)}
          className="text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 shadow-2xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View & Print Bill</span>
        </Button>
      ),
    },
  ];

  const billingQueueExportColumns: ExcelColumnDef[] = [
    { header: 'Order Reference', accessor: 'orderNumber' },
    { header: 'Order Date', accessor: (o: any) => o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '' },
    { header: 'Patient Name', accessor: 'customer.fullName' },
    { header: 'Contact Phone', accessor: 'customer.phoneNumber' },
    { header: 'City', accessor: 'customer.city' },
    { header: 'State', accessor: 'customer.state' },
    { header: 'Prescription Formulations', accessor: (o: any) => (o.items || []).map((it: any) => `${it.product?.name || 'Item'} (x${it.quantity})`).join(', ') },
    { header: 'Subtotal (₹)', accessor: (o: any) => Number(o.subtotal || 0) },
    { header: 'Tax Amount (₹)', accessor: (o: any) => Number(o.taxAmount || 0) },
    { header: 'Grand Total (₹)', accessor: (o: any) => Number(o.totalAmount || 0) },
    { header: 'Payment Mode', accessor: 'paymentMode' },
    { header: 'Approval Status', accessor: 'approvalStatus' },
  ];

  const stockExportColumns: ExcelColumnDef[] = [
    { header: 'Formulation SKU', accessor: 'skuCode' },
    { header: 'Product Name', accessor: 'productName' },
    { header: 'Dosage Form', accessor: (inv: any) => inv.product?.dosageForm || 'Formulation' },
    { header: 'Target Ailment', accessor: (inv: any) => inv.product?.category?.name || 'General Ayurvedic' },
    { header: 'Current Physical Stock', accessor: (inv: any) => Number(inv.currentStock || 0) },
    { header: 'Allocated in Transit', accessor: (inv: any) => Number(inv.allocatedStock || 0) },
    { header: 'Net Available Stock', accessor: (inv: any) => Number(inv.availableStock || 0) },
    { header: 'Safety Threshold', accessor: (inv: any) => Number(inv.minimumStockThreshold || 20) },
    { header: 'Latest Batch #', accessor: 'batchNumber' },
    { header: 'Batch Expiry', accessor: (inv: any) => inv.expiryDate ? new Date(inv.expiryDate).toLocaleDateString('en-IN') : '' },
    { header: 'Unit Price (₹)', accessor: (inv: any) => Number(inv.product?.sellingPrice || inv.product?.mrp || 0) },
  ];

  const billingInvoicesExportColumns: ExcelColumnDef[] = [
    { header: 'GST Invoice #', accessor: 'invoiceNumber' },
    { header: 'Invoice Date', accessor: (inv: any) => inv.issuedAt ? new Date(inv.issuedAt).toLocaleString('en-IN') : '' },
    { header: 'Order Reference', accessor: 'order.orderNumber' },
    { header: 'Patient Name', accessor: 'order.customer.fullName' },
    { header: 'Contact Phone', accessor: 'order.customer.phoneNumber' },
    { header: 'City', accessor: 'order.customer.city' },
    { header: 'State', accessor: 'order.customer.state' },
    { header: 'Subtotal (₹)', accessor: (inv: any) => Number(inv.subtotal || 0) },
    { header: 'CGST (₹)', accessor: (inv: any) => Number(inv.cgstAmount || 0) },
    { header: 'SGST (₹)', accessor: (inv: any) => Number(inv.sgstAmount || 0) },
    { header: 'IGST (₹)', accessor: (inv: any) => Number(inv.igstAmount || 0) },
    { header: 'Total GST (₹)', accessor: (inv: any) => Number(inv.totalTax || 0) },
    { header: 'Grand Total (₹)', accessor: (inv: any) => Number(inv.grandTotal || 0) },
    { header: 'Payment Mode', accessor: (inv: any) => inv.order?.paymentMode || 'COD' },
    { header: 'Status', accessor: 'status' },
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
            Manage warehouse inventory (add new batches, remove write-offs, calibrate counts), verify formulation stock allocation, and generate GST tax bills. Once billed, orders automatically transition to Courier Dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={activeTab === 'INVOICES' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('INVOICES')}
            className={activeTab === 'INVOICES' ? 'bg-emerald-800 text-white font-bold shadow-xs whitespace-nowrap' : 'text-slate-700 font-semibold whitespace-nowrap'}
            icon={<History className="h-3.5 w-3.5" />}
          >
            Billing History ({stats.totalInvoicesCount ?? invoices.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            className="whitespace-nowrap shadow-2xs"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('INVOICES')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <History className="h-3.5 w-3.5" />
              <span>Open Billing History ({stats.totalInvoicesCount ?? invoices.length}) →</span>
            </button>
            <button onClick={() => setSuccessMsg(null)} className="font-bold text-slate-400 hover:text-slate-700 px-1">✕</button>
          </div>
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
            {stats?.awaitingBillingCount ?? billingQueue.length}
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
          <History className="h-3.5 w-3.5" />
          <span>📜 Billing History & Issued Invoices</span>
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'INVOICES' ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {stats?.totalInvoicesCount ?? invoices.length}
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
            {stats?.totalInventoryCount ?? inventoryList.length}
          </span>
        </button>
      </div>

      {/* TAB 1: BILLING QUEUE */}
      {activeTab === 'QUEUE' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Approved Orders Ready for GST Invoicing</h3>
              <p className="text-xs text-slate-500">
                These formulation orders have passed medical sign-off and approval. Generate the official GST invoice to release each order into the Dispatch Queue.
              </p>
            </div>

            {/* Unified Search, Date Filter & Export Control Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search Text Input */}
                <div className="relative min-w-[260px] flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by order #, patient, phone, city, medicine, or date..."
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs font-medium"
                  />
                  {queueSearch && (
                    <button
                      type="button"
                      onClick={() => setQueueSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear Search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Date Picker Input */}
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                  <Calendar className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700">Date:</span>
                  <input
                    type="date"
                    value={queueDateFilter}
                    onChange={(e) => setQueueDateFilter(e.target.value)}
                    className="text-xs text-slate-800 bg-transparent focus:outline-none cursor-pointer font-semibold"
                  />
                  {queueDateFilter && (
                    <button
                      type="button"
                      onClick={() => setQueueDateFilter('')}
                      className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
                      title="Clear Date"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Date Pills */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQueueDateFilter('')}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      !queueDateFilter
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    All Dates
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueDateFilter(new Date().toISOString().split('T')[0])}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      queueDateFilter === new Date().toISOString().split('T')[0]
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setQueueDateFilter(new Date(Date.now() - 86400000).toISOString().split('T')[0])
                    }
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      queueDateFilter === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    Yesterday
                  </button>
                </div>
              </div>

              {/* Right: Export & Entry Count */}
              <div className="flex items-center gap-2 justify-end shrink-0">
                <ExportButton
                  data={filteredBillingQueue}
                  columns={billingQueueExportColumns}
                  fileName="Melayurveda_Billing_Queue"
                  sheetName="Awaiting Invoicing"
                  label="Export to Excel"
                />
                <span className="text-xs font-mono font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs whitespace-nowrap">
                  Showing {filteredBillingQueue.length} of {billingQueue.length} orders
                </span>
              </div>
            </div>

            <DataTable
              columns={queueColumns}
              data={filteredBillingQueue}
              isLoading={isLoadingQueue}
              emptyMessage="No approved orders currently awaiting billing. All caught up!"
              hideToolbar={true}
            />
          </div>
        </div>
      )}

      {/* TAB 2: WAREHOUSE STOCK (WITH ADD / REMOVE / ADJUST ACTIONS) */}
      {activeTab === 'STOCK' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Warehouse Stock & Batch Inventory Management</h3>
              <p className="text-xs text-slate-500">
                Full inventory control: add factory stock batches, write off damaged or expired items, calibrate count, and track chronological movements.
              </p>
            </div>

            {/* Unified Search & Quick Restock Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter stock by name, SKU, target ailment..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs font-medium"
                />
              </div>

              <div className="flex items-center gap-2 justify-end shrink-0">
                <button
                  onClick={openGeneralRestockModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-800 text-white hover:bg-emerald-900 shadow-sm transition shrink-0 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>+ Quick Restock</span>
                </button>
                <ExportButton
                  data={filteredStock}
                  columns={stockExportColumns}
                  fileName="Melayurveda_Warehouse_Stock"
                  sheetName="Warehouse Inventory"
                  label="Export to Excel"
                />
                <span className="text-xs font-mono font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs whitespace-nowrap">
                  Showing {filteredStock.length} SKUs
                </span>
              </div>
            </div>

            <DataTable
              columns={stockColumns}
              data={filteredStock}
              isLoading={isLoadingStock}
              emptyMessage="No inventory records found."
              hideToolbar={true}
            />
          </div>
        </div>
      )}

      {/* TAB 3: ISSUED INVOICES (BILLING HISTORY) */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-700" />
                Statutory Billing History & GST Invoices Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Historical archive of all issued GST tax bills and commercial invoices. Track chronological billing records, print tax invoices, and verify dispatch transitions.
              </p>
            </div>

            {/* Unified Search, Date Filter & Export Control Bar for Invoices */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search Text Input */}
                <div className="relative min-w-[260px] flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search billing history by invoice #, order #, patient, phone, or date..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs font-medium"
                  />
                  {invoiceSearch && (
                    <button
                      type="button"
                      onClick={() => setInvoiceSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear Search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Date Picker Input */}
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                  <Calendar className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700">Date:</span>
                  <input
                    type="date"
                    value={invoiceDateFilter}
                    onChange={(e) => setInvoiceDateFilter(e.target.value)}
                    className="text-xs text-slate-800 bg-transparent focus:outline-none cursor-pointer font-semibold"
                  />
                  {invoiceDateFilter && (
                    <button
                      type="button"
                      onClick={() => setInvoiceDateFilter('')}
                      className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
                      title="Clear Date"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Date Pills */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setInvoiceDateFilter('')}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      !invoiceDateFilter
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    All Dates
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceDateFilter(new Date().toISOString().split('T')[0])}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      invoiceDateFilter === new Date().toISOString().split('T')[0]
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInvoiceDateFilter(new Date(Date.now() - 86400000).toISOString().split('T')[0])
                    }
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      invoiceDateFilter === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    Yesterday
                  </button>
                </div>
              </div>

              {/* Right: Export & Entry Count */}
              <div className="flex items-center gap-2 justify-end shrink-0">
                <ExportButton
                  data={filteredInvoices}
                  columns={billingInvoicesExportColumns}
                  fileName="Melayurveda_Billing_History_Invoices"
                  sheetName="Issued GST Invoices"
                  label="Export to Excel"
                />
                <span className="text-xs font-mono font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs whitespace-nowrap">
                  Showing {filteredInvoices.length} of {invoices.length} bills
                </span>
              </div>
            </div>

            <DataTable
              columns={invoiceColumns}
              data={filteredInvoices}
              isLoading={isLoadingInvoices}
              emptyMessage="No GST tax invoices issued yet in billing history."
              hideToolbar={true}
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

      {/* MANAGE STOCK MODAL (ADD / REMOVE / CALIBRATE) */}
      <Modal
        isOpen={!!selectedInventoryForManage || isGeneralRestockOpen}
        onClose={() => {
          setSelectedInventoryForManage(null);
          setIsGeneralRestockOpen(false);
        }}
        title={
          selectedInventoryForManage
            ? `Manage Warehouse Stock: ${selectedInventoryForManage.product?.name}`
            : 'Warehouse Stock Replenishment'
        }
        description="Add new factory batches, deduct damaged or expired units, or calibrate physical warehouse count."
      >
        <form onSubmit={handleStockSubmit} className="space-y-4 text-xs text-slate-700">
          {/* Product Selector for General Restock */}
          {isGeneralRestockOpen && !selectedInventoryForManage && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Select Formulation SKU</label>
              <select
                value={generalProductId}
                onChange={(e) => setGeneralProductId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                required
              >
                {inventoryList.map((inv) => (
                  <option key={inv.product?.id || inv.productId} value={inv.product?.id || inv.productId}>
                    {inv.product?.name} ({inv.product?.sku}) • Available: {inv.availableQuantity} units
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Current Stock Banner */}
          {selectedInventoryForManage && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">{selectedInventoryForManage.product?.name}</span>
                <span className="text-[10px] font-mono text-slate-400 block">{selectedInventoryForManage.product?.sku}</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-sm text-emerald-800 block">
                  {selectedInventoryForManage.availableQuantity} Units
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Reserved: {selectedInventoryForManage.reservedQuantity}
                </span>
              </div>
            </div>
          )}

          {/* Operation Mode Selector */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Select Stock Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setStockAction('ADD');
                  setStockReason('Factory Restock Batch');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition cursor-pointer ${
                  stockAction === 'ADD'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-600/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Plus className="h-4 w-4 text-emerald-700" />
                <span>Add Stock</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStockAction('REMOVE');
                  setStockReason('Damaged Packaging');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition cursor-pointer ${
                  stockAction === 'REMOVE'
                    ? 'bg-rose-50 text-rose-800 border-rose-400 ring-2 ring-rose-600/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Minus className="h-4 w-4 text-rose-700" />
                <span>Remove Stock</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStockAction('SET_COUNT');
                  setStockReason('Audit Physical Count');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition cursor-pointer ${
                  stockAction === 'SET_COUNT'
                    ? 'bg-blue-50 text-blue-800 border-blue-400 ring-2 ring-blue-600/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4 text-blue-700" />
                <span>Calibrate</span>
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {stockAction === 'ADD'
                  ? 'Units to Add'
                  : stockAction === 'REMOVE'
                  ? 'Units to Deduct'
                  : 'New Exact Unit Count'}
              </label>
              <input
                type="number"
                min="1"
                max={
                  stockAction === 'REMOVE' && selectedInventoryForManage
                    ? selectedInventoryForManage.availableQuantity
                    : 999999
                }
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Low-Stock Threshold
              </label>
              <input
                type="number"
                min="1"
                value={stockThreshold}
                onChange={(e) => setStockThreshold(Math.max(1, parseInt(e.target.value) || 20))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Reason & Batch Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Category</label>
              {stockAction === 'REMOVE' ? (
                <select
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                >
                  <option value="Damaged Packaging">Damaged Packaging</option>
                  <option value="Expired Formulation">Expired Formulation</option>
                  <option value="Quality Scrap / QC Rejection">Quality Scrap / QC Rejection</option>
                  <option value="Doctor Sampling / Promotion">Doctor Sampling / Promotion</option>
                  <option value="Audit Physical Discrepancy">Audit Physical Discrepancy</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  placeholder="e.g. Factory Batch Inward"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch # / Lot Ref</label>
              <input
                type="text"
                value={stockBatch}
                onChange={(e) => setStockBatch(e.target.value)}
                placeholder="e.g. BATCH-2026-NOV-15"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Notes (Optional)</label>
            <input
              type="text"
              value={stockNotes}
              onChange={(e) => setStockNotes(e.target.value)}
              placeholder="e.g. Received from Bharuch manufacturing unit via transport manifest"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          {/* Live Balance Preview Calculation */}
          {(() => {
            const current = selectedInventoryForManage ? selectedInventoryForManage.availableQuantity : 100;
            let after = current;
            if (stockAction === 'ADD') after = current + stockQuantity;
            else if (stockAction === 'REMOVE') after = Math.max(0, current - stockQuantity);
            else if (stockAction === 'SET_COUNT') after = stockQuantity;

            return (
              <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Balance Impact</span>
                  <span className="text-slate-700">
                    Current: <strong>{current} Units</strong> ➔ New: <strong>{after} Units</strong>
                  </span>
                </div>
                <span className="font-mono font-black text-sm text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                  {stockAction === 'ADD' ? `+${stockQuantity}` : stockAction === 'REMOVE' ? `-${stockQuantity}` : `=${after}`} Units
                </span>
              </div>
            );
          })()}

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedInventoryForManage(null);
                setIsGeneralRestockOpen(false);
              }}
              disabled={isSubmittingStock}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmittingStock}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
            >
              Confirm & Save Stock Update
            </Button>
          </div>
        </form>
      </Modal>

      {/* STOCK HISTORY DRAWER */}
      <Drawer
        isOpen={!!selectedInventoryForHistory}
        onClose={() => {
          setSelectedInventoryForHistory(null);
          setHistoryTransactions([]);
        }}
        title={`Stock Movement Ledger: ${selectedInventoryForHistory?.product?.name || ''}`}
        width="lg"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-900 block">{selectedInventoryForHistory?.product?.name}</span>
              <span className="font-mono text-[10px] text-slate-500 block">SKU: {selectedInventoryForHistory?.product?.sku}</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-sm text-emerald-800 block">
                {selectedInventoryForHistory?.availableQuantity} Units Available
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                Threshold: {selectedInventoryForHistory?.lowStockThreshold} Units
              </span>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading chronological ledger...</div>
          ) : historyTransactions.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">No previous inventory transactions recorded.</div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5">Operation</th>
                    <th className="p-2.5 text-center">Change</th>
                    <th className="p-2.5 text-right">Balance</th>
                    <th className="p-2.5">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {historyTransactions.map((tx, idx) => {
                    const isPositive = tx.quantity > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}{' '}
                          {new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                              tx.type === 'RESTOCK'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : tx.type === 'ADJUSTMENT'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-bold">
                          <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                            {isPositive ? `+${tx.quantity}` : tx.quantity}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{tx.balanceAfter}</td>
                        <td className="p-2.5 text-[10px] text-slate-600 font-sans max-w-xs truncate" title={tx.notes}>
                          {tx.notes || 'Automated transaction'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Drawer>

      {/* OFFICIAL PRINTABLE TAX INVOICE DRAWER */}
      <Drawer
        isOpen={!!selectedInvoiceId}
        onClose={() => {
          setSelectedInvoiceId(null);
          setInvoiceDetail(null);
        }}
        title="Official GST Tax Invoice & Delivery Bill"
        width="3xl"
      >
        {loadingInvoiceDetail ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading tax bill...</div>
        ) : !invoiceDetail ? (
          <div className="py-20 text-center text-xs text-slate-400">Invoice document not found</div>
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

export default function BillingWorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Billing Workspace...</div>}>
      <BillingWorkspaceContent />
    </Suspense>
  );
}
