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
  Share2,
  Globe,
  MessageCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function LeadSourcesAdminPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyWebhookUrl = (sourceId: string) => {
    const url = `http://localhost:4100/api/v1/leads/ingest/webhook?sourceId=${sourceId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(sourceId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSourceBadge = (type: string) => {
    switch (type) {
      case 'FACEBOOK_ADS':
      case 'INSTAGRAM_ADS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <Share2 className="h-3 w-3" /> Meta Ads
          </span>
        );
      case 'GOOGLE_ADS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <Globe className="h-3 w-3" /> Google Ads
          </span>
        );
      case 'WHATSAPP_BUSINESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <MessageCircle className="h-3 w-3" /> WhatsApp Business
          </span>
        );
      case 'MANUAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            <Plus className="h-3 w-3" /> Direct Manual
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-700 border border-slate-200">
            <Radio className="h-3 w-3" /> {type.replace('_', ' ')}
          </span>
        );
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Marketing Channel & Campaign',
      render: (item) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{item.name}</span>
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
            {item.description || 'Configured acquisition channel for Ayurvedic medicine inquiries'}
          </p>
        </div>
      ),
    },
    {
      key: 'sourceType',
      header: 'Platform Type',
      render: (item) => getSourceBadge(item.sourceType),
    },
    {
      key: 'leadsCount',
      header: 'Volume Ingested',
      render: (item) => (
        <span className="font-mono font-bold text-xs text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          {item._count?.leads ?? 0} leads
        </span>
      ),
    },
    {
      key: 'webhook',
      header: 'Webhook Ingestion Endpoint',
      render: (item) => (
        <div className="flex items-center gap-2">
          <code className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 truncate max-w-[200px]">
            /api/v1/leads/ingest?sourceId={item.id.slice(0, 8)}...
          </code>
          <button
            onClick={() => copyWebhookUrl(item.id)}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition shadow-2xs"
            title="Copy Full Webhook URL"
          >
            {copiedId === item.id ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-500" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            item.isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created On',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Calendar className="h-3 w-3 text-slate-400" />
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
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
              Panel 01: Marketing Attribution
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight">
            Marketing Channels & Lead Attribution
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ad channel management, webhook endpoints, and proprietary attribution analytics (Strictly Hidden from Tele-Sales).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
          >
            + Register Ad Source
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/90 border-t-3 border-t-emerald-600 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Ingestion Pipelines</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {analytics?.totalSources ?? sources.length}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Configured ad webhooks & portals</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 shadow-xs">
            <Radio className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 border-t-3 border-t-blue-500 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Leads Ingested</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {analytics?.totalLeadsAcrossSources ?? sources.reduce((acc, s) => acc + (s._count?.leads || 0), 0)}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Across all marketing channels</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-200 shadow-xs">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 border-t-3 border-t-amber-500 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Primary Channel</p>
            <h4 className="text-xl font-black text-slate-900 mt-1 truncate max-w-[180px]">
              {analytics?.topSource?.name || 'Meta Ads'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {analytics?.topSource?.leadsCount || 0} leads attributed
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 shadow-xs">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Sources Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={sources}
          searchKey="name"
          searchPlaceholder="Search lead channels..."
          isLoading={isLoading}
          emptyMessage="No lead sources registered"
        />
      </div>

      {/* Add Source Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Marketing Ad Channel"
        description="Connect a digital advertising channel or webhook to ingest customer medicine inquiries."
      >
        <form onSubmit={handleCreateSource} className="space-y-4">
          <Input
            label="Channel / Campaign Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Meta Joint Care Video Campaign"
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Channel Platform Type
            </label>
            <select
              value={formData.sourceType}
              onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="FACEBOOK_ADS">Meta / Facebook Ads</option>
              <option value="INSTAGRAM_ADS">Instagram Ads</option>
              <option value="GOOGLE_ADS">Google Search & YouTube Ads</option>
              <option value="WEBSITE">Melayurveda Direct Web Portal</option>
              <option value="WHATSAPP_BUSINESS">WhatsApp Business API Webhook</option>
              <option value="MANUAL">Direct Manual Super Admin Intake</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Campaign Description / Notes
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Gujarat targeted Hindi campaign for 60-day artho-care medicine package."
              rows={2}
              className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
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
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
            >
              Register Channel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
