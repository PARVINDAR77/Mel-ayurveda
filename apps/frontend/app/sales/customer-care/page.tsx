'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/auth-context';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import {
  PhoneCall,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  MapPin,
  Sparkles,
  RefreshCw,
  Search,
  Activity,
  History,
  FileText,
  User,
  HeartPulse,
  Phone,
  ChevronRight,
  ArrowRight,
  X,
  Check,
} from 'lucide-react';

export default function CustomerCareFollowUpPage() {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'PENDING' | 'COMPLETED' | 'ALL'>('PENDING');

  // Active tab on right panel
  const [rightTab, setRightTab] = useState<'consultation' | 'orders' | 'history'>('consultation');

  // Call & Consultation Modal state
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  // Quick action loading state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Consultation Logger Form State
  const [disposition, setDisposition] = useState('CONNECTED_SATISFIED');
  const [healthRating, setHealthRating] = useState<string>('SIGNIFICANT_RELIEF');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [patientFeedback, setPatientFeedback] = useState('');
  const [refillRequested, setRefillRequested] = useState(false);
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [callDuration, setCallDuration] = useState(180);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  const fetchFollowUps = async () => {
    try {
      setIsLoadingQueue(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusTab !== 'ALL') params.append('status', statusTab);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiClient.get(`/customer-followups/my?${params.toString()}`);
      const list = res.data?.data || res.data || [];
      setFollowUps(list);

      if (selectedFollowUp) {
        const updated = list.find((f: any) => f.id === selectedFollowUp.id);
        if (updated) setSelectedFollowUp(updated);
        else if (list.length > 0) setSelectedFollowUp(list[0]);
      } else if (list.length > 0) {
        setSelectedFollowUp(list[0]);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [statusTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFollowUps();
  };

  // Quick 1-click status change (e.g. PENDING -> COMPLETED)
  const handleQuickStatusChange = async (followUpId: string, newStatus: string, notes?: string) => {
    try {
      setIsUpdatingStatus(true);
      setError(null);

      await apiClient.patch(`/customer-followups/${followUpId}/status`, {
        status: newStatus,
        notes: notes || `Follow-up status marked as ${newStatus} by executive.`,
        disposition: disposition || 'CONNECTED_SATISFIED',
      });

      setSuccessMsg(`Client follow-up successfully marked as ${newStatus}!`);
      await fetchFollowUps();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Full consultation logger submit (marks COMPLETED or RESCHEDULED)
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;

    if (!consultationNotes.trim()) {
      setError('Please provide consultation notes describing patient health feedback.');
      return;
    }

    try {
      setIsSubmittingLog(true);
      setError(null);

      const payload = {
        disposition,
        healthRating: healthRating || undefined,
        consultationNotes: consultationNotes.trim(),
        patientFeedback: patientFeedback.trim() || undefined,
        refillRequested,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : undefined,
        callDurationSeconds: callDuration,
      };

      await apiClient.post(`/customer-followups/${selectedFollowUp.id}/log`, payload);
      setSuccessMsg('Consultation logged & follow-up marked as completed!');
      setConsultationNotes('');
      setPatientFeedback('');
      setNextFollowUpDate('');
      setRefillRequested(false);
      setIsCallModalOpen(false);
      await fetchFollowUps();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const customer = selectedFollowUp?.customer;
  const orders = customer?.orders || [];
  const latestOrder = orders[0];

  const customerCareExportColumns: ExcelColumnDef[] = [
    { header: 'Client Code', accessor: (it: any) => it.customer?.customerCode || 'N/A' },
    { header: 'Client Name', accessor: (it: any) => it.customer?.fullName || '' },
    { header: 'Contact Phone', accessor: (it: any) => it.customer?.phoneNumber || '' },
    { header: 'City', accessor: (it: any) => it.customer?.city || '' },
    { header: 'State', accessor: (it: any) => it.customer?.state || '' },
    { header: 'Scheduled Care Date', accessor: (it: any) => it.scheduledDate ? new Date(it.scheduledDate).toLocaleDateString('en-IN') : '' },
    { header: 'Care Status', accessor: 'status' },
    { header: 'Call Disposition', accessor: 'disposition' },
    { header: 'Health Rating', accessor: 'healthRating' },
    { header: 'Consultation Notes', accessor: 'consultationNotes' },
    { header: 'Patient Feedback', accessor: 'patientFeedback' },
    { header: 'Refill Probability', accessor: 'refillProbability' },
    { header: 'Refill Requested', accessor: (it: any) => (it.refillRequested ? 'YES' : 'NO') },
    { header: 'Next Callback Date', accessor: (it: any) => it.nextFollowUpDate ? new Date(it.nextFollowUpDate).toLocaleDateString('en-IN') : '' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-900 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              PANEL: POST-SALES CARE DESK
            </span>
            <Badge variant="role">Customer Follow-Up & Wellness Care</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Customer Wellness Follow-Up & Refill Desk
          </h2>
          <p className="text-xs text-slate-500">
            Review client medication regimens, call clients, record consultations, and confirm completed follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={followUps}
            columns={customerCareExportColumns}
            fileName="Melayurveda_Customer_Care_Followups"
            sheetName="Wellness Refills"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFollowUps}
            isLoading={isLoadingQueue}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>

          {user && (user.role === 'SUPER_ADMIN' || user.role === 'MANAGEMENT') && (
            <Link href="/admin/customer-followups">
              <Button variant="secondary" size="sm" className="text-xs font-bold">
                Super Admin Allocation Desk
              </Button>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
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
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main 2-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column (4 cols): Assigned Client Queue */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-4 bg-slate-50/70 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Assigned Care Queue ({followUps.length})
                </CardTitle>
                <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Care Desk
                </span>
              </div>

              {/* Status Tab Filter */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold mt-2">
                <button
                  type="button"
                  onClick={() => setStatusTab('PENDING')}
                  className={`flex-1 py-1 rounded-md transition cursor-pointer ${
                    statusTab === 'PENDING' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600'
                  }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setStatusTab('COMPLETED')}
                  className={`flex-1 py-1 rounded-md transition cursor-pointer ${
                    statusTab === 'COMPLETED' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600'
                  }`}
                >
                  Completed
                </button>
                <button
                  type="button"
                  onClick={() => setStatusTab('ALL')}
                  className={`flex-1 py-1 rounded-md transition cursor-pointer ${
                    statusTab === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600'
                  }`}
                >
                  All
                </button>
              </div>

              {/* Search in queue */}
              <form onSubmit={handleSearchSubmit} className="mt-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search client name, phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-forest-600"
                  />
                  <button type="submit" className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </CardHeader>

            <CardContent className="p-2 space-y-1.5 max-h-[620px] overflow-y-auto">
              {isLoadingQueue ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading assigned queue...</div>
              ) : followUps.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No clients in queue for this filter.
                </div>
              ) : (
                followUps.map((item) => {
                  const isSelected = selectedFollowUp?.id === item.id;
                  const isPending = item.status === 'PENDING';
                  const cust = item.customer;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedFollowUp(item)}
                      className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-700'
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {cust?.customerCode || 'CLIENT'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              item.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : item.status === 'RESCHEDULED'
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {item.status}
                          </span>

                          {/* Quick Done Checkmark on Hover */}
                          {isPending && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFollowUp(item);
                                setIsCallModalOpen(true);
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md transition shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Enter details & mark completed"
                            >
                              <Check className="w-2.5 h-2.5" />
                              Complete
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="font-bold text-xs text-slate-900 truncate">
                        {cust?.fullName || 'Client Name'}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>📞 {cust?.phoneNumber}</span>
                        <span>{cust?.orders?.length || 0} Orders</span>
                      </div>

                      <div className="text-[10px] text-emerald-800 bg-white p-1.5 rounded-lg border border-emerald-200/80 font-medium truncate">
                        🎯 {item.campaignObjective}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (8 cols): Selected Client Dossier & Consultation Desk */}
        <div className="lg:col-span-8 space-y-4">
          {selectedFollowUp && customer ? (
            <>
              {/* Client Demographics & Primary Action Header */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                        {customer.customerCode}
                      </span>
                      <h3 className="text-xl font-black text-slate-900">{customer.fullName}</h3>

                      {/* Interactive Status Dropdown Selector */}
                      <select
                        value={selectedFollowUp.status}
                        onChange={(e) => {
                          if (e.target.value === 'COMPLETED') {
                            setIsCallModalOpen(true);
                          } else {
                            handleQuickStatusChange(selectedFollowUp.id, e.target.value);
                          }
                        }}
                        disabled={isUpdatingStatus}
                        className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border shadow-2xs cursor-pointer outline-none transition ${
                          selectedFollowUp.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : selectedFollowUp.status === 'RESCHEDULED'
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : selectedFollowUp.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                        title="Change follow-up status directly"
                      >
                        <option value="PENDING">⏳ PENDING</option>
                        <option value="IN_PROGRESS">🔄 IN PROGRESS</option>
                        <option value="COMPLETED">✅ COMPLETED (CONFIRMED)</option>
                        <option value="RESCHEDULED">📅 RESCHEDULED</option>
                        <option value="CANCELLED">❌ CANCELLED</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
                      <span className="font-mono font-bold text-slate-900">📞 {customer.phoneNumber}</span>
                      {customer.alternatePhone && (
                        <span className="font-mono text-slate-500">Alt: {customer.alternatePhone}</span>
                      )}
                      {(customer.city || customer.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {[customer.city, customer.state].filter(Boolean).join(', ')}
                          {customer.pincode && ` (${customer.pincode})`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Primary Operations Actions: Call, Complete, Refill */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1. Call Client Button */}
                    <button
                      type="button"
                      onClick={() => {
                        window.open(`tel:${customer.phoneNumber}`);
                        setIsCallModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Client</span>
                    </button>

                    {/* 2. Direct Confirm / Complete Button (Opens Mandatory Details Form) */}
                    {selectedFollowUp.status === 'PENDING' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsCallModalOpen(true)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold shadow-sm text-xs flex items-center gap-1.5 cursor-pointer"
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Mark Completed
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Completed
                      </span>
                    )}
                  </div>
                </div>

                {/* Super Admin Directive Callout */}
                {selectedFollowUp.adminDirectives && (
                  <div className="rounded-xl border-2 border-amber-300 bg-amber-50/70 p-3.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-600 text-white">
                        Super Admin Directive
                      </span>
                      <span className="text-xs font-bold text-amber-950">
                        Special Instructions from {selectedFollowUp.assignedBy?.employeeCode || 'Super Admin'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 font-semibold italic whitespace-pre-line">
                      &quot;{selectedFollowUp.adminDirectives}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Right Workspace Segmented Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setRightTab('consultation')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                    rightTab === 'consultation'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span>Record Consultation & Feedback</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRightTab('orders')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                    rightTab === 'orders'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Order History & Regimens ({orders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRightTab('history')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                    rightTab === 'history'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Call Logs & History ({selectedFollowUp.logs?.length || 0})</span>
                </button>
              </div>

              {/* TAB 1: RECORD CONSULTATION & HEALTH FEEDBACK (DEFAULT FRONT & CENTER) */}
              {rightTab === 'consultation' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-emerald-700" />
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                        Record Follow-Up Consultation & Patient Health Feedback
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Current Status: <strong className="text-emerald-700">{selectedFollowUp.status}</strong>
                    </span>
                  </div>

                  <form onSubmit={handleLogSubmit} className="space-y-4 text-xs">
                    {/* Health Relief Rating Selector */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">
                        Patient Symptom Relief / Treatment Response *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <button
                          type="button"
                          onClick={() => setHealthRating('SIGNIFICANT_RELIEF')}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                            healthRating === 'SIGNIFICANT_RELIEF'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-600'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-sm">🌟 80-100%</span>
                          <span className="text-[10px]">Significant</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setHealthRating('MODERATE_RELIEF')}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                            healthRating === 'MODERATE_RELIEF'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-600'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-sm">🌿 40-79%</span>
                          <span className="text-[10px]">Moderate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setHealthRating('MILD_RELIEF')}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                            healthRating === 'MILD_RELIEF'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-600'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-sm">🌱 10-39%</span>
                          <span className="text-[10px]">Mild Relief</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setHealthRating('NO_CHANGE')}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                            healthRating === 'NO_CHANGE'
                              ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold ring-1 ring-amber-500'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-sm">⏳ No Change</span>
                          <span className="text-[10px]">Adjust Dose</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setHealthRating('ADVERSE_CONCERN')}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                            healthRating === 'ADVERSE_CONCERN'
                              ? 'border-red-600 bg-red-50 text-red-950 font-bold ring-1 ring-red-600'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-sm">⚠️ Sensitivity</span>
                          <span className="text-[10px]">Doctor Review</span>
                        </button>
                      </div>
                    </div>

                    {/* Disposition & Call Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Call Disposition *</label>
                        <select
                          value={disposition}
                          onChange={(e) => setDisposition(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-600"
                        >
                          <option value="CONNECTED_SATISFIED">Connected - Patient Highly Satisfied</option>
                          <option value="CONNECTED_REFILL_WANTED">Connected - Ready for Course Refill</option>
                          <option value="CONNECTED_DOSAGE_CONCERN">Connected - Customer Inquired on Dosage</option>
                          <option value="BUSY_CALL_LATER">Customer Busy - Requested Callback</option>
                          <option value="UNREACHABLE_NO_ANSWER">Ringing - No Answer</option>
                          <option value="WRONG_NUMBER">Wrong Number</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Schedule Next Check-In (Optional)</label>
                        <input
                          type="date"
                          value={nextFollowUpDate}
                          onChange={(e) => setNextFollowUpDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-600"
                        />
                      </div>
                    </div>

                    {/* Detailed Consultation Notes */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Consultation Notes & Patient Discussion *
                      </label>
                      <textarea
                        rows={3}
                        value={consultationNotes}
                        onChange={(e) => setConsultationNotes(e.target.value)}
                        required
                        placeholder="Record patient's experience with the medication, symptom relief observations, questions answered..."
                        className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-forest-600"
                      />
                    </div>

                    {/* Refill Checkbox & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={refillRequested}
                          onChange={(e) => setRefillRequested(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-700 cursor-pointer"
                        />
                        <span>Client requested monthly medication refill / continuation</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          isLoading={isSubmittingLog}
                          className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold px-6 shadow-md text-xs cursor-pointer"
                        >
                          Save Mandatory Details & Mark Completed ➔
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: ORDER HISTORY & PRESCRIBED FORMULATIONS */}
              {rightTab === 'orders' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-forest-700" />
                      Order History & Active Prescribed Formulations ({orders.length})
                    </span>
                    {latestOrder && (
                      <span className="font-mono text-xs font-bold text-slate-700">
                        Latest: {latestOrder.orderNumber}
                      </span>
                    )}
                  </div>

                  {orders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      No formulation orders booked for this customer yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((ord: any) => (
                        <div
                          key={ord.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  ord.status === 'DELIVERED'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : ord.status === 'CONFIRMED'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                {ord.status}
                              </span>
                              <span className="text-[11px] text-slate-500 uppercase font-mono">{ord.paymentMode}</span>
                            </div>

                            <span className="font-mono font-black text-slate-900 text-sm">
                              ₹{Number(ord.totalAmount).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Line Items */}
                          {ord.items && ord.items.length > 0 && (
                            <div className="space-y-1.5">
                              {ord.items.map((it: any) => (
                                <div
                                  key={it.id}
                                  className="flex items-start justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs"
                                >
                                  <div>
                                    <strong className="text-slate-900 block text-xs">
                                      {it.product?.name || 'Ayurvedic Medicine'}
                                    </strong>
                                    <span className="text-[11px] text-slate-500 block">
                                      Prescribed Regimen: {it.dosageInstructions || it.product?.dosageInstructions || 'Standard dosage'}
                                    </span>
                                  </div>
                                  <div className="text-right font-mono font-bold text-slate-800 shrink-0 ml-2">
                                    Qty: {it.quantity} • ₹{Number(it.totalPrice).toLocaleString('en-IN')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Delivery Courier Tracking */}
                          {ord.shipment && (
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200 font-mono">
                              <span>Courier: <strong>{ord.shipment.courierPartner}</strong></span>
                              <span>AWB: <strong>{ord.shipment.trackingAwb}</strong></span>
                              <span className="text-emerald-700 font-bold">Status: {ord.shipment.status}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PAST CONSULTATION HISTORY */}
              {rightTab === 'history' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-forest-700" />
                      Past Consultation History ({selectedFollowUp.logs?.length || 0})
                    </h4>
                  </div>

                  {(!selectedFollowUp.logs || selectedFollowUp.logs.length === 0) ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      No past consultation records logged for this client yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedFollowUp.logs.map((log: any) => (
                        <div
                          key={log.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{log.disposition}</span>
                              {log.healthRating && (
                                <Badge variant="success" className="text-[10px]">
                                  {log.healthRating}
                                </Badge>
                              )}
                              {log.refillRequested && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Refill Wanted
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-slate-700 font-medium whitespace-pre-line bg-white p-2.5 rounded-lg border border-slate-200">
                            {log.consultationNotes}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200">
                            <span>Caller: {log.caller?.employeeCode || 'Executive'}</span>
                            {log.nextFollowUpDate && (
                              <span>
                                Next Scheduled: {new Date(log.nextFollowUpDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-400 bg-white">
              Select a client from the left queue to open their care dossier and consultation workspace.
            </div>
          )}
        </div>

      </div>

      {/* Call & Consultation Modal Dialog */}
      {isCallModalOpen && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCallModalOpen(false)}
          />

          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#071912] to-[#0f2e22] text-white p-5 border-b border-emerald-900/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Confirm Follow-Up: Mandatory Details</h3>
                  <p className="text-xs text-emerald-300/80 mt-0.5 font-mono">
                    {customer.fullName} • {customer.phoneNumber} • {customer.customerCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCallModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mandatory Instruction Alert Banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-xs text-amber-900 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Mandatory: Please record patient treatment response & notes to confirm completion.</span>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleLogSubmit} className="p-6 space-y-4 text-xs bg-slate-50">
              {/* Disposition */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Call Disposition / Outcome <span className="text-rose-600 font-black">*</span>
                </label>
                <select
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-600"
                >
                  <option value="CONNECTED_SATISFIED">Connected - Patient Highly Satisfied</option>
                  <option value="CONNECTED_REFILL_WANTED">Connected - Ready for Course Refill</option>
                  <option value="CONNECTED_DOSAGE_CONCERN">Connected - Customer Inquired on Dosage</option>
                  <option value="BUSY_CALL_LATER">Customer Busy - Requested Callback</option>
                  <option value="UNREACHABLE_NO_ANSWER">Ringing - No Answer</option>
                  <option value="WRONG_NUMBER">Wrong Number</option>
                </select>
              </div>

              {/* Patient Symptom Relief */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Patient Symptom Relief / Response <span className="text-rose-600 font-black">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setHealthRating('SIGNIFICANT_RELIEF')}
                    className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                      healthRating === 'SIGNIFICANT_RELIEF'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🌟 Significant (80-100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHealthRating('MODERATE_RELIEF')}
                    className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                      healthRating === 'MODERATE_RELIEF'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🌿 Moderate (40-79%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHealthRating('NO_CHANGE')}
                    className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                      healthRating === 'NO_CHANGE'
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold ring-1 ring-amber-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ⏳ No Change / Adjust
                  </button>
                </div>
              </div>

              {/* Consultation Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Consultation Notes & Patient Discussion <span className="text-rose-600 font-black">*</span>
                </label>
                <textarea
                  rows={3}
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  required
                  placeholder="Record patient's experience with the medication, symptom relief observations, questions answered..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-forest-600"
                />
              </div>

              {/* Refill Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={refillRequested}
                  onChange={(e) => setRefillRequested(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-700 cursor-pointer"
                />
                <span>Client requested monthly medication refill / continuation</span>
              </label>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCallModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingLog}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold px-6 shadow-md cursor-pointer"
                >
                  Save Details & Complete Follow-Up ➔
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
