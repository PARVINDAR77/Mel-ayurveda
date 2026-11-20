'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  History,
  RefreshCw,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export default function PendingReviewHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get('/pending-reviews/history');
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
          <span className="block font-mono text-xs text-slate-500">{item.lead?.phoneNumber}</span>
        </div>
      ),
    },
    {
      key: 'decision',
      header: 'Triage Decision',
      render: (item) => {
        let variant: any = 'slate';
        if (item.decision === 'APPROVE') variant = 'success';
        else if (item.decision === 'REJECT') variant = 'danger';
        else if (item.decision === 'REQUEST_FOLLOW_UP') variant = 'warning';
        else if (item.decision === 'SEND_BACK') variant = 'info';

        return <Badge variant={variant}>{item.decision}</Badge>;
      },
    },
    {
      key: 'reviewerNotes',
      header: 'Reviewer Feedback Notes',
      render: (item) => (
        <span className="text-xs text-slate-700 line-clamp-2">
          {item.reviewerNotes || 'No notes attached'}
        </span>
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
          <span className="text-[10px] font-mono">
            {new Date(item.decidedAt || item.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Product Verification Decision History
          </h2>
          <p className="text-xs text-slate-500">
            Immutable audit log of customer inquiry reviews, approvals for Panel 04, and return-to-sales records.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* History Table */}
      <DataTable
        columns={columns}
        data={history}
        searchKey="decision"
        searchPlaceholder="Filter by decision (APPROVE, REJECT, SEND_BACK)..."
        isLoading={isLoading}
        emptyMessage="No historical decisions recorded yet."
      />
    </div>
  );
}
