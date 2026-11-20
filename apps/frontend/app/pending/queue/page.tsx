'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { Drawer } from '../../../components/ui/drawer';
import {
  FileCheck2,
  RefreshCw,
  Lock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Phone,
  Calendar,
  AlertCircle,
  Eye,
  User,
} from 'lucide-react';

export default function PendingReviewQueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Claim state
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

  // Decision Modal state
  const [decideReview, setDecideReview] = useState<any | null>(null);
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | 'REQUEST_FOLLOW_UP' | 'SEND_BACK'>('APPROVE');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);

  // Clinical Dossier Drawer
  const [dossierReview, setDossierReview] = useState<any | null>(null);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get('/pending-reviews/queue');
      setQueue(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleClaim = async (reviewId: string) => {
    try {
      setIsClaiming(reviewId);
      setError(null);
      await apiClient.patch(`/pending-reviews/${reviewId}/claim`, {});
      setSuccessMsg('Review locked to your desk. Concurrency collision lock active.');
      fetchQueue();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsClaiming(null);
    }
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decideReview) return;

    try {
      setIsDeciding(true);
      setError(null);
      await apiClient.post(`/pending-reviews/${decideReview.id}/decide`, {
        decision,
        reviewerNotes: reviewerNotes || undefined,
      });

      setSuccessMsg(`Review successfully decided as: ${decision}`);
      setDecideReview(null);
      setReviewerNotes('');
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
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Consultant Triage Reason',
      render: (item) => (
        <div>
          <span className="font-medium text-slate-800 text-xs block">{item.reason}</span>
          {item.salesNotes && (
            <span className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">
              &quot;{item.salesNotes}&quot;
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item) => <Badge variant="priority">{item.lead?.priority || 'NORMAL'}</Badge>,
    },
    {
      key: 'status',
      header: 'Queue Status',
      render: (item) => {
        const isClaimed = !!item.claimedById;
        return (
          <Badge variant={isClaimed ? 'warning' : 'info'}>
            {isClaimed ? 'Under Review' : 'In FIFO Queue'}
          </Badge>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      render: (item) => {
        const timeDiffHours = (new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);
        const isOverdue = timeDiffHours > 24;
        return (
          <div className={`text-xs ${isOverdue ? 'text-red-700 font-bold' : 'text-slate-500'}`}>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <span className="text-[10px] block font-mono">
              {timeDiffHours.toFixed(1)}h ago {isOverdue && '(!)'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => {
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDossierReview(item)}
              icon={<Eye className="h-3 w-3" />}
            >
              Dossier
            </Button>

            {!item.claimedById ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleClaim(item.id)}
                isLoading={isClaiming === item.id}
                icon={<Lock className="h-3 w-3" />}
              >
                Claim
              </Button>
            ) : (
              <Button
                variant="gold"
                size="sm"
                onClick={() => setDecideReview(item)}
                icon={<FileCheck2 className="h-3 w-3" />}
              >
                Decide
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Centralized FIFO Product Verification Queue
          </h2>
          <p className="text-xs text-slate-500">
            Review submitted product & order dossiers, lock claims to prevent reviewer collisions, and execute 4-way verification decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueue}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-700">
            ✕
          </button>
        </div>
      )}

      {/* Triage Queue Table */}
      <DataTable
        columns={columns}
        data={queue}
        searchKey="reason"
        searchPlaceholder="Filter queue by reason..."
        isLoading={isLoading}
        emptyMessage="Triage queue is completely clear! Zero pending submissions."
      />

      {/* 4-Way Decision Modal */}
      <Modal
        isOpen={!!decideReview}
        onClose={() => setDecideReview(null)}
        title={`Product Review: ${decideReview?.lead?.leadCode || decideReview?.id?.slice(0, 8)}`}
        description={`Customer: ${decideReview?.lead?.customerName} (${decideReview?.lead?.phoneNumber})`}
        maxWidth="xl"
      >
        <form onSubmit={handleDecision} className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
            <span className="font-bold text-slate-700 block">Consultant Justification:</span>
            <p className="text-slate-800">{decideReview?.reason}</p>
            {decideReview?.salesNotes && (
              <p className="text-slate-600 italic pt-1 border-t border-slate-200 mt-1">
                Consultant Notes: &quot;{decideReview.salesNotes}&quot;
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Select Verification Decision
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision('APPROVE')}
                className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 ${
                  decision === 'APPROVE'
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>APPROVE</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Qualify & forward to Panel 04 Approval Request
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECT')}
                className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 ${
                  decision === 'REJECT'
                    ? 'border-red-600 bg-red-50/80 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-red-800">
                  <XCircle className="h-4 w-4" />
                  <span>REJECT</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Customer or formulation ineligible for product kit
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REQUEST_FOLLOW_UP')}
                className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 ${
                  decision === 'REQUEST_FOLLOW_UP'
                    ? 'border-amber-600 bg-amber-50/80 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                  <Clock className="h-4 w-4" />
                  <span>REQUEST FOLLOW-UP</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Needs additional product dosage or inquiry info
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('SEND_BACK')}
                className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 ${
                  decision === 'SEND_BACK'
                    ? 'border-blue-600 bg-blue-50/80 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-800">
                  <RotateCcw className="h-4 w-4" />
                  <span>SEND BACK</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Return to consultant with corrective instructions
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Reviewer Evaluation & Verification Notes
            </label>
            <textarea
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              rows={3}
              placeholder="Product evaluation findings, dosage recommendations, or return-to-sales reason..."
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDecideReview(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isDeciding}
            >
              Execute Decision
            </Button>
          </div>
        </form>
      </Modal>

      {/* Product & Customer Dossier Drawer */}
      <Drawer
        isOpen={!!dossierReview}
        onClose={() => setDossierReview(null)}
        title={`Customer Dossier: ${dossierReview?.lead?.customerName || 'Customer'}`}
        subtitle={`Lead ID: ${dossierReview?.lead?.leadCode}`}
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Customer Phone:</span>
              <span className="font-mono font-bold text-slate-900">
                {dossierReview?.lead?.phoneNumber}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Location:</span>
              <span className="text-slate-900">
                {dossierReview?.lead?.city ? `${dossierReview.lead.city}, ${dossierReview.lead.state || ''}` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Medicine / Product Interest:</span>
              <span className="font-semibold text-slate-900">
                {dossierReview?.lead?.productInterest || 'General Product Inquiry'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Priority Level:</span>
              <Badge variant="priority">{dossierReview?.lead?.priority}</Badge>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-1">Consultation Assessment:</h4>
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
              <p className="font-semibold text-slate-800">{dossierReview?.reason}</p>
              {dossierReview?.salesNotes && (
                <p className="text-slate-600 italic">&quot;{dossierReview.salesNotes}&quot;</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDossierReview(null)}
            >
              Close Dossier
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                const target = dossierReview;
                setDossierReview(null);
                setDecideReview(target);
              }}
              icon={<FileCheck2 className="h-3 w-3" />}
            >
              Proceed to Decision
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
