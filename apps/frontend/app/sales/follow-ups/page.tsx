'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import {
  CalendarClock,
  RefreshCw,
  PhoneCall,
  Phone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  RotateCcw,
  AlertTriangle,
  Search,
  Filter,
  PackagePlus,
  User,
  Activity,
  Boxes,
} from 'lucide-react';

export default function FollowUpsAgendaPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'ALL';

  const [activeTab, setActiveTab] = useState<string>(
    initialTab === 'VERIFICATION_CANCELLED' ? 'VERIFICATION_CANCELLED' : 'ALL'
  );

  const [followUps, setFollowUps] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    verificationCancelledCount: 0,
    dueTodayCount: 0,
    overdueCount: 0,
    completedTodayCount: 0,
    activeScheduledCount: 0,
    allCount: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync tab if query param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'VERIFICATION_CANCELLED') {
      setActiveTab('VERIFICATION_CANCELLED');
    }
  }, [searchParams]);

  const fetchFollowUps = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('tab', activeTab);
      params.append('limit', '100');
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await apiClient.get(`/follow-ups/my?${params.toString()}`);
      setFollowUps(res.data?.data || []);
      if (res.data?.summary) {
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [activeTab]);

  const handleComplete = async (id: string) => {
    try {
      await apiClient.patch(`/follow-ups/${id}/complete`, {});
      setSuccessMsg('Follow-up marked as completed.');
      fetchFollowUps();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const filteredFollowUps = useMemo(() => {
    if (!searchQuery.trim()) return followUps;
    const q = searchQuery.toLowerCase();
    return followUps.filter((item) => {
      const name = (item.lead?.customerName || '').toLowerCase();
      const phone = (item.lead?.phoneNumber || '').toLowerCase();
      const code = (item.lead?.leadCode || '').toLowerCase();
      const notes = (item.reminderNotes || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || code.includes(q) || notes.includes(q);
    });
  }, [followUps, searchQuery]);

  const columns: Column<any>[] = [
    {
      key: 'status',
      header: 'Status & Category',
      render: (item) => {
        const isApprovalCancelled = item.reminderNotes?.includes('[Approval Officer');
        const isOverdue =
          item.status === 'OVERDUE' ||
          (item.status === 'SCHEDULED' && new Date(item.scheduledTime) < new Date());

        return (
          <div className="space-y-1.5 min-w-[130px]">
            {isApprovalCancelled ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                <RotateCcw className="w-3 h-3 text-amber-700 shrink-0" /> Verification Cancelled
              </span>
            ) : null}
            <div>
              <Badge variant={item.status === 'COMPLETED' ? 'success' : isOverdue ? 'danger' : 'warning'}>
                {item.status === 'COMPLETED' ? 'COMPLETED' : isOverdue ? 'OVERDUE' : item.status}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Customer Details',
      render: (item) => (
        <div className="min-w-[160px]">
          <span className="font-bold text-slate-900 block text-xs">
            {item.lead?.customerName || 'Customer'}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <a
              href={`tel:${item.lead?.phoneNumber}`}
              className="font-mono text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3 h-3 text-emerald-600" />
              {item.lead?.phoneNumber || 'N/A'}
            </a>
            {item.lead?.leadCode && (
              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                {item.lead.leadCode}
              </span>
            )}
          </div>
          {item.lead?.city && (
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {[item.lead.city, item.lead.state].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'scheduledTime',
      header: 'Scheduled Callback',
      render: (item) => {
        const dateObj = new Date(item.scheduledTime);
        const isPast = item.status !== 'COMPLETED' && dateObj < new Date();
        return (
          <div className={`text-xs min-w-[130px] ${isPast ? 'text-red-700 font-bold' : 'text-slate-800'}`}>
            <div className="flex items-center gap-1 font-mono">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>{dateObj.toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono mt-0.5 text-slate-500">
              <Clock className="h-3 w-3 text-slate-400" />
              <span>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'reminderNotes',
      header: 'Consultation Agenda & Patient Objections',
      render: (item) => {
        const isApprovalCancelled = item.reminderNotes?.includes('[Approval Officer');
        if (isApprovalCancelled) {
          const rawNote = item.reminderNotes || '';
          const match = rawNote.match(/\[Approval Officer Cancellation Feedback:\s*([^\]]+)\]\s*(.*)/);
          const reasonCode = match ? match[1] : 'CUSTOMER_CANCELLED';
          const feedback = match ? match[2] : rawNote;

          return (
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 max-w-md shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 text-[11px] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Reason: <strong className="text-amber-800 uppercase">{reasonCode.replace(/_/g, ' ')}</strong>
                </span>
              </div>
              <p className="text-slate-900 text-xs font-medium italic">
                &quot;{feedback}&quot;
              </p>
              <div className="text-[10px] text-amber-800 font-medium pt-0.5 border-t border-amber-200/50">
                👉 Call back to resolve client objections and recover the Ayurvedic treatment course.
              </div>
            </div>
          );
        }

        return (
          <span className="text-xs text-slate-700 max-w-md block">
            {item.reminderNotes || 'Follow up with customer'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right min-w-[140px]',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/sales/calling?leadId=${item.leadId}`}>
            <Button
              variant="primary"
              size="sm"
              icon={<PhoneCall className="h-3 w-3" />}
              className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              Call
            </Button>
          </Link>

          {item.status !== 'COMPLETED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleComplete(item.id)}
              icon={<CheckCircle2 className="h-3 w-3 text-emerald-600" />}
              className="text-xs px-2.5 py-1 text-slate-700 hover:text-emerald-700 cursor-pointer"
              title="Mark follow-up completed / recovered"
            >
              Done
            </Button>
          )}
        </div>
      ),
    },
  ];

  const followUpsExportColumns: ExcelColumnDef[] = [
    { header: 'Status', accessor: 'status' },
    { header: 'Customer Name', accessor: (it: any) => it.lead?.customerName || '' },
    { header: 'Contact Phone', accessor: (it: any) => it.lead?.phoneNumber || '' },
    { header: 'Scheduled Date & Time', accessor: (it: any) => it.scheduledTime ? new Date(it.scheduledTime).toLocaleString('en-IN') : '' },
    { header: 'Consultation Agenda Notes', accessor: 'reminderNotes' },
    { header: 'Created Date', accessor: (it: any) => it.createdAt ? new Date(it.createdAt).toLocaleDateString('en-IN') : '' },
  ];

  return (
    <div className="space-y-5 p-3 sm:p-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Consultation Follow-Up Agenda
              </h2>
              <p className="text-xs text-slate-500">
                Scheduled callbacks, overdue patient follow-ups, and verification-cancelled recovery tasks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredFollowUps}
            columns={followUpsExportColumns}
            fileName={`Melayurveda_Sales_FollowUps_${activeTab}`}
            sheetName="Follow-Up Agenda"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFollowUps}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            className="cursor-pointer"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Verification Cancelled */}
        <div
          onClick={() => setActiveTab('VERIFICATION_CANCELLED')}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all shadow-2xs ${
            activeTab === 'VERIFICATION_CANCELLED'
              ? 'border-2 border-amber-500 bg-amber-50/70 ring-1 ring-amber-400'
              : 'border-slate-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Verification Cancelled</span>
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900">
            {summary.verificationCancelledCount || 0}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5 font-medium">Deals to re-engage & recover</div>
        </div>

        {/* Due Today / Active */}
        <div
          onClick={() => setActiveTab('ACTIVE')}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all shadow-2xs ${
            activeTab === 'ACTIVE'
              ? 'border-2 border-blue-500 bg-blue-50/70 ring-1 ring-blue-400'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-800 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active Callbacks</span>
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-900">
            {summary.activeScheduledCount || 0}
          </div>
          <div className="text-[11px] text-blue-700 mt-0.5 font-medium">Scheduled & awaiting calls</div>
        </div>

        {/* Overdue */}
        <div
          onClick={() => setActiveTab('OVERDUE')}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all shadow-2xs ${
            activeTab === 'OVERDUE'
              ? 'border-2 border-red-500 bg-red-50/70 ring-1 ring-red-400'
              : 'border-slate-200 bg-white hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between text-red-800 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Overdue Callbacks</span>
            <div className="p-1.5 bg-red-100 text-red-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-900">
            {summary.overdueCount || 0}
          </div>
          <div className="text-[11px] text-red-700 mt-0.5 font-medium">Passed scheduled time</div>
        </div>

        {/* Completed */}
        <div
          onClick={() => setActiveTab('COMPLETED')}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all shadow-2xs ${
            activeTab === 'COMPLETED'
              ? 'border-2 border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-400'
              : 'border-slate-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Completed History</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900">
            {summary.completedTodayCount || 0}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">Calls logged as finished</div>
        </div>
      </div>

      {/* Tabs & Search Navigation Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Section Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('VERIFICATION_CANCELLED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'VERIFICATION_CANCELLED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Verification Cancelled Deals</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'VERIFICATION_CANCELLED' ? 'bg-white/30 text-white' : 'bg-amber-200 text-amber-900'}`}>
                {summary.verificationCancelledCount || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Active Scheduled</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'ACTIVE' ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {summary.activeScheduledCount || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('OVERDUE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'OVERDUE'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Overdue</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'OVERDUE' ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {summary.overdueCount || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>All Records</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredFollowUps.length}</strong> callbacks
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, lead code, or objection notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
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

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredFollowUps}
          isLoading={isLoading}
          emptyMessage={
            activeTab === 'VERIFICATION_CANCELLED'
              ? 'No verification-cancelled deals found! Great job maintaining deal momentum.'
              : 'No follow-ups found in this agenda view.'
          }
        />
      </div>
    </div>
  );
}
