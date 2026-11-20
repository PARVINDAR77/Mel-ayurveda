'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import {
  Radio,
  Plus,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Layers,
  Calendar,
} from 'lucide-react';

export default function LeadSourcesAdminPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add Source Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sourceType: 'FACEBOOK_ADS',
    description: '',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [sourcesRes, summaryRes] = await Promise.all([
        apiClient.get('/lead-sources'),
        apiClient.get('/lead-sources/analytics/summary'),
      ]);

      setSources(sourcesRes.data || []);
      setAnalytics(summaryRes.data || null);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await apiClient.post('/lead-sources', formData);
      setSuccessMsg(`Lead Source "${formData.name}" created successfully.`);
      setIsAddModalOpen(false);
      setFormData({ name: '', sourceType: 'FACEBOOK_ADS', description: '' });
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Source Channel Name',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.name}</span>
          {item.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'sourceType',
      header: 'Channel Type',
      render: (item) => <Badge variant="slate">{item.sourceType.replace('_', ' ')}</Badge>,
    },
    {
      key: 'leadsCount',
      header: 'Leads Ingested',
      render: (item) => (
        <span className="font-mono font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
          {item._count?.leads ?? 0} leads
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Ingestion Status',
      render: (item) => (
        <Badge variant={item.isActive ? 'success' : 'slate'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Registered On',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="h-3 w-3 text-slate-400" />
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Marketing Channels & Lead Sources
          </h2>
          <p className="text-xs text-slate-500">
            Ad channel management, webhook endpoints, and lead attribution intelligence (Admin Only).
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
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Lead Source
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

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Active Ad Channels</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">
              {analytics?.totalSources ?? sources.length}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Configured ingestion pipelines</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-forest-50 text-forest-800 flex items-center justify-center border border-forest-200">
            <Radio className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Total Leads Ingested</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">
              {analytics?.totalLeadsAcrossSources ?? sources.reduce((acc, s) => acc + (s._count?.leads || 0), 0)}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Across all marketing sources</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Top Performing Channel</p>
            <h4 className="text-lg font-bold text-slate-900 mt-1 truncate max-w-[180px]">
              {analytics?.topSource?.name || 'Meta Ads'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {analytics?.topSource?.leadsCount || 0} leads attributed
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Sources Table */}
      <DataTable
        columns={columns}
        data={sources}
        searchKey="name"
        searchPlaceholder="Search lead channels..."
        isLoading={isLoading}
        emptyMessage="No lead sources registered"
      />

      {/* Add Source Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Marketing Channel"
        description="Connect a marketing ad platform or campaign to ingest patient leads."
      >
        <form onSubmit={handleCreateSource} className="space-y-4">
          <Input
            label="Channel / Campaign Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. YouTube Pain Relief Campaign"
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Channel Type
            </label>
            <select
              value={formData.sourceType}
              onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
            >
              <option value="FACEBOOK_ADS">Facebook Ads</option>
              <option value="INSTAGRAM_ADS">Instagram Ads</option>
              <option value="GOOGLE_ADS">Google Ads</option>
              <option value="WEBSITE">Website Form / SEO</option>
              <option value="WHATSAPP">WhatsApp Inbound</option>
              <option value="MANUAL">Manual Ingestion</option>
              <option value="OTHER">Other Campaign</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Campaign Notes & Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Target keywords, ad set IDs, or UTM parameters..."
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Register Lead Source
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
