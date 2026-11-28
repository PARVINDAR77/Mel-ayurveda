'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import {
  RotateCcw,
  UserCheck,
  AlertTriangle,
  Phone,
  PhoneCall,
  Calendar,
  Clock,
  Boxes,
  HelpCircle,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Send,
  User,
} from 'lucide-react';

interface ApprovalCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvalItem: any | null;
  onSuccess: () => void;
}

export function ApprovalCancellationModal({
  isOpen,
  onClose,
  approvalItem,
  onSuccess,
}: ApprovalCancellationModalProps) {
  const [cancellationReason, setCancellationReason] = useState('PRICE_TOO_HIGH');
  const [clientFeedback, setClientFeedback] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [officerInternalNotes, setOfficerInternalNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults on item change
  useEffect(() => {
    if (approvalItem) {
      setCancellationReason('PRICE_TOO_HIGH');
      setClientFeedback('');
      setOfficerInternalNotes('');
      setError(null);

      // Default callback scheduled to tomorrow at 10:30 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 30, 0, 0);

      // Format for datetime-local: YYYY-MM-DDTHH:mm
      const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledTime(localIso);
    }
  }, [approvalItem]);

  if (!approvalItem) return null;

  const lead = approvalItem.lead;
  const order = approvalItem.order;
  const salesperson = lead?.assignedTo || order?.createdBy;
  const totalAmount = order?.grandTotal || order?.totalAmount || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (clientFeedback.trim().length < 5) {
      setError('Please enter detailed patient objections / discussion notes (minimum 5 characters).');
      return;
    }

    if (!scheduledTime) {
      setError('Please choose a valid callback scheduled date and time for the salesperson.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post(`/approvals/${approvalItem.id}/client-cancel-followup`, {
        cancellationReason,
        clientFeedback: clientFeedback.trim(),
        scheduledTime: new Date(scheduledTime).toISOString(),
        officerInternalNotes: officerInternalNotes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Client Cancelled — Route Follow-Up to Sales"
      description={`Patient ${lead?.customerName || 'Inquiry'} (${lead?.leadCode || approvalItem.leadId?.slice(0, 8)})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Patient & Booking Salesperson Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <div>
              <span className="font-bold text-slate-900 text-sm block">
                {lead?.customerName || 'Patient'}
              </span>
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-mono mt-0.5">
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {lead?.phoneNumber || 'N/A'}
                </span>
                {lead?.city && <span>• {lead.city}, {lead.state}</span>}
              </div>
            </div>

            {totalAmount > 0 && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Deal Value</span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹{Number(totalAmount).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          {/* Target Salesperson Highlight */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs">
                {salesperson?.firstName ? salesperson.firstName.charAt(0) : 'S'}
              </div>
              <div>
                <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">
                  Original Booking Salesperson
                </span>
                <span className="font-bold text-slate-900 text-xs">
                  {salesperson ? `${salesperson.firstName} ${salesperson.lastName}` : 'Unassigned Salesperson'}{' '}
                  <span className="font-mono text-slate-500 font-normal">
                    ({salesperson?.employeeCode || 'MEL-SAL'})
                  </span>
                </span>
              </div>
            </div>
            <Badge variant="warning" className="text-[10px] whitespace-nowrap">
              Auto-Routing Target
            </Badge>
          </div>

          {/* Prescribed Items summary */}
          {order?.items && order.items.length > 0 && (
            <div className="text-[11px] text-slate-600 pt-0.5">
              <span className="text-slate-400 font-medium block mb-1">Prescribed Medicines:</span>
              <div className="flex flex-wrap gap-1">
                {order.items.map((it: any, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-700"
                  >
                    <Boxes className="w-3 h-3 text-blue-500" />
                    {it.product?.name || 'Ayurvedic Item'} × {it.quantity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cancellation Reason Dropdown */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Primary Cancellation Reason <span className="text-red-500">*</span>
          </label>
          <select
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-xs font-medium text-slate-900 bg-white"
            required
          >
            <option value="PRICE_TOO_HIGH">Price Too High / Wants Higher Discount</option>
            <option value="FAMILY_OBJECTED">Family Member Objected to Herbal Medicine</option>
            <option value="NOT_READY_NOW">Not Ready Now / Postponed to Next Month</option>
            <option value="HESITANT_ON_RESULTS">Doubtful About Results / Needs More Proof</option>
            <option value="FINANCIAL_CONSTRAINT">Financial Emergency / Cash Not Arranged</option>
            <option value="DELIVERY_TIME_CONCERN">Delivery Timeline Concerns / Leaving Station</option>
            <option value="DENIES_PLACING_ORDER">Denies Placing Ayurvedic Order</option>
            <option value="PURCHASED_COMPETITOR">Purchased Alternate Local Medicine</option>
            <option value="OTHER">Other Custom Objection / Reason</option>
          </select>
        </div>

        {/* Patient Exact Objections / Discussion Notes */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Patient Objections & Feedback During Verification <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={clientFeedback}
            onChange={(e) => setClientFeedback(e.target.value)}
            placeholder="Record what the patient said during the verification call (e.g. Husband objected to price, asking for 30-day course instead of 60-day, cash will be ready next week)..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-xs"
            required
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            This will be displayed in the salesperson&apos;s Follow-Up Agenda so they can address these specific objections.
          </span>
        </div>

        {/* Callback Date-Time Scheduler */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Schedule Callback Date & Time for Salesperson <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={scheduledTime}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-xs font-semibold text-slate-800"
              required
            />
          </div>
        </div>

        {/* Internal Officer Advice for Salesperson */}
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Tactical Advisory / Tips for Salesperson <span className="text-slate-400">(Optional)</span>
          </label>
          <input
            type="text"
            value={officerInternalNotes}
            onChange={(e) => setOfficerInternalNotes(e.target.value)}
            placeholder="e.g. Reassure about COD payment safety, offer 30-day pack, or explain Asthi oil benefits..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-xs"
          />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Confirm Cancellation & Send to Sales →</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
