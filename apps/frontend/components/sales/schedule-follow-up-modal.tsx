'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import {
  CalendarClock,
  Clock,
  Calendar,
  FileText,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any | null;
  onScheduled?: (followUp: any) => void;
}

export function ScheduleFollowUpModal({
  isOpen,
  onClose,
  lead,
  onScheduled,
}: ScheduleFollowUpModalProps) {
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Defaults to tomorrow
    return d.toISOString().slice(0, 10);
  });
  const [scheduledTime, setScheduledTime] = useState<string>('11:00');
  const [reminderNotes, setReminderNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!lead) return null;

  const handleQuickPreset = (daysFromNow: number, timeStr: string, defaultNote: string) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setScheduledDate(d.toISOString().slice(0, 10));
    setScheduledTime(timeStr);
    if (!reminderNotes) {
      setReminderNotes(defaultNote);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) {
      setError('Please select a callback date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Construct ISO timestamp from date and time
      const timeVal = scheduledTime || '10:00';
      const combinedDateTime = new Date(`${scheduledDate}T${timeVal}:00`);

      const payload = {
        leadId: lead.id,
        scheduledTime: combinedDateTime.toISOString(),
        reminderNotes: reminderNotes.trim() || `Scheduled callback for ${lead.customerName}`,
      };

      const res = await apiClient.post('/follow-ups', payload);

      if (onScheduled) {
        onScheduled(res.data);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('followup-scheduled', { detail: res.data }));
      }

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
      title="Schedule Customer Callback / Follow-Up"
      description="Set a specific date and time for telephonic follow-up when the client requires time or consideration."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Lead Target Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {lead.leadCode}
            </span>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Callback Required
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-sm block">{lead.customerName}</span>
              <div className="flex items-center gap-1.5 text-slate-500 font-mono text-xs mt-0.5">
                <Phone className="h-3 w-3 text-slate-400" />
                <span>{lead.phoneNumber}</span>
              </div>
            </div>
            {lead.productInterest && (
              <span className="text-[11px] text-slate-600 font-medium bg-white px-2 py-1 rounded border border-slate-200">
                Interest: {lead.productInterest}
              </span>
            )}
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="font-bold text-slate-700 block mb-1.5">
            Quick Callback Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickPreset(1, '11:00', 'Follow up tomorrow morning')}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition text-center"
            >
              Tomorrow 11 AM
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(1, '16:00', 'Follow up tomorrow evening')}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition text-center"
            >
              Tomorrow 4 PM
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(2, '14:00', 'Follow up in 2 days')}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition text-center"
            >
              In 2 Days (2 PM)
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(5, '11:00', 'Follow up after salary date')}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition text-center"
            >
              In 5 Days (Salary)
            </button>
          </div>
        </div>

        {/* Date and Time Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Callback Date *
            </label>
            <div className="relative">
              <Calendar className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-emerald-700"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Callback Time *
            </label>
            <div className="relative">
              <Clock className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-emerald-700"
                required
              />
            </div>
          </div>
        </div>

        {/* Reminder Notes */}
        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Consultation / Follow-Up Directive Notes
          </label>
          <textarea
            value={reminderNotes}
            onChange={(e) => setReminderNotes(e.target.value)}
            placeholder="e.g. Client needs to consult with spouse; salary expected on 5th; interested in 3-month Joint Pain course..."
            rows={3}
            className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-emerald-700"
          />
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-[11px] text-emerald-800 flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            You will receive an automated in-app reminder notification on this scheduled date so you can follow up seamlessly.
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
            icon={<CalendarClock className="h-3.5 w-3.5" />}
          >
            Save & Schedule Callback
          </Button>
        </div>
      </form>
    </Modal>
  );
}
