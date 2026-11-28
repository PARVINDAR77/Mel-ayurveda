'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { Drawer } from '../../../components/ui/drawer';
import { EditOrderModal } from '../../../components/orders/edit-order-modal';
import { DecideOrderModal } from '../../../components/orders/decide-order-modal';
import { ApprovalCancellationModal } from '../../../components/approval/approval-cancellation-modal';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import {
  FileCheck,
  RefreshCw,
  Lock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Calendar,
  AlertCircle,
  Eye,
  Phone,
  User,
  ShieldCheck,
  Clock,
  ClipboardList,
  Activity,
  DollarSign,
  AlertTriangle,
  Package,
  Edit3,
  MapPin,
  Tag,
  Receipt,
} from 'lucide-react';

export default function ApprovalQueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL_ACTIVE' | 'PENDING' | 'CLAIMED'>('ALL_ACTIVE');
  const [search, setSearch] = useState('');

  // Claiming state
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

  // Decision Modal state
  const [decideItem, setDecideItem] = useState<any | null>(null);
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | 'SEND_BACK'>('APPROVE');
  const [decisionReason, setDecisionReason] = useState('CLINICAL_VERIFIED_PRICING_CLEARED');
  const [officerNotes, setOfficerNotes] = useState('');
  const [sendBackTarget, setSendBackTarget] = useState<'PENDING_PANEL' | 'SALESPERSON'>('PENDING_PANEL');
  const [isDeciding, setIsDeciding] = useState(false);

  // Dossier Drawer state
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<any | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Order Edit & Decide Modals
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [decidingOrder, setDecidingOrder] = useState<any | null>(null);
  const [decidingOrderAction, setDecidingOrderAction] = useState<'CONFIRM' | 'REQUEST_RECTIFICATION' | 'REJECT'>('CONFIRM');

  // Client Cancellation & Follow-Up Modal
  const [cancellingItem, setCancellingItem] = useState<any | null>(null);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filter) params.append('filter', filter);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiClient.get(`/approvals/queue?${params.toString()}`);
      setQueue(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQueue();
  };

  const handleClaim = async (requestId: string) => {
    try {
      setIsClaiming(requestId);
      setError(null);
      await apiClient.patch(`/approvals/${requestId}/claim`, {});
      setSuccessMsg('Approval request locked to your officer desk. Anti-collision lock engaged.');
      fetchQueue();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsClaiming(null);
    }
  };

  const openDossier = async (requestId: string) => {
    setDossierId(requestId);
    setLoadingDossier(true);
    try {
      const res = await apiClient.get(`/approvals/${requestId}`);
      let fullData = res.data;
      if (!fullData.order && fullData.lead?.id) {
        try {
          const orderRes = await apiClient.get(`/orders/by-lead/${fullData.lead.id}`);
          if (orderRes.data) {
            fullData.order = orderRes.data;
          }
        } catch {
          // No active order linked yet
        }
      }
      setDossierData(fullData);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setDossierId(null);
    } finally {
      setLoadingDossier(false);
    }
  };

  const openDecideModal = (item: any) => {
    setDecideItem(item);
    setDecision('APPROVE');
    setDecisionReason('CLINICAL_VERIFIED_PRICING_CLEARED');
    setOfficerNotes('');
    setSendBackTarget('SALESPERSON');
  };

  const handleQuickApprove = async (item: any) => {
    try {
      setIsDeciding(true);
      setError(null);
      await apiClient.post(`/approvals/${item.id}/decide`, {
        decision: 'APPROVE',
        decisionReason: 'CLINICAL_VERIFIED_PRICING_CLEARED',
        officerNotes: 'Medically cross-verified and commercially approved for order fulfillment',
      });
      setSuccessMsg(`Lead ${item.lead?.leadCode || item.leadId?.slice(0, 8)} approved and cleared successfully!`);
      fetchQueue();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeciding(false);
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decideItem) return;

    if (officerNotes.trim().length < 5) {
      setError('Officer verification notes must be at least 5 characters long.');
      return;
    }

    try {
      setIsDeciding(true);
      setError(null);

      const payload: any = {
        decision,
        decisionReason: decisionReason || undefined,
        officerNotes: officerNotes.trim(),
      };

      if (decision === 'SEND_BACK') {
        payload.sendBackTarget = sendBackTarget;
      }

      await apiClient.post(`/approvals/${decideItem.id}/decide`, payload);
      setSuccessMsg(`Sign-off decision recorded: ${decision}. Lead status synchronized.`);
      setDecideItem(null);
      fetchQueue();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeciding(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'leadCode',
      header: 'Lead Code',
      className: 'whitespace-nowrap min-w-[130px]',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap inline-block">
          {item.lead?.leadCode || item.leadId?.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer Details',
      className: 'min-w-[180px]',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.lead?.customerName || 'Customer'}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5 whitespace-nowrap">
            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
            <span>{item.lead?.phoneNumber}</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {[item.lead?.city, item.lead?.state].filter(Boolean).join(', ')}
          </span>
        </div>
      ),
    },
    {
      key: 'condition',
      header: 'Prescribed Formulations / Therapy',
      className: 'min-w-[320px]',
      render: (item) => {
        const order = item.order;
        const hasOrderItems = order?.items && order.items.length > 0;

        // Clean customer / dosage notes if present (strip internal technical markers)
        let cleanCustomerNotes = '';
        if (order?.notes) {
          cleanCustomerNotes = order.notes
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
            {/* Condition Header / Lead Product Concern */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {order?.orderNumber && (
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                  {order.orderNumber}
                </span>
              )}
              <span className="font-semibold text-slate-800 text-xs">
                {order?.items?.[0]?.product?.targetDisease || item.lead?.productInterest || 'Ayurvedic Treatment'}
              </span>
            </div>

            {/* Prescribed Formulation Medicines List */}
            {hasOrderItems ? (
              <div className="bg-slate-50/90 rounded-lg p-2 border border-slate-200/80 space-y-1">
                {order.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                      <span className="truncate">{it.product?.name || 'Formulation Kit'}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                      <span className="font-bold text-emerald-800">×{it.quantity}</span>
                      <span className="text-slate-400">(@ ₹{Number(it.unitPrice).toLocaleString('en-IN')})</span>
                    </div>
                  </div>
                ))}

                {/* Pricing & Payment Mode Row */}
                <div className="border-t border-slate-200/70 pt-1 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">
                    Total: <strong className="text-slate-900 font-bold">₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </span>
                  <span className="text-emerald-700 font-bold uppercase text-[10px] bg-emerald-100/70 px-1.5 py-0.5 rounded">
                    {order.paymentMode?.replace(/_/g, ' ') || 'COD'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-600 bg-amber-50/70 border border-amber-200/70 rounded px-2 py-1">
                <span>📋 Inquiry: <strong className="text-slate-800">{item.lead?.productInterest || 'General Consultation'}</strong></span>
              </div>
            )}

            {/* Special Instructions or Delivery Notes */}
            {cleanCustomerNotes && (
              <p className="text-[11px] text-slate-600 italic line-clamp-2">
                📝 &quot;{cleanCustomerNotes}&quot;
              </p>
            )}

            {/* Officer note or Review reason if set (and not duplicate) */}
            {item.officerNotes && !item.officerNotes.startsWith('Prescription Order') && (
              <span className="text-[11px] font-medium text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                💬 {item.officerNotes}
              </span>
            )}

            {item.lead?.pendingReviews?.[0]?.reason && (
              <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                ⚠️ Review Note: {item.lead.pendingReviews[0].reason}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      className: 'whitespace-nowrap min-w-[140px]',
      render: (item) => <Badge variant="leadStatus">{item.lead?.status || 'APPROVAL_REQUESTED'}</Badge>,
    },
    {
      key: 'priority',
      header: 'Priority',
      className: 'whitespace-nowrap min-w-[90px]',
      render: (item) => <Badge variant="priority">{item.lead?.priority || 'NORMAL'}</Badge>,
    },
    {
      key: 'officer',
      header: 'Desk Lock',
      className: 'whitespace-nowrap min-w-[130px]',
      render: (item) => {
        if (!item.officerId) {
          return <Badge variant="info">Unclaimed FIFO</Badge>;
        }
        return (
          <div className="flex items-center gap-1 text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono whitespace-nowrap">
            <Lock className="h-3 w-3 text-amber-600 shrink-0" />
            <span>{item.officer?.employeeCode || 'Claimed'}</span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Forwarded',
      className: 'whitespace-nowrap min-w-[110px]',
      render: (item) => {
        const timeDiffHours = (new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);
        return (
          <div className="text-xs text-slate-500 whitespace-nowrap">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <span className="text-[10px] block font-mono text-slate-400">
              {timeDiffHours.toFixed(1)}h ago
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right whitespace-nowrap min-w-[280px]',
      render: (item) => {
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDossier(item.id)}
              icon={<Eye className="h-3 w-3" />}
              className="text-[11px] px-2.5 py-1 h-7 whitespace-nowrap shrink-0"
            >
              Dossier
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancellingItem(item)}
              icon={<RotateCcw className="h-3 w-3 text-amber-600" />}
              className="text-[11px] px-2.5 py-1 h-7 whitespace-nowrap shrink-0 border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer font-medium"
              title="Client cancelled during verification call - Route follow-up to sales"
            >
              Client Cancelled
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleQuickApprove(item)}
              isLoading={isDeciding}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-[11px] px-2.5 py-1 h-7 whitespace-nowrap shrink-0"
              icon={<CheckCircle2 className="h-3 w-3" />}
            >
              Approve & Clear
            </Button>

            {!item.officerId ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleClaim(item.id)}
                isLoading={isClaiming === item.id}
                icon={<Lock className="h-3 w-3" />}
                className="text-[11px] px-2.5 py-1 h-7 whitespace-nowrap shrink-0"
              >
                Claim
              </Button>
            ) : (
              <Button
                variant="gold"
                size="sm"
                onClick={() => openDecideModal(item)}
                icon={<ShieldCheck className="h-3 w-3" />}
                className="text-[11px] px-2.5 py-1 h-7 whitespace-nowrap shrink-0"
              >
                Sign-Off
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const approvalQueueExportColumns: ExcelColumnDef[] = [
    { header: 'Order Reference', accessor: (it: any) => it.order?.orderNumber || 'PENDING' },
    { header: 'Patient Name', accessor: (it: any) => it.order?.customer?.fullName || it.lead?.customerName || '' },
    { header: 'Contact Phone', accessor: (it: any) => it.order?.customer?.phoneNumber || it.lead?.phoneNumber || '' },
    { header: 'City', accessor: (it: any) => it.order?.customer?.city || it.lead?.city || '' },
    { header: 'State', accessor: (it: any) => it.order?.customer?.state || it.lead?.state || '' },
    { header: 'Prescribed Items', accessor: (it: any) => it.order?.items?.map((p: any) => `${p.product?.name || 'Item'} (x${p.quantity})`).join(', ') || it.lead?.productInterest || '' },
    { header: 'Order Value (₹)', accessor: (it: any) => Number(it.order?.grandTotal || it.order?.totalAmount || 0) },
    { header: 'Payment Method', accessor: (it: any) => it.order?.paymentMethod || it.order?.paymentMode || 'COD' },
    { header: 'Queue Status', accessor: 'status' },
    { header: 'Claimed By', accessor: (it: any) => it.claimedByUser?.fullName || 'Unclaimed FIFO' },
    { header: 'Submitted Date', accessor: (it: any) => it.createdAt ? new Date(it.createdAt).toLocaleString('en-IN') : '' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-800 uppercase tracking-widest">
              MEL-APR-001
            </span>
            <Badge variant="role">Verification Queue</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Final Medical & Commercial Verification Queue
          </h2>
          <p className="text-xs text-slate-500">
            Audit clinical treatment regimens, review pricing viability, claim FIFO dossiers, and unlock customer conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={queue}
            columns={approvalQueueExportColumns}
            fileName="Melayurveda_Approval_Queue"
            sheetName="Verification Queue"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueue}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
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

      {/* Filter Tabs and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setFilter('ALL_ACTIVE')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              filter === 'ALL_ACTIVE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Active Queue
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              filter === 'PENDING' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unclaimed FIFO
          </button>
          <button
            onClick={() => setFilter('CLAIMED')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              filter === 'CLAIMED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My / Claimed Desks
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search customer, phone, lead code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={queue}
        isLoading={isLoading}
        emptyMessage="No pending verification requests in this queue view."
        exportConfig={{
          fileName: 'Melayurveda_Approval_Queue',
          sheetName: 'Verification Queue',
          columns: approvalQueueExportColumns,
        }}
      />

      {/* Medical & Commercial Dossier Inspection Drawer */}
      <Drawer
        isOpen={!!dossierId}
        onClose={() => {
          setDossierId(null);
          setDossierData(null);
        }}
        title="Comprehensive Product & Commercial Dossier"
        width="lg"
      >
        {loadingDossier ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading product dossier...</div>
        ) : !dossierData ? (
          <div className="py-16 text-center text-xs text-slate-400">Dossier not found</div>
        ) : (
          <div className="space-y-6 text-xs text-slate-700">
            {/* Lead & Customer Header */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500 uppercase">
                    Lead Code: {dossierData.lead?.leadCode}
                  </span>
                  <h4 className="mt-1 text-base font-bold text-slate-900">
                    {dossierData.lead?.customerName}
                  </h4>
                  <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                    <span>Phone: {dossierData.lead?.phoneNumber}</span>
                    <span>City: {dossierData.lead?.city || 'N/A'}</span>
                    <span>State: {dossierData.lead?.state || 'N/A'}</span>
                  </div>
                </div>
                <Badge variant="priority">{dossierData.lead?.priority || 'NORMAL'}</Badge>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-600">Prescribed Condition:</span>
                  <p className="mt-0.5 font-medium text-slate-900">
                    {dossierData.lead?.productInterest || 'Ayurvedic Treatment'}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Assigned Tele-Consultant:</span>
                  <p className="mt-0.5 font-mono text-slate-900">
                    {dossierData.lead?.assignedTo?.employeeCode} (
                    {dossierData.lead?.assignedTo?.firstName} {dossierData.lead?.assignedTo?.lastName})
                  </p>
                </div>
              </div>
            </div>

            {/* Quality Triage History (Panel 03) */}
            <div>
              <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-forest-700" />
                Prior Clinical Review History
              </h5>
              {!dossierData.lead?.pendingReviews || dossierData.lead.pendingReviews.length === 0 ? (
                <div className="rounded border border-dashed border-slate-200 p-3 text-center text-slate-400">
                  No prior triage reviews recorded.
                </div>
              ) : (
                <div className="space-y-2">
                  {dossierData.lead.pendingReviews.map((rev: any) => (
                    <div key={rev.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">Reason: {rev.reason}</span>
                        <Badge variant={rev.decision === 'APPROVE' ? 'success' : 'slate'}>
                          {rev.decision}
                        </Badge>
                      </div>
                      <p className="text-slate-600 italic">&quot;{rev.reviewerNotes || 'Approved without extra notes'}&quot;</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100">
                        <span>Reviewed by: {rev.claimedBy?.employeeCode || 'Reviewer'}</span>
                        <span>{new Date(rev.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tele-Consultation Call Logs */}
            <div>
              <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-forest-700" />
                Tele-Consultation Call History ({dossierData.lead?.callLogs?.length || 0} Calls)
              </h5>
              {!dossierData.lead?.callLogs || dossierData.lead.callLogs.length === 0 ? (
                <div className="rounded border border-dashed border-slate-200 p-3 text-center text-slate-400">
                  No call logs recorded.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dossierData.lead.callLogs.map((c: any) => (
                    <div key={c.id} className="rounded border border-slate-100 bg-slate-50 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{c.disposition}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {c.durationSeconds}s duration
                        </span>
                      </div>
                      {c.notes && <p className="text-slate-600 text-[11px] mt-1">&quot;{c.notes}&quot;</p>}
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Caller: {c.caller?.employeeCode || 'Agent'}</span>
                        <span>{new Date(c.calledAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescribed Formulation Order & Commercial Review */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-forest-700" />
                  <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Formulation Order & Treatment Deal
                  </h5>
                  {dossierData.order && (
                    <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {dossierData.order.orderNumber}
                    </span>
                  )}
                </div>
                {dossierData.order && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant={dossierData.order.status === 'CONFIRMED' ? 'success' : dossierData.order.status === 'CANCELLED' ? 'danger' : 'gold'}>
                      {dossierData.order.status}
                    </Badge>
                  </div>
                )}
              </div>

              {!dossierData.order ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-slate-400 text-xs">
                  No formulation order booked yet for this lead inquiry.
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {/* Order Financials & Booking Consultant Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Consultant</span>
                      <span className="font-bold text-slate-900">{dossierData.order.createdBy?.employeeCode || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Payment Mode</span>
                      <span className="font-bold text-slate-800">{dossierData.order.paymentMode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Subtotal + GST</span>
                      <span className="text-slate-700">₹{dossierData.order.subtotal} + ₹{dossierData.order.taxAmount}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">Payable Total</span>
                      <span className="text-base font-black text-forest-800">₹{dossierData.order.totalAmount}</span>
                    </div>
                  </div>

                  {/* Formulations Line Items Table */}
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-2.5 py-1.5">Formulation</th>
                          <th className="px-2 py-1.5 text-center">Qty</th>
                          <th className="px-2 py-1.5 text-right">Unit Price</th>
                          <th className="px-2.5 py-1.5">Prescribed Dosage</th>
                          <th className="px-2.5 py-1.5 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dossierData.order.items?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="px-2.5 py-1.5">
                              <span className="font-semibold text-slate-900 block">{item.product?.name}</span>
                              <span className="font-mono text-[10px] text-slate-400">{item.product?.sku}</span>
                            </td>
                            <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-900">
                              {item.quantity}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono text-slate-800">
                              ₹{item.unitPrice}
                            </td>
                            <td className="px-2.5 py-1.5 text-slate-700 italic">
                              {item.dosageInstructions || 'As directed'}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-bold text-slate-900">
                              ₹{item.totalPrice || (Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Order Chronological Remarks Banner */}
                  {dossierData.order.notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900">
                      <span className="font-bold uppercase tracking-wider block text-[10px] text-amber-950">
                        Chronological Directives & Notes:
                      </span>
                      <p className="font-mono whitespace-pre-line mt-0.5">{dossierData.order.notes}</p>
                    </div>
                  )}

                  {/* Order Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingOrder(dossierData.order)}
                      icon={<Edit3 className="h-3.5 w-3.5 text-amber-600" />}
                    >
                      Edit Order & Prices
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => {
                          setDecidingOrder(dossierData.order);
                          setDecidingOrderAction('REQUEST_RECTIFICATION');
                        }}
                        icon={<RotateCcw className="h-3.5 w-3.5" />}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Request Rectification
                      </Button>

                      {dossierData.order.status !== 'CONFIRMED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setDecidingOrder(dossierData.order);
                            setDecidingOrderAction('CONFIRM');
                          }}
                          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                          Confirm Order
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions inside Drawer */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDossierId(null);
                  setDossierData(null);
                }}
              >
                Close Dossier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const item = dossierData;
                  setDossierId(null);
                  setDossierData(null);
                  setCancellingItem(item);
                }}
                icon={<RotateCcw className="h-3.5 w-3.5 text-amber-600" />}
                className="border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer"
              >
                Client Cancelled (Send Follow-up)
              </Button>
              {!dossierData.officerId ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleClaim(dossierData.id);
                    setDossierId(null);
                  }}
                  icon={<Lock className="h-3.5 w-3.5" />}
                >
                  Claim This Lead
                </Button>
              ) : (
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => {
                    openDecideModal(dossierData);
                    setDossierId(null);
                  }}
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                >
                  Execute Sign-Off
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* 3-Way Final Sign-Off Modal */}
      <Modal
        isOpen={!!decideItem}
        onClose={() => setDecideItem(null)}
        title="Execute Medical & Commercial Sign-Off"
        description={`Authoritative review for customer inquiry ${decideItem?.lead?.customerName} (${decideItem?.lead?.leadCode})`}
        maxWidth="md"
      >
        <form onSubmit={handleDecisionSubmit} className="space-y-4 text-xs">
          {/* Decision Type Switcher */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Authoritative Sign-Off Decision *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDecision('APPROVE');
                  setDecisionReason('CLINICAL_VERIFIED_PRICING_CLEARED');
                }}
                className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                  decision === 'APPROVE'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>APPROVE</span>
                <span className="text-[10px] font-normal text-emerald-700">Unlock Conversion</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDecision('REJECT');
                  setDecisionReason('MEDICAL_CONTRAINDICATION');
                }}
                className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                  decision === 'REJECT'
                    ? 'border-red-600 bg-red-50 text-red-900 font-bold ring-1 ring-red-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="h-4 w-4 text-red-600" />
                <span>REJECT</span>
                <span className="text-[10px] font-normal text-red-700">Permanent Deny</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDecision('SEND_BACK');
                  setDecisionReason('INSUFFICIENT_CLINICAL_HISTORY');
                }}
                className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                  decision === 'SEND_BACK'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <RotateCcw className="h-4 w-4 text-blue-600" />
                <span>SEND BACK</span>
                <span className="text-[10px] font-normal text-blue-700">Rectification</span>
              </button>
            </div>
          </div>

          {/* Structured Rationale Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Structured Rationale Code *
            </label>
            <select
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              {decision === 'APPROVE' && (
                <>
                  <option value="CLINICAL_VERIFIED_PRICING_CLEARED">
                    CLINICAL_VERIFIED_PRICING_CLEARED - Regimen & commercial terms verified
                  </option>
                  <option value="DOSAGE_ASSESSED_CUSTOMER_READY">
                    DOSAGE_ASSESSED_CUSTOMER_READY - Formulation dosage validated, customer order cleared
                  </option>
                  <option value="STANDARD_FORMULATION_CONFIRMED">
                    STANDARD_FORMULATION_CONFIRMED - Routine product formulation order approved
                  </option>
                </>
              )}
              {decision === 'REJECT' && (
                <>
                  <option value="MEDICAL_CONTRAINDICATION">
                    MEDICAL_CONTRAINDICATION - Customer health contraindications prohibit formulation
                  </option>
                  <option value="COMMERCIAL_UNVIABILITY">
                    COMMERCIAL_UNVIABILITY - Financial or delivery constraints unviable
                  </option>
                  <option value="CUSTOMER_UNWILLING">
                    CUSTOMER_UNWILLING - Customer declined verified formulation terms
                  </option>
                  <option value="DUPLICATE_ORDER">
                    DUPLICATE_ORDER - Identical order already processed
                  </option>
                </>
              )}
              {decision === 'SEND_BACK' && (
                <>
                  <option value="INSUFFICIENT_CLINICAL_HISTORY">
                    INSUFFICIENT_CLINICAL_HISTORY - Missing vital Ayurvedic medicine/regimen details
                  </option>
                  <option value="PRICING_DISCREPANCY">
                    PRICING_DISCREPANCY - Quotation does not match standard dosage MRP
                  </option>
                  <option value="CUSTOMER_CALLBACK_REQUIRED">
                    CUSTOMER_CALLBACK_REQUIRED - Tele-consultant needs to re-verify regimen duration with customer
                  </option>
                </>
              )}
            </select>
          </div>

          {/* Send Back Target (If SEND_BACK selected) */}
          {decision === 'SEND_BACK' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rectification Routing Destination *
              </label>
              <select
                value={sendBackTarget}
                onChange={(e: any) => setSendBackTarget(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              >
                <option value="SALESPERSON">
                  Panel 02: Tele-Sales Consultant (Re-contact customer for clarification / dosage adjustment)
                </option>
              </select>
            </div>
          )}

          {/* Officer Verification Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Medical / Commercial Verification Notes * (Min 5 chars)
            </label>
            <textarea
              rows={3}
              required
              minLength={5}
              placeholder="e.g. Verified therapeutic formulation kit and pricing. Cleared for customer conversion and GST invoice generation."
              value={officerNotes}
              onChange={(e) => setOfficerNotes(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-forest-600 focus:outline-none"
            />
          </div>

          {/* Consequence Alert */}
          <div
            className={`p-2.5 rounded-lg border text-[11px] ${
              decision === 'APPROVE'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : decision === 'REJECT'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {decision === 'APPROVE' && (
              <p>
                <strong>Cleared for Billing:</strong> This order will transition to <strong>CONFIRMED</strong>{' '}
                status, allowing Panel 06 Billing Desk to generate the official GST invoice, reserve warehouse stock,
                and route the parcel to courier dispatch.
              </p>
            )}
            {decision === 'REJECT' && (
              <p>
                <strong>Permanent Disqualification:</strong> This order will transition to REJECTED / CANCELLED
                status. Tele-sales cannot re-submit without corrective guidance.
              </p>
            )}
            {decision === 'SEND_BACK' && (
              <p>
                <strong>Return for Rectification:</strong> The order will be routed back to the Sales Consultant
                along with your clinical feedback.
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDecideItem(null)}
              disabled={isDeciding}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={decision === 'APPROVE' ? 'primary' : decision === 'REJECT' ? 'danger' : 'gold'}
              size="sm"
              isLoading={isDeciding}
            >
              Confirm Sign-Off
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Formulation Order Modal */}
      {editingOrder && (
        <EditOrderModal
          isOpen={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          order={editingOrder}
          onOrderUpdated={(updated) => {
            setSuccessMsg(`Order ${updated.orderNumber} successfully updated.`);
            if (dossierId) openDossier(dossierId);
            fetchQueue();
          }}
        />
      )}

      {/* Decide Formulation Order Modal */}
      {decidingOrder && (
        <DecideOrderModal
          isOpen={!!decidingOrder}
          onClose={() => setDecidingOrder(null)}
          order={decidingOrder}
          initialDecision={decidingOrderAction}
          onDecided={() => {
            setSuccessMsg(`Order decision recorded successfully.`);
            if (dossierId) openDossier(dossierId);
            fetchQueue();
          }}
        />
      )}

      {/* Client Cancellation & Sales Follow-Up Routing Modal */}
      <ApprovalCancellationModal
        isOpen={Boolean(cancellingItem)}
        onClose={() => setCancellingItem(null)}
        approvalItem={cancellingItem}
        onSuccess={() => {
          setSuccessMsg('Deal cancelled in verification. Follow-up routed to salesperson successfully!');
          fetchQueue();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
}
