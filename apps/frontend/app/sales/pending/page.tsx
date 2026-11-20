'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import {
  Send,
  RefreshCw,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';

function PendingSubmissionsContent() {
  const searchParams = useSearchParams();
  const preselectedLeadId = searchParams.get('leadId');

  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>(preselectedLeadId || '');
  const [reason, setReason] = useState('High intent customer qualified for product formulation');
  const [salesNotes, setSalesNotes] = useState('');
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setIsLoadingLeads(true);
      const res = await apiClient.get('/leads?limit=100');
      const data = res.data?.data || [];
      // Eligible leads are those not already approved or converted
      const eligible = data.filter(
        (l: any) =>
          l.status !== 'APPROVED' &&
          l.status !== 'CONVERTED' &&
          l.status !== 'PENDING_REVIEW',
      );
      setLeads(eligible);
      if (preselectedLeadId) {
        setSelectedLeadId(preselectedLeadId);
      } else if (eligible.length > 0 && !selectedLeadId) {
        setSelectedLeadId(eligible[0].id);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [preselectedLeadId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await apiClient.post('/pending-reviews/submit', {
        leadId: selectedLeadId,
        reason,
        salesNotes: salesNotes || undefined,
      });

      const submittedLead = leads.find((l) => l.id === selectedLeadId);
      setSuccessMsg(
        `Lead ${submittedLead?.leadCode || selectedLeadId} successfully forwarded to Panel 03 Pending Review queue!`,
      );
      setSalesNotes('');
      fetchLeads();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Submit Customer Lead for Product Verification
          </h2>
          <p className="text-xs text-slate-500">
            Forward customer product inquiries to Panel 03 Pending Review queue for formulation, pricing, and order verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeads}
            isLoading={isLoadingLeads}
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

      {/* Submission Card */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-forest-800" />
            Product & Order Verification Form
          </CardTitle>
          <CardDescription>
            Provide inquiry and product recommendation details for the Panel 03 reviewing team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Select Consulted Customer Lead
              </label>
              {isLoadingLeads ? (
                <div className="text-xs text-slate-400 py-2">Loading eligible leads...</div>
              ) : leads.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  No eligible leads available for submission. All your assigned leads are either
                  already in review or completed.
                </div>
              ) : (
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
                  required
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.leadCode} - {l.customerName} ({l.phoneNumber}) - Priority: {l.priority}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Input
              label="Verification Justification / Product Regimen"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Confirmed joint pain relief kit, requested 60-day formulation course"
              required
            />

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Consultant Product & Order Notes
              </label>
              <textarea
                value={salesNotes}
                onChange={(e) => setSalesNotes(e.target.value)}
                rows={4}
                placeholder="Include customer requirements, recommended medicines/kits, agreed pricing/terms..."
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
                required
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                disabled={leads.length === 0}
                icon={<Send className="h-4 w-4" />}
              >
                Forward to Pending Review Queue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PendingSubmissionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading form...</div>}>
      <PendingSubmissionsContent />
    </Suspense>
  );
}
