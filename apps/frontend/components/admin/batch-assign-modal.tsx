'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Users, Calendar, AlertCircle, CheckCircle2, UserCheck, Sparkles } from 'lucide-react';

interface BatchAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomers: any[];
  onSuccess: (data: any) => void;
}

export function BatchAssignModal({
  isOpen,
  onClose,
  selectedCustomers,
  onSuccess,
}: BatchAssignModalProps) {
  const [executives, setExecutives] = useState<any[]>([]);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('Day 14 - Treatment Progress & Symptom Relief Audit');
  const [customObjective, setCustomObjective] = useState('');
  const [adminDirectives, setAdminDirectives] = useState('');
  const [scheduledTime, setScheduledTime] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isLoadingExecs, setIsLoadingExecs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchExecutives = async () => {
      try {
        setIsLoadingExecs(true);
        setError(null);
        const res = await apiClient.get('/customer-followups/executives');
        const list: any[] = res.data || [];
        // Prioritize dedicated Follow-Up Executives (MEL-FLW-) at the very top of the list
        const sorted = [...list].sort((a, b) => {
          if (a.role === 'FOLLOWUP_EXECUTIVE' && b.role !== 'FOLLOWUP_EXECUTIVE') return -1;
          if (b.role === 'FOLLOWUP_EXECUTIVE' && a.role !== 'FOLLOWUP_EXECUTIVE') return 1;
          return (a.employeeCode || '').localeCompare(b.employeeCode || '');
        });
        setExecutives(sorted);
        if (sorted.length > 0) {
          setSelectedExecutiveId(sorted[0].id);
        }
      } catch (err: any) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoadingExecs(false);
      }
    };

    fetchExecutives();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExecutiveId) {
      setError('Please select a Follow-Up Executive to receive this batch.');
      return;
    }

    const finalObjective =
      campaignObjective === 'CUSTOM' ? customObjective.trim() : campaignObjective;

    if (!finalObjective) {
      setError('Please specify a campaign objective.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        customerIds: selectedCustomers.map((c) => c.id),
        assignedToId: selectedExecutiveId,
        campaignObjective: finalObjective,
        adminDirectives: adminDirectives.trim() || undefined,
        scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : undefined,
      };

      const res = await apiClient.post('/customer-followups/batch', payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white p-5 flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 font-black flex items-center justify-center text-lg shadow-sm">
              <UserCheck className="w-5 h-5 text-emerald-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Assign Clients to Follow-Up Executive</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Super Admin Allocation
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Bulk allocate selected client accounts for proactive post-order care and wellness consultation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Selected Batch Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                Selected Clients for Allocation ({selectedCustomers.length})
              </span>
              <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Batch Size: {selectedCustomers.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
              {selectedCustomers.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs"
                >
                  <span className="font-mono text-[10px] text-slate-500">{c.customerCode}</span>
                  <strong>{c.fullName}</strong>
                  {c.phoneNumber && <span className="text-slate-400 font-mono">({c.phoneNumber})</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Select Executive */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Select Follow-Up Executive / Consultant *
            </label>
            {isLoadingExecs ? (
              <div className="p-2.5 text-center text-slate-400 bg-slate-50 rounded-lg">Loading team members...</div>
            ) : (
              <select
                value={selectedExecutiveId}
                onChange={(e) => setSelectedExecutiveId(e.target.value)}
                required
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
              >
                {executives.map((ex) => (
                  <option key={ex.id} value={ex.id} className="font-bold py-1">
                    {ex.role === 'FOLLOWUP_EXECUTIVE' ? '★ ' : ''}{ex.employeeCode} - {ex.firstName} {ex.lastName} {ex.role === 'FOLLOWUP_EXECUTIVE' ? '(Dedicated Follow-Up Care Specialist)' : `(${ex.role})`}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-[11px] text-slate-500">
              The selected executive will receive a live notification and this client batch in their Customer Care Queue.
            </p>
          </div>

          {/* Campaign Objective Preset */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Campaign Objective / Care Protocol *
            </label>
            <select
              value={campaignObjective}
              onChange={(e) => setCampaignObjective(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              <option value="Day 14 - Treatment Progress & Symptom Relief Audit">
                Day 14 - Treatment Progress & Symptom Relief Audit
              </option>
              <option value="Day 7 - Unboxing, Medicine Intake & First Impressions">
                Day 7 - Unboxing, Medicine Intake & First Impressions
              </option>
              <option value="Day 25 - Refill Reminder & Medication Renewal">
                Day 25 - Refill Reminder & Medication Renewal
              </option>
              <option value="Courier Delivery Confirmation & Dosage Guidance">
                Courier Delivery Confirmation & Dosage Guidance
              </option>
              <option value="Ayurvedic Doctor / Senior Vaidya Health Check">
                Ayurvedic Doctor / Senior Vaidya Health Check
              </option>
              <option value="CUSTOM">Custom Campaign Objective (Write below)</option>
            </select>

            {campaignObjective === 'CUSTOM' && (
              <input
                type="text"
                placeholder="Enter custom follow-up objective..."
                value={customObjective}
                onChange={(e) => setCustomObjective(e.target.value)}
                className="mt-2 w-full rounded-xl border-2 border-amber-300 bg-amber-50/40 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
              />
            )}
          </div>

          {/* Target Due Date */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Target Consultation Date *
            </label>
            <input
              type="date"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-forest-600 focus:outline-none"
            />
          </div>

          {/* Super Admin Directive Notes */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Super Admin Specific Directives / Instructions
              <span className="text-slate-400 font-normal ml-1">(Visible on Executive Consultation Screen)</span>
            </label>
            <textarea
              rows={3}
              value={adminDirectives}
              onChange={(e) => setAdminDirectives(e.target.value)}
              placeholder="e.g. Ask if joint pain and morning stiffness improved after 14 days of Sandhivata Kwath. If client is satisfied, offer 10% loyalty refill discount for Month 2 course..."
              className="w-full rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold px-5 shadow-md"
            >
              Confirm & Assign Batch ({selectedCustomers.length} Clients)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
