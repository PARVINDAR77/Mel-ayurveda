'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import {
  History,
  RefreshCw,
  Eye,
  ShieldAlert,
  Calendar,
  AlertCircle,
  FileCode,
} from 'lucide-react';

export default function AuditAdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // JSON Diff Modal
  const [inspectLog, setInspectLog] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [logsRes, summaryRes] = await Promise.all([
        apiClient.get('/audit/logs?limit=50'),
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

  const columns: Column<any>[] = [
    {
      key: 'action',
      header: 'Audit Action',
      render: (item) => (
        <span className="font-mono font-bold text-xs text-forest-900 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
          {item.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Target Entity',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900 text-xs">{item.entityType}</span>
          <span className="block font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
            {item.entityId}
          </span>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Actor / User',
      render: (item) => (
        <div>
          <span className="font-medium text-slate-900 text-xs">
            {item.user ? `${item.user.firstName} ${item.user.lastName}` : 'System Engine'}
          </span>
          {item.user && (
            <span className="block font-mono text-[10px] text-slate-500">
              {item.user.employeeCode} ({item.user.role})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP & Client',
      render: (item) => (
        <span className="font-mono text-xs text-slate-500">
          {item.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (item) => (
        <div className="text-xs text-slate-600">
          <div>{new Date(item.createdAt).toLocaleDateString()}</div>
          <div className="text-[10px] text-slate-400 font-mono">
            {new Date(item.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Details',
      className: 'text-right',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInspectLog(item)}
          icon={<Eye className="h-3 w-3" />}
        >
          Inspect Diff
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="gold">Compliance & Audit</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Enterprise Immutable Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Append-only chronological audit logging capturing actor, timestamp, IP, old state, and new state.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Logs
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Total Audit Logs</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">
              {summary?.totalLogs ?? logs.length}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Permanent immutable records</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-forest-50 text-forest-800 flex items-center justify-center border border-forest-200">
            <History className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Actions Logged Today</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">
              {summary?.logsToday ?? 0}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">System operations since 00:00</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-200">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Top System Action</p>
            <h4 className="text-lg font-bold text-slate-900 mt-1 font-mono">
              {summary?.topActions?.[0]?.action || 'LEAD_ASSIGN'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {summary?.topActions?.[0]?.count || 0} occurrences
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
            <FileCode className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <DataTable
        columns={columns}
        data={logs}
        searchKey="action"
        searchPlaceholder="Filter by action name..."
        isLoading={isLoading}
        emptyMessage="No audit logs recorded yet."
      />

      {/* Inspect Log Diff Modal */}
      <Modal
        isOpen={!!inspectLog}
        onClose={() => setInspectLog(null)}
        title={`Audit Record: ${inspectLog?.action}`}
        description={`Target Entity: ${inspectLog?.entityType} (${inspectLog?.entityId}) at ${inspectLog ? new Date(inspectLog.createdAt).toLocaleString() : ''}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-500 block">Actor:</span>
              <span className="font-medium text-slate-900">
                {inspectLog?.user
                  ? `${inspectLog.user.firstName} ${inspectLog.user.lastName} (${inspectLog.user.employeeCode})`
                  : 'System Engine'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 block">IP Address:</span>
              <span className="font-mono text-slate-900">{inspectLog?.ipAddress || '127.0.0.1'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-bold text-xs text-slate-700 block mb-1">
                Previous State (oldState):
              </span>
              <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto max-h-60 border border-slate-800">
                {inspectLog?.oldState
                  ? JSON.stringify(inspectLog.oldState, null, 2)
                  : '// No previous state recorded'}
              </pre>
            </div>

            <div>
              <span className="font-bold text-xs text-emerald-700 block mb-1">
                Updated State (newState):
              </span>
              <pre className="text-[11px] font-mono bg-slate-900 text-emerald-300 p-3 rounded-lg overflow-x-auto max-h-60 border border-slate-800">
                {inspectLog?.newState
                  ? JSON.stringify(inspectLog.newState, null, 2)
                  : '// No new state recorded'}
              </pre>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectLog(null)}
            >
              Close Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
