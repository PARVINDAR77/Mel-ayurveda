'use client';

import React, { useState } from 'react';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/button';
import {
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  Package,
  User,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

interface DecideOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  initialDecision?: 'CONFIRM' | 'REQUEST_RECTIFICATION' | 'REJECT';
  onDecided?: (result: any) => void;
}

export function DecideOrderModal({
  isOpen,
  onClose,
  order,
  initialDecision = 'CONFIRM',
  onDecided,
}: DecideOrderModalProps) {
  const { user } = useAuth();
  const [decision, setDecision] = useState<'CONFIRM' | 'REQUEST_RECTIFICATION' | 'REJECT'>(
    initialDecision
  );
  const [rejectionReason, setRejectionReason] = useState('PRICING_BELOW_FLOOR');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (decision !== 'CONFIRM' && remarks.trim().length < 5) {
      setError('Please provide specific, actionable remarks (at least 5 characters) so the salesperson knows what to rectify.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        decision,
        remarks: remarks.trim() || 'Verified and confirmed by approval authority',
      };

      if (decision === 'REJECT' || decision === 'REQUEST_RECTIFICATION') {
        payload.rejectionReason = rejectionReason;
      }

      const res = await apiClient.post(`/orders/${order.id}/decide`, payload);
      setSuccessMsg(`Order decision recorded: ${decision}. Real-time notifications dispatched.`);

      setTimeout(() => {
        if (onDecided) onDecided(res.data);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-800 text-amber-300 font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Order Sign-Off & Verification
              </h3>
              <p className="text-xs text-slate-300">
                Order <span className="font-mono font-bold text-amber-300">{order.orderNumber}</span> | Total: <span className="font-bold text-white">₹{order.totalAmount}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Order Brief Summary */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900">{order.customer?.fullName}</span>
              <span className="font-mono text-slate-500 ml-2">({order.customer?.phoneNumber})</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Booked by: </span>
              <span className="font-mono font-bold text-slate-900">{order.createdBy?.employeeCode || 'Consultant'}</span>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
            <span>Items: {order.items?.length || 0} formulations</span>
            <span>•</span>
            <span>Mode: {order.paymentMode}</span>
            <span>•</span>
            <span>Status: <strong className="text-amber-800">{order.status}</strong></span>
          </div>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-800">
          {/* 3 Decision Cards */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">Select Sign-off Action *</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDecision('CONFIRM')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                  decision === 'CONFIRM'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-bold">CONFIRM</span>
                <span className="text-[10px] font-normal text-emerald-700">Reserve & Dispatch</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REQUEST_RECTIFICATION')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                  decision === 'REQUEST_RECTIFICATION'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <RotateCcw className="h-5 w-5 text-amber-600" />
                <span className="font-bold">RECTIFY</span>
                <span className="text-[10px] font-normal text-amber-700">Send to Salesperson</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECT')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                  decision === 'REJECT'
                    ? 'border-red-600 bg-red-50 text-red-950 font-bold ring-2 ring-red-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-bold">REJECT</span>
                <span className="text-[10px] font-normal text-red-700">Cancel Order</span>
              </button>
            </div>
          </div>

          {/* Structured Reason for Rectify / Reject */}
          {decision !== 'CONFIRM' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Structured Discrepancy Reason *
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              >
                <option value="PRICING_BELOW_FLOOR">Pricing Discrepancy: Custom price violates minimum profit floor</option>
                <option value="INCORRECT_DOSAGE">Dosage Issue: Prescribed instructions incomplete or incorrect</option>
                <option value="INCOMPLETE_ADDRESS">Logistics Issue: Address / Pincode incomplete or non-deliverable</option>
                <option value="MEDICAL_CONTRAINDICATION">Clinical Issue: Patient contraindication for formulation</option>
                <option value="CUSTOMER_REQUESTED_CHANGES">Customer Communication: Patient requested different bundle</option>
                <option value="OTHER_DISCREPANCY">Other Discrepancy (Specify in remarks below)</option>
              </select>
            </div>
          )}

          {/* Remarks Textarea */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {decision === 'CONFIRM' ? 'Confirmation Remarks (Optional)' : 'Directives & Remarks for Salesperson *'}
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                decision === 'CONFIRM'
                  ? 'e.g. Clinical regimen verified, inventory cleared for courier packing.'
                  : 'Specify exactly what the salesperson must fix (e.g. "Price for Joint Care must be at least ₹1800; correct pincode is required before dispatch").'
              }
              className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              required={decision !== 'CONFIRM'}
            />
            {decision !== 'CONFIRM' && (
              <p className="mt-1 text-[11px] text-amber-800">
                ⚡ These remarks will immediately appear in the salesperson&apos;s &quot;My Booked Orders&quot; desk and trigger a push notification.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className={`font-bold text-white px-5 ${
                decision === 'CONFIRM'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : decision === 'REQUEST_RECTIFICATION'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-red-700 hover:bg-red-800'
              }`}
            >
              {decision === 'CONFIRM'
                ? 'Confirm & Reserve Stock'
                : decision === 'REQUEST_RECTIFICATION'
                ? 'Send Directives to Salesperson'
                : 'Reject Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
