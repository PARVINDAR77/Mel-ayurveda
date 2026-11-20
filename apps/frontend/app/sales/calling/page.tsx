'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import {
  PhoneCall,
  PhoneForwarded,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Send,
  User,
  MapPin,
  Flame,
} from 'lucide-react';

function CallingWorkspaceContent() {
  const searchParams = useSearchParams();
  const initialLeadId = searchParams.get('leadId');

  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmittingCall, setIsSubmittingCall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Call form state
  const [outcome, setOutcome] = useState('INTERESTED');
  const [durationSeconds, setDurationSeconds] = useState(120);
  const [notes, setNotes] = useState('');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Fetch all assigned leads
  const fetchLeads = async () => {
    try {
      setIsLoadingLeads(true);
      const res = await apiClient.get('/leads?limit=100');
      const data = res.data?.data || [];
      setLeads(data);

      if (initialLeadId) {
        const found = data.find((l: any) => l.id === initialLeadId);
        if (found) setSelectedLead(found);
        else if (data.length > 0) setSelectedLead(data[0]);
      } else if (data.length > 0) {
        setSelectedLead(data[0]);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [initialLeadId]);

  // Fetch call history when selected lead changes
  useEffect(() => {
    if (!selectedLead) return;

    const fetchHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const res = await apiClient.get(`/calling/logs/lead/${selectedLead.id}`);
        setCallHistory(res.data || []);
      } catch {
        setCallHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedLead]);

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      setIsSubmittingCall(true);
      setError(null);

      // 1. Submit call log
      await apiClient.post('/calling/logs', {
        leadId: selectedLead.id,
        callOutcome: outcome,
        durationSeconds: Number(durationSeconds),
        notes: notes || undefined,
      });

      // 2. If follow-up scheduled
      if (scheduleFollowUp && followUpTime) {
        await apiClient.post('/follow-ups', {
          leadId: selectedLead.id,
          scheduledTime: new Date(followUpTime).toISOString(),
          reminderNotes: followUpNotes || 'Scheduled consultation follow-up',
        });
      }

      setSuccessMsg(`Call log recorded with outcome: ${outcome}`);
      setNotes('');
      setScheduleFollowUp(false);
      setFollowUpTime('');
      setFollowUpNotes('');

      // Refresh call history and lead list
      const histRes = await apiClient.get(`/calling/logs/lead/${selectedLead.id}`);
      setCallHistory(histRes.data || []);
      fetchLeads();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingCall(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Consultant Calling Workspace
          </h2>
          <p className="text-xs text-slate-500">
            Dialing queue, patient clinical dossier, immutable consultation logging, and follow-up scheduler.
          </p>
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

      {/* Main Grid: Left side lead selector & patient info; Right side call form & history */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Lead Selector */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Assigned Calling Queue</CardTitle>
              <CardDescription>Select a patient to open active consultation desk</CardDescription>
            </CardHeader>
            <CardContent className="p-2 space-y-1 max-h-[500px] overflow-y-auto">
              {isLoadingLeads ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading queue...</div>
              ) : leads.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No leads in queue.</div>
              ) : (
                leads.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLead(l)}
                    className={`p-3 rounded-lg border transition cursor-pointer ${
                      selectedLead?.id === l.id
                        ? 'border-forest-700 bg-forest-50/60 shadow-sm'
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">{l.leadCode}</span>
                      <Badge variant="priority" className="text-[9px] px-1.5 py-0">
                        {l.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 font-semibold text-xs text-slate-900 truncate">
                      {l.customerName}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span className="font-mono">{l.phoneNumber}</span>
                      <Badge variant="leadStatus" className="text-[9px] px-1 py-0">
                        {l.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (8 cols): Consultation Workspace */}
        <div className="lg:col-span-8 space-y-4">
          {selectedLead ? (
            <>
              {/* Patient Banner */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                        {selectedLead.leadCode}
                      </span>
                      <Badge variant="priority">{selectedLead.priority}</Badge>
                      <Badge variant="leadStatus">{selectedLead.status}</Badge>
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {selectedLead.customerName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-600">
                      <span className="font-mono font-semibold text-slate-900">
                        📞 {selectedLead.phoneNumber}
                      </span>
                      {selectedLead.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {selectedLead.city}, {selectedLead.state || ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${selectedLead.phoneNumber}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm transition"
                    >
                      <PhoneCall className="h-4 w-4" />
                      Dial Patient
                    </a>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Ayurvedic Interest:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {selectedLead.productInterest || 'General Consultation'}
                    </span>
                  </div>
                  {selectedLead.notes && (
                    <div>
                      <span className="text-slate-400 font-medium">Initial Notes:</span>{' '}
                      <span className="text-slate-700">{selectedLead.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Log Call Form Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PhoneForwarded className="h-4 w-4 text-forest-800" />
                    Log Consultation Outcome
                  </CardTitle>
                  <CardDescription>
                    Records an immutable append-only call record and advances patient lifecycle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogCall} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                          Consultation Outcome
                        </label>
                        <select
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value)}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
                        >
                          <option value="INTERESTED">INTERESTED - Qualified for Treatment</option>
                          <option value="FOLLOW_UP_REQUIRED">FOLLOW_UP_REQUIRED - Needs Callback</option>
                          <option value="BUSY_CALL_LATER">BUSY_CALL_LATER - Patient Busy</option>
                          <option value="NO_ANSWER">NO_ANSWER - Did Not Pick Up</option>
                          <option value="NOT_INTERESTED">NOT_INTERESTED - Declined</option>
                          <option value="INVALID_NUMBER">INVALID_NUMBER - Wrong Number</option>
                          <option value="REJECTED">REJECTED - Not Eligible</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                          Call Duration (Seconds)
                        </label>
                        <input
                          type="number"
                          value={durationSeconds}
                          onChange={(e) => setDurationSeconds(Number(e.target.value))}
                          min={1}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Consultation Clinical Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Patient symptoms, pain severity, duration of ailment, recommended formulation..."
                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
                        required
                      />
                    </div>

                    {/* Follow-up Scheduling Section */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scheduleFollowUp}
                          onChange={(e) => setScheduleFollowUp(e.target.checked)}
                          className="rounded border-slate-300 text-forest-800 focus:ring-forest-700"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Schedule Next Follow-Up Call
                        </span>
                      </label>

                      {scheduleFollowUp && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <Input
                            label="Follow-Up Date & Time"
                            type="datetime-local"
                            value={followUpTime}
                            onChange={(e) => setFollowUpTime(e.target.value)}
                            required={scheduleFollowUp}
                          />
                          <Input
                            label="Reminder Notes"
                            value={followUpNotes}
                            onChange={(e) => setFollowUpNotes(e.target.value)}
                            placeholder="e.g. Call back after consulting spouse"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={isSubmittingCall}
                        icon={<PhoneCall className="h-4 w-4" />}
                      >
                        Submit Consultation Call Log
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Consultation History Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4 text-forest-800" />
                    Consultation History for {selectedLead.customerName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingHistory ? (
                    <div className="py-6 text-center text-xs text-slate-400">Loading history...</div>
                  ) : callHistory.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No previous call logs recorded for this patient.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {callHistory.map((call) => (
                        <div key={call.id} className="py-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="slate" className="font-mono text-[10px]">
                              {call.callOutcome}
                            </Badge>
                            <span className="text-[10px] text-slate-400">
                              {new Date(call.calledAt).toLocaleString()} • {call.durationSeconds}s
                            </span>
                          </div>
                          {call.notes && (
                            <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                              {call.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400">
              Select a lead from the queue to start consulting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CallingWorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading workspace...</div>}>
      <CallingWorkspaceContent />
    </Suspense>
  );
}
