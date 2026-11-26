'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import {
  History,
  RefreshCw,
  Eye,
  ShieldAlert,
  Calendar,
  AlertCircle,
  FileCode,
  ShieldCheck,
  User,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function AuditAdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // JSON Diff Modal
  const [inspectLog, setInspectLog] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [logsRes, summaryRes] = await Promise.all([
        apiClient.get('/audit/logs?limit=100'),
        apiClient.get('/audit/summary'),
      ]);

      setLogs(logsRes.data?.data || []);
      setSummary(summaryRes.data || null);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getActionBadgeClass = (action: string) => {
    if (action.includes('CONVERT') || action.includes('APPROVED')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (action.includes('ASSIGN') || action.includes('CREATED')) {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    if (action.includes('ORDER') || action.includes('INVOICE')) {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    }
    if (action.includes('CALL') || action.includes('FOLLOWUP')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const filteredLogs = React.useMemo(() => {
    if (selectedActionFilter === 'ALL') return logs;
    return logs.filter((l) => l.action.toLowerCase().includes(selectedActionFilter.toLowerCase()));
  }, [logs, selectedActionFilter]);

  const columns: Column<any>[] = [
    {
      key: 'action',
      header: 'Audit Action',
      render: (item) => (
        <span
          className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border uppercase tracking-wider ${getActionBadgeClass(
            item.action,
          )}`}
        >
          {item.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Target Record & Entity',
      render: (item) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{item.entityType}</span>
          <span className="font-mono text-[10px] text-slate-500 truncate max-w-[160px] block">
            ID: {item.entityId}
          </span>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Initiating User / Actor',
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
            {item.user ? `${item.user.firstName[0]}${item.user.lastName[0]}` : 'SYS'}
          </div>
          <div>
            <span className="font-semibold text-slate-900 text-xs block">
              {item.user ? `${item.user.firstName} ${item.user.lastName}` : 'System Engine'}
            </span>
            {item.user && (
              <span className="font-mono text-[10px] text-emerald-700 font-medium block">
                {item.user.employeeCode} • {item.user.role.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'Network IP',
      render: (item) => (
        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {item.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp (UTC / IST)',
      render: (item) => (
        <div className="text-xs text-slate-600 font-mono">
          <div>{new Date(item.createdAt).toLocaleDateString()}</div>
          <div className="text-[10px] text-slate-400">
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'State Inspection',
      className: 'text-right',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInspectLog(item)}
          icon={<Eye className="h-3 w-3 text-emerald-700" />}
          className="text-xs font-medium"
        >
          Inspect Diff
        </Button>
      ),
    },
  ];

  const auditExportColumns: ExcelColumnDef[] = [
    { header: 'Action Name', accessor: 'action' },
    { header: 'Target Entity', accessor: 'entityType' },
    { header: 'Entity ID', accessor: 'entityId' },
    { header: 'Performed By', accessor: (it: any) => it.user?.fullName || it.user?.email || 'System Operation' },
    { header: 'IP Address', accessor: 'ipAddress' },
    { header: 'Timestamp', accessor: (it: any) => it.createdAt ? new Date(it.createdAt).toLocaleString('en-IN') : '' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 uppercase tracking-widest">
              Panel 01: Audit Ledger
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
              <ShieldCheck className="h-3 w-3" />
              Cryptographically Audited
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight">
            Enterprise Immutable Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only chronological audit logging capturing actor, timestamp, client IP, old state, and mutated new state.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredLogs}
            columns={auditExportColumns}
            fileName="Melayurveda_Enterprise_Audit_Ledger"
            sheetName="Audit Trail"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Ledger
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/90 border-t-3 border-t-emerald-600 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Audit Records</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {summary?.totalLogs ?? logs.length}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Permanent immutable records in ledger</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 shadow-xs">
            <History className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 border-t-3 border-t-blue-500 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mutations Today</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {summary?.logsToday ?? 0}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Operations executed since 00:00 UTC</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-200 shadow-xs">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 border-t-3 border-t-amber-500 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Most Frequent Action</p>
            <h4 className="text-lg font-black text-slate-900 mt-1 font-mono truncate max-w-[180px]">
              {summary?.topActions?.[0]?.action || 'LEAD_ASSIGN'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {summary?.topActions?.[0]?.count || 0} occurrences cataloged
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 shadow-xs">
            <FileCode className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Action Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200/80">
        {[
          { key: 'ALL', label: 'All Operations' },
          { key: 'LEAD', label: 'Lead Lifecycle' },
          { key: 'CALL', label: 'Calling Logs' },
          { key: 'REVIEW', label: 'Formulation Reviews' },
          { key: 'APPROVAL', label: 'Approval Sign-Offs' },
          { key: 'CUSTOMER', label: 'Customer Conversions' },
          { key: 'ORDER', label: 'Orders & Inventory' },
          { key: 'INVOICE', label: 'GST Invoicing' },
        ].map((tab) => {
          const isActive = selectedActionFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedActionFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={filteredLogs}
          searchKey="action"
          searchPlaceholder="Filter by action name (e.g. CONVERT, LEAD, CALL)..."
          isLoading={isLoading}
          emptyMessage="No audit logs found matching criteria."
          exportConfig={{
            fileName: 'Melayurveda_Enterprise_Audit_Ledger',
            sheetName: 'Audit Trail',
            columns: auditExportColumns,
          }}
        />
      </div>

      {/* Inspect Log Diff Modal */}
      <Modal
        isOpen={!!inspectLog}
        onClose={() => setInspectLog(null)}
        title={`Audit Record: ${inspectLog?.action}`}
        description={`Target Entity: ${inspectLog?.entityType} (${inspectLog?.entityId}) at ${inspectLog ? new Date(inspectLog.createdAt).toLocaleString() : ''}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="font-semibold text-slate-500 block text-[11px] uppercase">Actor:</span>
              <span className="font-bold text-slate-900">
                {inspectLog?.user
                  ? `${inspectLog.user.firstName} ${inspectLog.user.lastName} (${inspectLog.user.employeeCode})`
                  : 'System Engine'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 block text-[11px] uppercase">Client IP Address:</span>
              <span className="font-mono text-slate-900 font-bold">{inspectLog?.ipAddress || '127.0.0.1'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-bold text-xs text-slate-700 block mb-1.5">
                Previous State (oldState):
              </span>
              <pre className="text-[11px] font-mono bg-slate-950 text-slate-300 p-3.5 rounded-xl overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                {inspectLog?.oldState
                  ? JSON.stringify(inspectLog.oldState, null, 2)
                  : '// No previous state recorded'}
              </pre>
            </div>

            <div>
              <span className="font-bold text-xs text-slate-700 block mb-1.5">
                New Mutated State (newState):
              </span>
              <pre className="text-[11px] font-mono bg-slate-950 text-emerald-400 p-3.5 rounded-xl overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                {inspectLog?.newState
                  ? JSON.stringify(inspectLog.newState, null, 2)
                  : '// No new state recorded'}
              </pre>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInspectLog(null)}
            >
              Close Inspector
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
