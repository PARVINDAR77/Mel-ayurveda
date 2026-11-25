'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { Drawer } from '../../../components/ui/drawer';
import { StatCard } from '../../../components/ui/stat-card';
import {
  Trash2,
  RefreshCw,
  Search,
  RotateCcw,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Archive,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  User,
  Package,
  Layers,
  FileText,
} from 'lucide-react';

export default function RecycleBinVaultPage() {
  const [items, setItems] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Snapshot Inspection Drawer
  const [inspectItem, setInspectItem] = useState<any | null>(null);

  // Restore Modal State
  const [restoreItem, setRestoreItem] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Permanent Purge Modal State
  const [purgeItem, setPurgeItem] = useState<any | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  // Purge All Expired State
  const [isPurgingExpired, setIsPurgingExpired] = useState(false);
  const [isPurgeExpiredModalOpen, setIsPurgeExpiredModalOpen] = useState(false);

  const fetchVaultData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', '50');
      if (selectedType && selectedType !== 'ALL') {
        params.append('entityType', selectedType);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const [listRes, metricsRes] = await Promise.all([
        apiClient.get(`/recycle-bin?${params.toString()}`),
        apiClient.get('/recycle-bin/metrics'),
      ]);

      setItems(listRes.data?.data || []);
      setMetrics(metricsRes.data || null);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultData();
  }, [selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVaultData();
  };

  const handleRestoreSubmit = async () => {
    if (!restoreItem) return;

    try {
      setIsRestoring(true);
      setError(null);

      const res = await apiClient.post(`/recycle-bin/${restoreItem.id}/restore`);
      setSuccessMsg(res.data?.message || `Successfully restored ${restoreItem.displayName} to active system.`);
      setRestoreItem(null);
      if (inspectItem?.id === restoreItem.id) setInspectItem(null);
      fetchVaultData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePermanentPurgeSubmit = async () => {
    if (!purgeItem) return;

    try {
      setIsPurging(true);
      setError(null);

      const res = await apiClient.delete(`/recycle-bin/${purgeItem.id}/purge`);
      setSuccessMsg(res.data?.message || `Permanently purged ${purgeItem.displayName} from vault.`);
      setPurgeItem(null);
      if (inspectItem?.id === purgeItem.id) setInspectItem(null);
      fetchVaultData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsPurging(false);
    }
  };

  const handlePurgeExpiredRecords = async () => {
    try {
      setIsPurgingExpired(true);
      setError(null);

      const res = await apiClient.post('/recycle-bin/cron/purge-expired');
      setSuccessMsg(res.data?.message || '30-Day automated retention cleanup executed successfully.');
      setIsPurgeExpiredModalOpen(false);
      fetchVaultData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsPurgingExpired(false);
    }
  };

  const getEntityTypeBadge = (type: string) => {
    switch (type) {
      case 'EMPLOYEE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">👤 EMPLOYEE</span>;
      case 'PRODUCT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">🌿 PRODUCT</span>;
      case 'LEAD':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">📞 LEAD</span>;
      case 'ORDER':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">📦 ORDER</span>;
      default:
        return <Badge variant="slate">{type}</Badge>;
    }
  };

  const getCountdownBadge = (days: number) => {
    if (days <= 3) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
          🔴 {days} Day{days === 1 ? '' : 's'} Left (Urgent)
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          🟡 {days} Days Remaining
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        🟢 {days} Days Remaining
      </span>
    );
  };

  const columns: Column<any>[] = [
    {
      key: 'entityType',
      header: 'Entity Type',
      render: (item) => getEntityTypeBadge(item.entityType),
    },
    {
      key: 'itemIdentifier',
      header: 'Identifier & Record Details',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
            {item.itemIdentifier}
          </span>
          <div>
            <span className="font-bold text-slate-900 text-xs block leading-tight">
              {item.displayName}
            </span>
            <span className="text-[11px] text-slate-400">
              {item.category || 'Standard Record'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'deletedBy',
      header: 'Deleted By & Reason',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">
            {item.deletedByCode}
          </span>
          <span className="text-[11px] text-slate-500 line-clamp-1">
            {item.deleteReason || 'Super Admin manual deletion'}
          </span>
        </div>
      ),
    },
    {
      key: 'deletedAt',
      header: 'Deleted Date',
      render: (item) => (
        <span className="font-mono text-[11px] text-slate-600">
          {new Date(item.deletedAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'countdown',
      header: '30-Day Auto Purge Countdown',
      render: (item) => getCountdownBadge(item.daysRemaining),
    },
    {
      key: 'actions',
      header: 'Vault Operations',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setInspectItem(item)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs font-medium"
            title="Inspect Data Snapshot"
          >
            <Eye className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Inspect</span>
          </button>
          <button
            onClick={() => setRestoreItem(item)}
            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-100 transition shadow-2xs font-bold"
            title="Restore back to active database"
          >
            <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Restore</span>
          </button>
          <button
            onClick={() => setPurgeItem(item)}
            className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-800 transition shadow-2xs font-medium"
            title="Permanently Purge Immediately"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            <span className="hidden sm:inline">Purge</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 uppercase tracking-widest">
              Panel 01 • Super Admin Executive Control
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> 30-Day Auto Purge Policy Active
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Recycle Bin & Data Recovery Vault
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Safely inspect, restore, or permanently purge deleted staff, formulations, leads, and operational records. Records are retained for 30 days before automated deletion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchVaultData}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Vault
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsPurgeExpiredModalOpen(true)}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            Purge Expired (&gt;30d)
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total in Vault"
          value={metrics?.totalInVault ?? (isLoading ? '...' : 0)}
          subtitle="Protected 30-day grace period"
          icon={Archive}
          colorTheme="forest"
        />

        <StatCard
          title="Expiring in < 7 Days"
          value={metrics?.expiringSoon ?? (isLoading ? '...' : 0)}
          subtitle="Auto-purge scheduled soon"
          icon={Clock}
          colorTheme="gold"
        />

        <StatCard
          title="Restored Records"
          value={metrics?.restoredCount ?? (isLoading ? '...' : 0)}
          subtitle="Zero data loss achieved"
          icon={RotateCcw}
          colorTheme="emerald"
        />

        <StatCard
          title="Retention Policy"
          value="30 Days"
          subtitle="DPDP Act compliant auto-purge"
          icon={Calendar}
          colorTheme="blue"
        />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto">
          {[
            { id: 'ALL', label: 'ALL', count: metrics?.totalInVault },
            { id: 'EMPLOYEE', label: 'EMPLOYEES', count: metrics?.entityTypeCounts?.EMPLOYEE },
            { id: 'PRODUCT', label: 'PRODUCTS', count: metrics?.entityTypeCounts?.PRODUCT },
            { id: 'LEAD', label: 'LEADS', count: metrics?.entityTypeCounts?.LEAD },
            { id: 'ORDER', label: 'ORDERS', count: metrics?.entityTypeCounts?.ORDER },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold whitespace-nowrap transition-colors ${
                selectedType === tab.id
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedType === tab.id
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search identifier, name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        searchKey="displayName"
        searchPlaceholder="Filter listed records..."
      />

      {/* Snapshot Inspection Drawer */}
      <Drawer
        isOpen={!!inspectItem}
        onClose={() => setInspectItem(null)}
        title={`Archived Snapshot: ${inspectItem?.itemIdentifier}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Entity Type</span>
              {inspectItem && getEntityTypeBadge(inspectItem.entityType)}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Display Name</span>
              <span className="font-bold text-slate-900">{inspectItem?.displayName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Deleted By</span>
              <span className="font-mono text-slate-800">{inspectItem?.deletedByCode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Deleted Timestamp</span>
              <span className="font-mono text-slate-600">{inspectItem?.deletedAt ? new Date(inspectItem.deletedAt).toLocaleString('en-IN') : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Purge Expiration</span>
              <span className="font-mono text-slate-600">{inspectItem?.expiresAt ? new Date(inspectItem.expiresAt).toLocaleString('en-IN') : 'N/A'}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1.5">
              Original Record State (Immutable JSON Snapshot):
            </label>
            <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-80 leading-relaxed border border-slate-800">
              {JSON.stringify(inspectItem?.dataSnapshot, null, 2)}
            </pre>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setInspectItem(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setRestoreItem(inspectItem);
              }}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
            >
              Restore to Live System
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={!!restoreItem}
        onClose={() => setRestoreItem(null)}
        title="Restore Record to Live Database"
        description="This will safely recreate the record in the active database. Collision detection verifies uniqueness before inserting."
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-emerald-900">
            <p className="font-bold text-sm">
              Restore {restoreItem?.displayName} ({restoreItem?.itemIdentifier})?
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Entity: <span className="font-semibold">{restoreItem?.entityType}</span> | Deleted by: <span className="font-semibold">{restoreItem?.deletedByCode}</span>
            </p>
            <p className="mt-2 text-[11px] text-emerald-800 font-medium">
              ✅ The record will be un-archived and restored to active production status immediately.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRestoreItem(null)} disabled={isRestoring}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRestoreSubmit}
              isLoading={isRestoring}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
            >
              Confirm & Restore
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permanent Purge Confirmation Modal */}
      <Modal
        isOpen={!!purgeItem}
        onClose={() => setPurgeItem(null)}
        title="⚠️ Permanent Purge Ahead of 30 Days"
        description="Permanently delete this archived snapshot immediately. This action cannot be undone."
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-rose-900">
            <p className="font-bold text-sm">
              Permanently purge {purgeItem?.displayName} ({purgeItem?.itemIdentifier})?
            </p>
            <p className="mt-1 text-xs text-rose-700">
              This record has {purgeItem?.daysRemaining} days remaining in the vault. Bypassing the retention window will irrevocably destroy this archived snapshot.
            </p>
            <p className="mt-2 text-[11px] text-rose-800 font-bold">
              CAUTION: You will not be able to restore this data after purging.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setPurgeItem(null)} disabled={isPurging}>
              Abort
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handlePermanentPurgeSubmit}
              isLoading={isPurging}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Yes, Purge Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* Purge All Expired Records Modal */}
      <Modal
        isOpen={isPurgeExpiredModalOpen}
        onClose={() => setIsPurgeExpiredModalOpen(false)}
        title="Execute 30-Day Auto Purge"
        description="Permanently clean up records that have exceeded the 30-day retention window."
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            This will immediately trigger the automated lifecycle retention worker to wipe any snapshots where <code className="font-mono bg-slate-100 p-0.5 rounded">expiresAt &le; NOW()</code>.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsPurgeExpiredModalOpen(false)} disabled={isPurgingExpired}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handlePurgeExpiredRecords}
              isLoading={isPurgingExpired}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Run Retention Purge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
