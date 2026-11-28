'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

export default function FollowUpsAgendaPage() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchFollowUps = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get('/follow-ups/my');
      setFollowUps(res.data?.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleComplete = async (id: string) => {
    try {
      await apiClient.patch(`/follow-ups/${id}/complete`, {});
      setSuccessMsg('Follow-up marked as completed.');
      fetchFollowUps();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const isApprovalCancelled = item.reminderNotes?.includes('[Approval Officer');
        const isOverdue =
          item.status === 'OVERDUE' ||
          (item.status === 'SCHEDULED' && new Date(item.scheduledTime) < new Date());
        return (
          <div className="space-y-1">
            {isApprovalCancelled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <RotateCcw className="w-2.5 h-2.5 text-amber-700" /> Verification Cancelled
              </span>
            )}
            <div>
              <Badge variant={isOverdue ? 'danger' : 'warning'}>
                {isOverdue ? 'OVERDUE' : item.status}
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
        <div>
          <span className="font-semibold text-slate-900">{item.lead?.customerName || 'N/A'}</span>
          <div className="font-mono text-xs text-slate-500 mt-0.5">
            {item.lead?.phoneNumber || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      key: 'scheduledTime',
      header: 'Scheduled Date & Time',
      render: (item) => {
        const dateObj = new Date(item.scheduledTime);
        const isPast = dateObj < new Date();
        return (
          <div className={`text-xs ${isPast ? 'text-red-700 font-bold' : 'text-slate-800'}`}>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>{dateObj.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono mt-0.5">
              <Clock className="h-3 w-3 text-slate-400" />
              <span>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'reminderNotes',
      header: 'Consultation Agenda Notes',
      render: (item) => {
        const isApprovalCancelled = item.reminderNotes?.includes('[Approval Officer');
        if (isApprovalCancelled) {
          return (
            <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-2 max-w-sm">
              <span className="font-bold text-amber-900 text-[11px] block flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                Objection in Verification:
              </span>
              <p className="text-slate-800 text-xs italic mt-0.5 line-clamp-3">
                {item.reminderNotes}
              </p>
            </div>
          );
        }
        return (
          <span className="text-xs text-slate-700">
            {item.reminderNotes || 'Follow up with customer'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/sales/calling?leadId=${item.leadId}`}>
            <Button variant="primary" size="sm" icon={<PhoneCall className="h-3 w-3" />}>
              Call
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleComplete(item.id)}
            icon={<CheckCircle2 className="h-3 w-3" />}
          >
            Done
          </Button>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Consultation Follow-Up Agenda
          </h2>
          <p className="text-xs text-slate-500">
            Scheduled callbacks and overdue follow-up tasks to maintain conversion momentum.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={followUps}
            columns={followUpsExportColumns}
            fileName="Melayurveda_Sales_FollowUps"
            sheetName="Follow-Up Agenda"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFollowUps}
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

      {/* Follow-ups Table */}
      <DataTable
        columns={columns}
        data={followUps}
        searchKey="reminderNotes"
        searchPlaceholder="Filter follow-up notes..."
        isLoading={isLoading}
        emptyMessage="No pending follow-ups in your schedule! All caught up."
        exportConfig={{
          fileName: 'Melayurveda_Sales_FollowUps',
          sheetName: 'Follow-Up Agenda',
          columns: followUpsExportColumns,
        }}
      />
    </div>
  );
}
