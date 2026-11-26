'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { Drawer } from '../../../components/ui/drawer';
import {
  RotateCcw,
  PhoneCall,
  Phone,
  Package,
  Boxes,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Calendar,
  Search,
  Filter,
  Eye,
  RefreshCw,
  PlusCircle,
  FileText,
  DollarSign,
  Send,
  Check,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  History,
  X,
  CreditCard,
  UserCheck,
} from 'lucide-react';

export default function ReturnOrdersPage() {
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'HISTORY'>('QUEUE');

  const [queue, setQueue] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter state
  const [queueSearch, setQueueSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyReasonFilter, setHistoryReasonFilter] = useState('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');

  // Process / Call Modal state
  const [activeReturn, setActiveReturn] = useState<any | null>(null);
  const [callOutcome, setCallOutcome] = useState('CONNECTED');
  const [selectedReason, setSelectedReason] = useState('CUSTOMER_REFUSED');
  const [customerRemarks, setCustomerRemarks] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [returnFeeCharged, setReturnFeeCharged] = useState<number>(0);
  const [feePaymentMode, setFeePaymentMode] = useState('WAIVED');
  const [feePaymentRef, setFeePaymentRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inspect Drawer state
  const [inspectingReturn, setInspectingReturn] = useState<any | null>(null);

  // Manual Initiate Modal state
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
  const [ordersForReturn, setOrdersForReturn] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [initiateReason, setInitiateReason] = useState('CUSTOMER_REFUSED');
  const [initiateRemarks, setInitiateRemarks] = useState('');
  const [initiateSearchQuery, setInitiateSearchQuery] = useState('');
  const [isInitiating, setIsInitiating] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/returns/stats');
      setStats(res.data);
    } catch (err: any) {
      // Quiet fail for stats
    }
  };

  const fetchQueue = async () => {
    try {
      setIsLoadingQueue(true);
      setError(null);
      const res = await apiClient.get('/returns/queue');
      setQueue(res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      setError(null);
      const params = new URLSearchParams();
      if (historyReasonFilter !== 'ALL') params.append('reason', historyReasonFilter);
      if (historyStatusFilter !== 'ALL') params.append('status', historyStatusFilter);
      if (historySearch.trim()) params.append('search', historySearch.trim());

      const res = await apiClient.get(`/returns/history?${params.toString()}`);
      setHistory(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchOrdersForInitiation = async () => {
    try {
      const res = await apiClient.get('/orders?limit=50');
      const allOrders = res.data?.data || res.data || [];
      // Filter orders that can be returned (not DRAFT, not already returned)
      const eligible = allOrders.filter(
        (o: any) => o.status === 'SHIPPED' || o.status === 'CONFIRMED' || o.status === 'DELIVERED',
      );
      setOrdersForReturn(eligible);
      if (eligible.length > 0) setSelectedOrderId(eligible[0].id);
    } catch (err: any) {
      // Quiet
    }
  };

  const refreshAll = () => {
    fetchStats();
    if (activeTab === 'QUEUE') fetchQueue();
    else fetchHistory();
  };

  useEffect(() => {
    fetchStats();
    fetchQueue();
  }, []);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory();
    }
  }, [activeTab, historyReasonFilter, historyStatusFilter]);

  // Open Process Modal
  const openProcessModal = (record: any) => {
    setActiveReturn(record);
    setCallOutcome(record.callOutcome || 'CONNECTED');
    setSelectedReason(record.returnReason || 'CUSTOMER_REFUSED');
    setCustomerRemarks(record.customerRemarks || '');
    setCallNotes(record.callNotes || '');
    setReturnFeeCharged(Number(record.returnFeeCharged || 0));
    setFeePaymentMode(record.feePaymentMode || 'WAIVED');
    setFeePaymentRef(record.feePaymentRef || '');
  };

  // Submit Call Log only
  const handleSaveCallProgress = async () => {
    if (!activeReturn) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await apiClient.post(`/returns/${activeReturn.id}/call-log`, {
        callOutcome,
        returnReason: selectedReason,
        customerRemarks: customerRemarks.trim() || undefined,
        callNotes: callNotes.trim() || undefined,
      });

      setSuccessMsg(`Call progress saved for Return ${activeReturn.returnCode}. Client notes updated.`);
      setActiveReturn(null);
      refreshAll();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Final Settlement (Restock or Re-attempt)
  const handleResolveReturn = async (resolutionStatus: string) => {
    if (!activeReturn) return;
    try {
      setIsSubmitting(true);
      setError(null);

      // First ensure call log is updated
      await apiClient.post(`/returns/${activeReturn.id}/call-log`, {
        callOutcome,
        returnReason: selectedReason,
        customerRemarks: customerRemarks.trim() || undefined,
        callNotes: callNotes.trim() || undefined,
      });

      // Then execute resolution
      const res = await apiClient.post(`/returns/${activeReturn.id}/resolve`, {
        resolutionStatus,
        returnFeeCharged: Number(returnFeeCharged) || 0,
        feePaymentMode,
        feePaymentRef: feePaymentRef.trim() || undefined,
        settlementNotes: callNotes.trim() || undefined,
      });

      const msg =
        resolutionStatus === 'RESTOCKED_AND_CLOSED'
          ? `Return ${activeReturn.returnCode} resolved! Formulations restocked to warehouse inventory pool and order closed.`
          : `Return ${activeReturn.returnCode} scheduled for delivery re-attempt. Package re-queued in Courier Dispatch.`;

      setSuccessMsg(msg);
      setActiveReturn(null);
      refreshAll();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Initiate Return Submit
  const handleInitiateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    try {
      setIsInitiating(true);
      setError(null);
      const res = await apiClient.post('/returns/initiate', {
        orderId: selectedOrderId,
        returnReason: initiateReason,
        remarks: initiateRemarks.trim() || undefined,
      });

      setSuccessMsg(`Return case ${res.data?.returnCode} successfully initiated and added to Active Queue.`);
      setIsInitiateModalOpen(false);
      setInitiateRemarks('');
      refreshAll();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsInitiating(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'CUSTOMER_REFUSED':
        return 'Customer Refused at Doorstep';
      case 'CUSTOMER_UNAVAILABLE':
        return 'Customer Unavailable / House Locked';
      case 'WRONG_ADDRESS_PHONE':
        return 'Wrong Address / Phone';
      case 'DELIVERY_DELAYED':
        return 'Delivery Delayed by Courier';
      case 'FINANCIAL_ISSUE':
        return 'Financial / COD Cash Shortage';
      case 'HEALTH_RECOVERY':
        return 'Condition Cured / Alternate Therapy';
      case 'ORDER_MISTAKE':
        return 'Accidental / Mistaken Order';
      case 'PACKAGE_DAMAGED':
        return 'Transit Damage / Leaking';
      case 'PRICE_DISPUTE':
        return 'Price / Discount Dispute';
      default:
        return 'Other / Custom Reason';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_CALL':
        return <Badge variant="warning">PENDING CALL</Badge>;
      case 'CALL_CONNECTED':
        return <Badge variant="info">CALL CONNECTED</Badge>;
      case 'CUSTOMER_UNREACHABLE':
        return <Badge variant="danger">UNREACHABLE</Badge>;
      case 'RE_ATTEMPT_SCHEDULED':
        return <Badge variant="gold">RE-ATTEMPT SCHEDULED</Badge>;
      case 'RESTOCKED_AND_CLOSED':
        return <Badge variant="success">RESTOCKED & CLOSED</Badge>;
      case 'RETURN_APPROVED':
        return <Badge variant="success">RETURN APPROVED</Badge>;
      case 'REJECTED':
        return <Badge variant="slate">CLAIM REJECTED</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    if (!queueSearch.trim()) return queue;
    const q = queueSearch.toLowerCase();
    return queue.filter((r) => {
      const code = (r.returnCode || '').toLowerCase();
      const orderNum = (r.order?.orderNumber || '').toLowerCase();
      const name = (r.order?.customer?.fullName || '').toLowerCase();
      const phone = (r.order?.customer?.phoneNumber || '').toLowerCase();
      const city = (r.order?.customer?.city || '').toLowerCase();
      return (
        code.includes(q) ||
        orderNum.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        city.includes(q)
      );
    });
  }, [queue, queueSearch]);

  // Filtered Orders for Return Initiation
  const filteredOrdersForReturn = useMemo(() => {
    if (!initiateSearchQuery.trim()) return ordersForReturn;
    const q = initiateSearchQuery.toLowerCase();
    return ordersForReturn.filter((ord: any) => {
      const orderNum = (ord.orderNumber || '').toLowerCase();
      const name = (ord.customer?.fullName || '').toLowerCase();
      const phone = (ord.customer?.phoneNumber || '').toLowerCase();
      const city = (ord.customer?.city || '').toLowerCase();
      const state = (ord.customer?.state || '').toLowerCase();
      return (
        orderNum.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        city.includes(q) ||
        state.includes(q)
      );
    });
  }, [ordersForReturn, initiateSearchQuery]);

  // Selected Order Details for Preview
  const selectedOrderDetails = useMemo(() => {
    return ordersForReturn.find((o) => o.id === selectedOrderId) || null;
  }, [ordersForReturn, selectedOrderId]);

  // History Columns
  const historyColumns: Column<any>[] = [
    {
      key: 'returnCode',
      header: 'Return Reference',
      render: (item) => (
        <div className="space-y-0.5">
          <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
            {item.returnCode}
          </span>
          <span className="block font-mono text-[11px] text-slate-500 font-semibold">
            {item.order?.orderNumber}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Client & Destination',
      render: (item) => (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 text-xs block">
            {item.order?.customer?.fullName || 'Valued Customer'}
          </span>
          {item.order?.customer?.phoneNumber && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
              <Phone className="h-3 w-3 text-slate-400" />
              {item.order.customer.phoneNumber}
            </span>
          )}
          <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
            {[item.order?.customer?.city, item.order?.customer?.state].filter(Boolean).join(', ') || 'Gujarat'}
          </span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Return Root Cause',
      render: (item) => (
        <div className="space-y-1">
          <span className="font-bold text-slate-800 text-xs block">
            {getReasonLabel(item.returnReason)}
          </span>
          {item.customerRemarks && (
            <p className="text-[10px] text-slate-500 italic line-clamp-1 max-w-[220px]" title={item.customerRemarks}>
              &quot;{item.customerRemarks}&quot;
            </p>
          )}
          {item.callOutcome && (
            <span className="inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Call: {item.callOutcome}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Settlement Status',
      render: (item) => (
        <div className="space-y-1">
          {getStatusBadge(item.status)}
          {item.isRestocked ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Restocked to Warehouse</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 block">Not Restocked</span>
          )}
        </div>
      ),
    },
    {
      key: 'fees',
      header: 'Return Fee Collected',
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-xs text-forest-800">
            ₹{Number(item.returnFeeCharged || 0).toFixed(2)}
          </span>
          {item.feePaymentMode && item.feePaymentMode !== 'WAIVED' && (
            <span className="block font-mono text-[10px] text-slate-500">
              via {item.feePaymentMode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'handledBy',
      header: 'Handling Officer',
      render: (item) => (
        <div className="text-xs text-slate-600 font-mono">
          <span className="font-semibold text-slate-800 block">
            {item.handledBy ? `${item.handledBy.firstName} ${item.handledBy.lastName}` : 'Operations Desk'}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {item.handledBy?.employeeCode || 'MEL-MGT'}
          </span>
        </div>
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
          onClick={() => setInspectingReturn(item)}
          icon={<Eye className="h-3 w-3" />}
          title="Inspect Full Return Audit Log"
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-forest-800 uppercase tracking-widest">
              MEL-MGT-001
            </span>
            <Badge variant="role">Return & RTO Operations</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Return Orders & RTO Investigation Desk
          </h2>
          <p className="text-xs text-slate-500">
            Audit undelivered courier consignments, call customers to record cancellation root cause, recover return shipping fees, and restock warehouse inventories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            isLoading={isLoadingQueue || isLoadingHistory}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              fetchOrdersForInitiation();
              setIsInitiateModalOpen(true);
            }}
            icon={<PlusCircle className="h-3.5 w-3.5" />}
          >
            Initiate Return
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

      {/* Top KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Active Inquiries */}
        <div
          onClick={() => setActiveTab('QUEUE')}
          className={`cursor-pointer rounded-xl border p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            activeTab === 'QUEUE'
              ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/50'
              : 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'
          }`}
          title="Click to view Active Returns Queue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Pending Client Calls
            </span>
            <PhoneCall className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950 font-mono">
            {stats?.pendingCalls ?? queue.length}
          </div>
          <p className="mt-0.5 text-[11px] text-amber-700 flex items-center justify-between">
            <span>Needs customer investigation</span>
            <ChevronRight className="h-3 w-3 opacity-60" />
          </p>
        </div>

        {/* Card 2: Re-Attempts */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Re-Attempts Scheduled
            </span>
            <RotateCcw className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-950 font-mono">
            {stats?.reAttempts ?? 0}
          </div>
          <p className="mt-0.5 text-[11px] text-blue-700">Client agreed to receive parcel</p>
        </div>

        {/* Card 3: Return Fees Recovered */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Return Fees Recovered
            </span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-950 font-mono">
            ₹{Number(stats?.totalFeeCollected ?? 0).toFixed(2)}
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-700">Courier losses recovered from clients</p>
        </div>

        {/* Card 4: Historical Restocked */}
        <div
          onClick={() => setActiveTab('HISTORY')}
          className={`cursor-pointer rounded-xl border p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            activeTab === 'HISTORY'
              ? 'border-forest-600 bg-forest-50/40 ring-2 ring-forest-500/50'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
          title="Click to view Return History"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Restocked to Warehouse
            </span>
            <Boxes className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {stats?.totalRestocked ?? history.length}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Historical restocked consignments</span>
            <ChevronRight className="h-3 w-3 opacity-60" />
          </p>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 flex flex-wrap items-center gap-1.5 md:gap-2 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('QUEUE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'QUEUE'
                ? 'bg-forest-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Active Returns Queue</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'QUEUE'
                  ? 'bg-forest-800 text-forest-100'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {queue.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-forest-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Return History & RTO Ledger</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'HISTORY'
                  ? 'bg-forest-800 text-forest-100'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {history.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {activeTab === 'QUEUE' ? (
            <span>Orders awaiting customer telephone outreach and reason logging</span>
          ) : (
            <span>Audited ledger of closed and restocked returns</span>
          )}
        </div>
      </div>

      {/* TAB 1: ACTIVE RETURNS QUEUE */}
      {activeTab === 'QUEUE' && (
        <div className="space-y-4">
          {/* Queue Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Undelivered & Returned Consignments Awaiting Call
                </h3>
                <p className="text-[11px] text-slate-500">
                  Call the customer directly to understand refusal reasons, collect return courier charges, or re-dispatch.
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Return #, Order #, Name..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-forest-600"
              />
            </div>
          </div>

          {/* Queue Cards List */}
          {isLoadingQueue ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-forest-700" />
              <span>Loading active returns queue...</span>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-800">
                {queue.length === 0
                  ? 'No pending returns in queue! All deliveries are in good standing.'
                  : 'No return orders match your search keyword.'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {queue.length === 0
                  ? 'When a consignment delivery fails or courier marks RTO, it automatically queues here for investigation.'
                  : 'Try clearing your search query to see all pending returns.'}
              </p>
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQueueSearch('')}
                  className="mt-3 text-xs font-bold text-forest-700 hover:underline"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((item) => {
                const customer = item.order?.customer;
                const addressStr = [
                  customer?.address,
                  customer?.city,
                  customer?.state,
                  customer?.pincode,
                ]
                  .filter(Boolean)
                  .join(', ');

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-forest-500/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          {item.returnCode}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded">
                          Order: {item.order?.orderNumber}
                        </span>
                        {getStatusBadge(item.status)}
                        {item.shipment?.trackingAwb && (
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            AWB: {item.shipment.trackingAwb} ({item.shipment.courierPartner})
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded">
                          {item.order?.paymentMode === 'CASH_ON_DELIVERY' ? 'COD' : 'PREPAID'} • ₹
                          {Number(item.order?.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 font-medium">
                        <span className="font-bold text-slate-900">{customer?.fullName}</span>
                        {customer?.phoneNumber && (
                          <a
                            href={`tel:${customer.phoneNumber}`}
                            className="flex items-center gap-1 text-forest-700 hover:text-forest-900 hover:underline font-mono text-[11px]"
                            title="Click to dial client"
                          >
                            <PhoneCall className="h-3 w-3" />
                            {customer.phoneNumber}
                          </a>
                        )}
                        <span className="text-[11px] text-slate-400">
                          Call attempts: {item.callAttemptCount || 1}
                        </span>
                      </div>

                      <div className="flex items-start gap-1 text-[11px] text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <span className="line-clamp-1">{addressStr || 'Gujarat, India'}</span>
                      </div>

                      {item.customerRemarks && (
                        <div className="text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200">
                          <span className="font-bold">Initial Courier/Customer Note: </span>
                          <span>{item.customerRemarks}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-700">Prescription Medicines: </span>
                        {item.order?.items && item.order.items.length > 0 ? (
                          item.order.items
                            .map((it: any) => `${it.product?.name} (Qty: ${it.quantity})`)
                            .join(', ')
                        ) : (
                          'Standard Ayurvedic Formulation'
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openProcessModal(item)}
                        icon={<PhoneCall className="h-3.5 w-3.5" />}
                      >
                        Call Client & Process Return
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RETURN HISTORY & RTO LEDGER */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="h-4 w-4 text-forest-700" />
                  <span>Audited Return & RTO Historical Ledger</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive audit record of all resolved returns, collected courier fees, customer feedback, and warehouse restocking.
                </p>
              </div>

              {/* Status Tabs with no-scrollbar */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto no-scrollbar w-fit">
                {[
                  { id: 'ALL', label: 'All Closed' },
                  { id: 'RESTOCKED_AND_CLOSED', label: 'Restocked' },
                  { id: 'RE_ATTEMPT_SCHEDULED', label: 'Re-attempts' },
                  { id: 'REJECTED', label: 'Rejected' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setHistoryStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition ${
                      historyStatusFilter === st.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Return #, Order #, Customer Name, Phone..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-forest-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-[11px] font-bold text-slate-600 shrink-0">Return Reason:</label>
                <select
                  value={historyReasonFilter}
                  onChange={(e) => setHistoryReasonFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-forest-600"
                >
                  <option value="ALL">All Reasons</option>
                  <option value="CUSTOMER_REFUSED">Customer Refused</option>
                  <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable</option>
                  <option value="DELIVERY_DELAYED">Delivery Delayed</option>
                  <option value="FINANCIAL_ISSUE">Financial / Cash Shortage</option>
                  <option value="HEALTH_RECOVERY">Condition Cured</option>
                  <option value="ORDER_MISTAKE">Accidental Order</option>
                  <option value="PACKAGE_DAMAGED">Package Damaged</option>
                  <option value="OTHER">Other</option>
                </select>

                {(historySearch || historyReasonFilter !== 'ALL' || historyStatusFilter !== 'ALL') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHistorySearch('');
                      setHistoryReasonFilter('ALL');
                      setHistoryStatusFilter('ALL');
                    }}
                    icon={<RotateCcw className="h-3 w-3" />}
                    title="Reset filters"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* DataTable */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <DataTable
              columns={historyColumns}
              data={history}
              isLoading={isLoadingHistory}
              emptyMessage={
                historySearch || historyReasonFilter !== 'ALL'
                  ? 'No historical returns match your search filter.'
                  : 'No historical returns recorded yet.'
              }
            />
          </div>
        </div>
      )}

      {/* CALL CLIENT & PROCESS RETURN MODAL */}
      <Modal
        isOpen={!!activeReturn}
        onClose={() => setActiveReturn(null)}
        title="Customer Outreach & Return Investigation"
        description={`Return File: ${activeReturn?.returnCode} • Order ${activeReturn?.order?.orderNumber}`}
        maxWidth="lg"
      >
        {activeReturn && (
          <div className="space-y-4 text-xs">
            {/* Customer & Order Summary Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">
                    {activeReturn.order?.customer?.fullName}
                  </span>
                  <a
                    href={`tel:${activeReturn.order?.customer?.phoneNumber}`}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-forest-700 hover:text-forest-900 hover:underline mt-0.5"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>{activeReturn.order?.customer?.phoneNumber}</span>
                  </a>
                </div>

                <div className="text-right sm:text-right">
                  <span className="font-mono text-xs font-bold text-forest-900 block">
                    ₹{Number(activeReturn.order?.totalAmount || 0).toFixed(2)} (
                    {activeReturn.order?.paymentMode === 'CASH_ON_DELIVERY' ? 'COD' : 'PREPAID'})
                  </span>
                  {activeReturn.order?.invoice?.invoiceNumber && (
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Inv: {activeReturn.order.invoice.invoiceNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-600">Delivery Address: </span>
                <span>
                  {[
                    activeReturn.order?.customer?.address,
                    activeReturn.order?.customer?.city,
                    activeReturn.order?.customer?.state,
                    activeReturn.order?.customer?.pincode,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Gujarat, India'}
                </span>
              </div>

              <div className="text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700">Formulations: </span>
                {activeReturn.order?.items && activeReturn.order.items.length > 0 ? (
                  activeReturn.order.items
                    .map((it: any) => `${it.product?.name} (${it.quantity}x)`)
                    .join(', ')
                ) : (
                  'Ayurvedic Medication'
                )}
              </div>
            </div>

            {/* Step 1: Telephone Call Outreach */}
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-forest-700" />
                <span>1. Telephonic Call Outcome & Root Cause</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Call Outcome *</label>
                  <select
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                  >
                    <option value="CONNECTED">Connected - Spoke to Customer</option>
                    <option value="NO_ANSWER">No Answer - Rang through</option>
                    <option value="BUSY">Line Busy</option>
                    <option value="SWITCHED_OFF">Switched Off / Out of Coverage</option>
                    <option value="WRONG_NUMBER">Incorrect Phone Number</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Return / Cancellation Reason *</label>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                  >
                    <option value="CUSTOMER_REFUSED">Customer Refused at Doorstep</option>
                    <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable / House Locked</option>
                    <option value="DELIVERY_DELAYED">Delivery Delayed by Courier</option>
                    <option value="FINANCIAL_ISSUE">Financial Constraint / Cash Shortage</option>
                    <option value="HEALTH_RECOVERY">Condition Cured / Alternate Therapy</option>
                    <option value="ORDER_MISTAKE">Ordered Accidental / By Mistake</option>
                    <option value="WRONG_ADDRESS_PHONE">Wrong Address / Phone Number</option>
                    <option value="PACKAGE_DAMAGED">Package Damaged in Transit</option>
                    <option value="PRICE_DISPUTE">Price / Discount Disagreement</option>
                    <option value="OTHER">Other Custom Reason</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Verbatim Explanation / Feedback
                </label>
                <textarea
                  rows={2}
                  placeholder="Record client's exact words: why did they not receive or refuse the package?..."
                  value={customerRemarks}
                  onChange={(e) => setCustomerRemarks(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Executive Internal Observation Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal audit observations, customer mood, follow-up instructions..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Step 2: Return Fee Recovery */}
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-forest-700" />
                <span>2. Return / Courier Shipping Charge Recovery (If Applicable)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount Recovered (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={returnFeeCharged}
                    onChange={(e) => setReturnFeeCharged(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:border-forest-600 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={feePaymentMode}
                    onChange={(e) => setFeePaymentMode(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                  >
                    <option value="WAIVED">Waived / Nil Recovery</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="CASH">Cash Collected</option>
                    <option value="NET_BANKING">Net Banking / NEFT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Transaction / UTR Ref
                  </label>
                  <input
                    type="text"
                    value={feePaymentRef}
                    onChange={(e) => setFeePaymentRef(e.target.value)}
                    placeholder="UPI Ref ID / Receipt #"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono focus:border-forest-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Resolution Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveCallProgress}
                isLoading={isSubmitting}
                title="Save call outcome without closing case"
              >
                Save Call Progress
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolveReturn('RE_ATTEMPT_SCHEDULED')}
                  isLoading={isSubmitting}
                  icon={<RotateCcw className="h-3 w-3" />}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  title="Client agreed to receive: re-queue for courier delivery"
                >
                  Schedule Re-Attempt
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleResolveReturn('RESTOCKED_AND_CLOSED')}
                  isLoading={isSubmitting}
                  icon={<Boxes className="h-3 w-3" />}
                  title="Return verified: restock medicines to warehouse inventory & close order"
                >
                  Approve Return & Restock
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* INSPECT RETURN DRAWER */}
      <Drawer
        isOpen={!!inspectingReturn}
        onClose={() => setInspectingReturn(null)}
        title="Return & RTO Audit Ledger"
        subtitle={`Return Ref: ${inspectingReturn?.returnCode} • Order ${inspectingReturn?.order?.orderNumber}`}
        width="xl"
      >
        {inspectingReturn && (
          <div className="p-6 space-y-6 text-xs">
            {/* Status Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Return Reference
                  </span>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                    {inspectingReturn.returnCode}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Current Status
                  </span>
                  {getStatusBadge(inspectingReturn.status)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Warehouse Restock Status:</span>
                {inspectingReturn.isRestocked ? (
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Inventory Restocked on {new Date(inspectingReturn.restockedAt || inspectingReturn.updatedAt).toLocaleDateString()}</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Inventory Not Restocked</span>
                )}
              </div>
            </div>

            {/* Customer & Address */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-forest-700" />
                <span>Recipient Client Details</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Full Name</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {inspectingReturn.order?.customer?.fullName || 'Customer'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Phone</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {inspectingReturn.order?.customer?.phoneNumber || 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block">Shipping Address</span>
                  <span className="text-slate-700 text-xs leading-relaxed">
                    {[
                      inspectingReturn.order?.customer?.address,
                      inspectingReturn.order?.customer?.city,
                      inspectingReturn.order?.customer?.state,
                      inspectingReturn.order?.customer?.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Gujarat, India'}
                  </span>
                </div>
              </div>
            </div>

            {/* Return Reason & Call Audit */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <PhoneCall className="h-3.5 w-3.5 text-forest-700" />
                <span>Call Investigation & Verified Reason</span>
              </h4>

              <div className="space-y-2 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Root Cause</span>
                  <span className="font-bold text-slate-900 text-xs block">
                    {getReasonLabel(inspectingReturn.returnReason)}
                  </span>
                </div>

                {inspectingReturn.customerRemarks && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Customer Feedback Statement
                    </span>
                    <p className="text-slate-800 text-xs italic">
                      &quot;{inspectingReturn.customerRemarks}&quot;
                    </p>
                  </div>
                )}

                {inspectingReturn.callNotes && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Internal Executive Notes
                    </span>
                    <p className="text-slate-700 text-xs whitespace-pre-line">
                      {inspectingReturn.callNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Recovery */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-forest-700" />
                <span>Return / Courier Fee Recovery</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Fee Recovered</span>
                  <span className="font-mono font-bold text-forest-800 text-sm">
                    ₹{Number(inspectingReturn.returnFeeCharged || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Payment Mode</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {inspectingReturn.feePaymentMode || 'WAIVED'}
                  </span>
                </div>
                {inspectingReturn.feePaymentRef && (
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Transaction Reference / UTR</span>
                    <span className="font-mono text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 block w-fit">
                      {inspectingReturn.feePaymentRef}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Medicines List */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-forest-700" />
                <span>Returned Formulations</span>
              </h4>
              {inspectingReturn.order?.items && inspectingReturn.order.items.length > 0 ? (
                <div className="divide-y divide-slate-100 pt-1">
                  {inspectingReturn.order.items.map((it: any, idx: number) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">{it.product?.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{it.product?.sku}</span>
                      </div>
                      <div className="text-right font-mono font-bold text-xs text-slate-900">
                        Qty: {it.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">Ayurvedic Formulations</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setInspectingReturn(null)}>
                Close Drawer
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* MANUAL INITIATE RETURN MODAL */}
      <Modal
        isOpen={isInitiateModalOpen}
        onClose={() => setIsInitiateModalOpen(false)}
        title="Initiate Return / RTO Investigation"
        description="Queue a shipped or delivered order for return investigation and customer outreach."
        maxWidth="md"
      >
        <form onSubmit={handleInitiateSubmit} className="space-y-4 text-xs">
          {/* Enhanced Searchable Order Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-700">
                Search & Select Order *
              </label>
              {initiateSearchQuery && (
                <button
                  type="button"
                  onClick={() => setInitiateSearchQuery('')}
                  className="text-[11px] text-forest-700 font-bold hover:underline"
                >
                  Clear Search
                </button>
              )}
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Type customer name, phone, or order number to search..."
                value={initiateSearchQuery}
                onChange={(e) => setInitiateSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
              />
              {initiateSearchQuery && (
                <button
                  type="button"
                  onClick={() => setInitiateSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Dropdown (Shows all or search-filtered orders) */}
            <select
              required
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none font-mono"
            >
              {filteredOrdersForReturn.map((ord: any) => (
                <option key={ord.id} value={ord.id}>
                  {ord.orderNumber} - {ord.customer?.fullName} (₹{ord.totalAmount}) • {ord.status}
                </option>
              ))}
              {filteredOrdersForReturn.length === 0 && (
                <option value="">No orders match &quot;{initiateSearchQuery}&quot;</option>
              )}
            </select>

            {/* Interactive Matching Order Cards (Active when searching) */}
            {initiateSearchQuery.trim() && filteredOrdersForReturn.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 divide-y divide-slate-100 p-1.5 shadow-2xs">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Matching Orders ({filteredOrdersForReturn.length})</span>
                  <span>Click to select</span>
                </div>
                {filteredOrdersForReturn.slice(0, 6).map((ord: any) => (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between text-xs ${
                      selectedOrderId === ord.id
                        ? 'bg-emerald-50 border border-emerald-300 font-bold text-emerald-950 shadow-2xs'
                        : 'hover:bg-white text-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                        <Badge
                          variant={ord.status === 'SHIPPED' ? 'warning' : 'success'}
                          className="text-[10px] py-0 px-1"
                        >
                          {ord.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{ord.customer?.fullName}</span>
                        {ord.customer?.phoneNumber && <span>• {ord.customer.phoneNumber}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-forest-800">
                        ₹{Number(ord.totalAmount).toFixed(2)}
                      </span>
                      {selectedOrderId === ord.id && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-700 font-bold justify-end mt-0.5">
                          <Check className="h-3 w-3" />
                          <span>Selected</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Order Summary Preview Card */}
            {selectedOrderDetails && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1.5 mt-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                      {selectedOrderDetails.orderNumber}
                    </span>
                    <Badge variant={selectedOrderDetails.status === 'SHIPPED' ? 'warning' : 'success'}>
                      {selectedOrderDetails.status}
                    </Badge>
                  </div>
                  <span className="font-mono font-bold text-forest-900 text-xs">
                    ₹{Number(selectedOrderDetails.totalAmount).toFixed(2)} (
                    {selectedOrderDetails.paymentMode === 'CASH_ON_DELIVERY' ? 'COD' : 'PREPAID'})
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    {selectedOrderDetails.customer?.fullName}
                  </span>
                  <span className="font-mono text-slate-600 text-[11px]">
                    {selectedOrderDetails.customer?.phoneNumber}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 line-clamp-1">
                  {[
                    selectedOrderDetails.customer?.address,
                    selectedOrderDetails.customer?.city,
                    selectedOrderDetails.customer?.state,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Gujarat, India'}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Initial Reason *</label>
            <select
              value={initiateReason}
              onChange={(e) => setInitiateReason(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              <option value="CUSTOMER_REFUSED">Customer Refused at Doorstep</option>
              <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable / House Locked</option>
              <option value="DELIVERY_DELAYED">Delivery Delayed</option>
              <option value="FINANCIAL_ISSUE">Financial / COD Shortage</option>
              <option value="PACKAGE_DAMAGED">Package Damaged</option>
              <option value="OTHER">Other / Custom</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Initial Remarks</label>
            <textarea
              rows={2}
              value={initiateRemarks}
              onChange={(e) => setInitiateRemarks(e.target.value)}
              placeholder="Courier remarks or customer cancellation request reason..."
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInitiateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isInitiating}
              icon={<Send className="h-3 w-3" />}
            >
              Initiate & Queue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
