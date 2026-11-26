'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Drawer } from '../../../components/ui/drawer';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import {
  History,
  RefreshCw,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Calendar,
  AlertCircle,
  Eye,
  Phone,
  User,
  ShieldCheck,
  ClipboardList,
  Activity,
} from 'lucide-react';

export default function ApprovalHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Dossier Drawer state
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<any | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('filter', 'DECIDED');
      if (search.trim()) params.append('search', search.trim());

      const res = await apiClient.get(`/approvals/queue?${params.toString()}`);
      setHistory(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const openDossier = async (requestId: string) => {
    setDossierId(requestId);
    setLoadingDossier(true);
    try {
      const res = await apiClient.get(`/approvals/${requestId}`);
      setDossierData(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setDossierId(null);
    } finally {
      setLoadingDossier(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'leadCode',
      header: 'Lead Code',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {item.lead?.leadCode || item.leadId?.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer Details',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.lead?.customerName || 'Customer'}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
            <Phone className="h-3 w-3 text-slate-400" />
            <span>{item.lead?.phoneNumber}</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {[item.lead?.city, item.lead?.state].filter(Boolean).join(', ')}
          </span>
        </div>
      ),
    },
    {
      key: 'condition',
      header: 'Prescribed Condition',
      render: (item) => (
        <span className="text-xs text-slate-700">
          {item.lead?.productInterest || 'Ayurvedic Regimen'}
        </span>
      ),
    },
    {
      key: 'decision',
      header: 'Sign-Off Decision',
      render: (item) => {
        let variant: any = 'slate';
        let icon = null;
        if (item.decision === 'APPROVE') {
          variant = 'success';
          icon = <CheckCircle2 className="h-3 w-3 mr-1 inline" />;
        } else if (item.decision === 'REJECT') {
          variant = 'danger';
          icon = <XCircle className="h-3 w-3 mr-1 inline" />;
        } else if (item.decision === 'SEND_BACK') {
          variant = 'info';
          icon = <RotateCcw className="h-3 w-3 mr-1 inline" />;
        }

        return (
          <div>
            <Badge variant={variant}>
              {icon}
              {item.decision}
            </Badge>
            {item.decisionReason && (
              <span className="block font-mono text-[10px] text-slate-500 mt-0.5">
                {item.decisionReason}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'officerNotes',
      header: 'Officer Verification Notes',
      render: (item) => (
        <div className="max-w-xs">
          <span className="text-xs text-slate-800 line-clamp-2 italic">
            &quot;{item.officerNotes || 'No notes attached'}&quot;
          </span>
          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
            Officer: {item.officer?.employeeCode || 'System'} ({item.officer?.firstName} {item.officer?.lastName})
          </span>
        </div>
      ),
    },
    {
      key: 'decidedAt',
      header: 'Decided At',
      render: (item) => (
        <div className="text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span>{new Date(item.decidedAt || item.updatedAt).toLocaleDateString()}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {new Date(item.decidedAt || item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          onClick={() => openDossier(item.id)}
          icon={<Eye className="h-3 w-3" />}
        >
          Dossier
        </Button>
      ),
    },
  ];

  const approvalHistoryExportColumns: ExcelColumnDef[] = [
    { header: 'Order Reference', accessor: 'order.orderNumber' },
    { header: 'Patient Name', accessor: (it: any) => it.order?.customer?.fullName || it.lead?.customerName || '' },
    { header: 'Contact Phone', accessor: (it: any) => it.order?.customer?.phoneNumber || it.lead?.phoneNumber || '' },
    { header: 'City', accessor: (it: any) => it.order?.customer?.city || it.lead?.city || '' },
    { header: 'State', accessor: (it: any) => it.order?.customer?.state || it.lead?.state || '' },
    { header: 'Order Amount (₹)', accessor: (it: any) => Number(it.order?.grandTotal || it.order?.totalAmount || 0) },
    { header: 'Payment Method', accessor: (it: any) => it.order?.paymentMethod || it.order?.paymentMode || 'COD' },
    { header: 'Approval Decision', accessor: 'decision' },
    { header: 'Decision Reason', accessor: 'decisionReason' },
    { header: 'Officer Notes', accessor: 'officerNotes' },
    { header: 'Decided By', accessor: (it: any) => `${it.officer?.firstName || ''} ${it.officer?.lastName || ''}`.trim() || 'System' },
    { header: 'Decided Timestamp', accessor: (it: any) => (it.decidedAt || it.updatedAt) ? new Date(it.decidedAt || it.updatedAt).toLocaleString('en-IN') : '' },
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
            <Badge variant="role">Decision Log</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Medical & Commercial Sign-Off History
          </h2>
          <p className="text-xs text-slate-500">
            Immutable audit record of all medical clearances, commercial rejections, and return-for-rectification decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={history}
            columns={approvalHistoryExportColumns}
            fileName="Melayurveda_Approval_Decision_History"
            sheetName="Approval History"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
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

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search customer, phone, lead code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={history}
        isLoading={isLoading}
        emptyMessage="No historical approval decisions found matching current criteria."
        exportConfig={{
          fileName: 'Melayurveda_Approval_Decision_History',
          sheetName: 'Approval History',
          columns: approvalHistoryExportColumns,
        }}
      />

      {/* Product & Commercial Dossier Inspection Drawer */}
      <Drawer
        isOpen={!!dossierId}
        onClose={() => {
          setDossierId(null);
          setDossierData(null);
        }}
        title="Historical Product & Commercial Dossier"
        width="lg"
      >
        {loadingDossier ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading historical dossier...</div>
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
                <div className="text-right">
                  <Badge
                    variant={
                      dossierData.decision === 'APPROVE'
                        ? 'success'
                        : dossierData.decision === 'REJECT'
                        ? 'danger'
                        : 'info'
                    }
                  >
                    {dossierData.decision}
                  </Badge>
                  <span className="block font-mono text-[10px] text-slate-400 mt-1">
                    {new Date(dossierData.decidedAt || dossierData.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-600">Prescribed Condition:</span>
                  <p className="mt-0.5 font-medium text-slate-900">
                    {dossierData.lead?.productInterest || 'Ayurvedic Treatment'}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Decision Reason / Rationale:</span>
                  <p className="mt-0.5 font-mono text-slate-900">
                    {dossierData.decisionReason || 'STANDARD_SIGN_OFF'}
                  </p>
                </div>
              </div>
            </div>

            {/* Officer Verification Notes */}
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3.5 space-y-1">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-700" />
                Officer Medical / Commercial Certificate
              </span>
              <p className="text-slate-800 italic text-xs">&quot;{dossierData.officerNotes}&quot;</p>
              <div className="flex items-center justify-between text-[10px] text-indigo-700 font-mono pt-1 border-t border-indigo-100">
                <span>Signed by: {dossierData.officer?.employeeCode} ({dossierData.officer?.firstName} {dossierData.officer?.lastName})</span>
                <span>{new Date(dossierData.decidedAt || dossierData.updatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Prior Clinical Reviews (Panel 03) */}
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
                      <p className="text-slate-600 italic">&quot;{rev.reviewerNotes || 'Approved'}&quot;</p>
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

            {/* Close Button inside Drawer */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
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
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
