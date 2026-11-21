'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { StatCard } from '../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
import {
  Users,
  UserCheck,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Radio,
  History,
  Plus,
  Phone,
  CheckCircle2,
  Award,
  Globe,
  Share2,
  MessageCircle,
  Clock,
  Activity,
  FileCheck2,
  Send,
  Boxes,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add Manual Lead Modal
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    customerName: '',
    phoneNumber: '',
    city: '',
    state: 'Gujarat',
    productInterest: 'Artho-Care Ayurvedic Joint Therapy',
    priority: 'NORMAL',
    notes: '',
  });

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get('/analytics/dashboard/admin');
      setData(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCreateManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingLead(true);
      setError(null);
      const res = await apiClient.post('/leads/manual', leadForm);
      setSuccessMsg(`Customer Lead ${res.data.leadCode} (${res.data.customerName}) created successfully!`);
      setIsAddLeadModalOpen(false);
      setLeadForm({
        customerName: '',
        phoneNumber: '',
        city: '',
        state: 'Gujarat',
        productInterest: 'Artho-Care Ayurvedic Joint Therapy',
        priority: 'NORMAL',
        notes: '',
      });
      fetchDashboard();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'FACEBOOK_ADS':
      case 'INSTAGRAM_ADS':
        return <Share2 className="h-4 w-4 text-blue-600" />;
      case 'GOOGLE_ADS':
        return <Globe className="h-4 w-4 text-amber-600" />;
      case 'WHATSAPP_BUSINESS':
        return <MessageCircle className="h-4 w-4 text-emerald-600" />;
      case 'MANUAL':
        return <Plus className="h-4 w-4 text-purple-600" />;
      default:
        return <Radio className="h-4 w-4 text-slate-500" />;
    }
  };

  const getActionBadgeColor = (action: string) => {
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 uppercase tracking-widest">
              MEL-ADM-001
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Executive Mission Control
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight">
            Master Executive Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-source lead operations, tele-sales team metrics, and commercial revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Sync Data
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddLeadModalOpen(true)}
            icon={<Plus className="h-3.5 w-3.5" />}
            className="bg-emerald-800 hover:bg-emerald-900 text-white"
          >
            + Add Manual Lead
          </Button>

          <Link href="/admin/assignments">
            <Button
              variant="outline"
              size="sm"
              icon={<UserCheck className="h-3.5 w-3.5 text-amber-600" />}
              className="border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900"
            >
              Distribute Leads
            </Button>
          </Link>
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

      {/* KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Ingested Leads"
          value={data?.overview?.totalLeads ?? (isLoading ? '...' : 0)}
          subtitle={`${data?.overview?.leadsThisMonth ?? 0} leads received this month`}
          icon={Users}
          colorTheme="forest"
        />

        <StatCard
          title="Converted Customers"
          value={data?.overview?.convertedLeads ?? (isLoading ? '...' : 0)}
          subtitle={`${data?.overview?.overallConversionRate ?? 0}% overall conversion rate`}
          icon={TrendingUp}
          colorTheme="emerald"
          trend={{
            value: `${data?.overview?.overallConversionRate ?? 0}%`,
            isPositive: true,
          }}
        />

        <StatCard
          title="In Product Verification"
          value={
            (data?.overview?.pendingReviewLeads ?? 0) +
            (data?.overview?.approvalRequestedLeads ?? 0)
          }
          subtitle={`${data?.overview?.pendingReviewLeads ?? 0} Pending • ${data?.overview?.approvalRequestedLeads ?? 0} Approvals`}
          icon={Layers}
          colorTheme="amber"
        />

        <StatCard
          title="Gross Order Revenue"
          value={`₹${(data?.overview?.grossSalesRevenue ?? 0).toLocaleString('en-IN')}`}
          subtitle={`${data?.overview?.totalOrders ?? 0} confirmed medicine orders`}
          icon={Package}
          colorTheme="gold"
        />
      </div>

      {/* Main Grid: Source Distribution & Sales Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lead Sources Breakdown */}
        <Card className="lg:col-span-1 rounded-2xl border-slate-200/90 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Lead Source Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Marketing channels & attribution ROI
                </CardDescription>
              </div>
              <Link href="/admin/sources" className="text-xs text-emerald-700 font-semibold hover:underline">
                Manage Sources
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5 pt-4">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading sources...</div>
            ) : !data?.sourceDistribution || data.sourceDistribution.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No lead sources registered</div>
            ) : (
              data.sourceDistribution.map((src: any) => (
                <div key={src.sourceId} className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 border border-slate-200/80">
                        {getSourceIcon(src.sourceType)}
                      </div>
                      <span className="font-semibold text-slate-800">{src.sourceName}</span>
                    </div>
                    <span className="font-mono text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {src.leadsCount} leads ({src.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(4, src.percentage))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Column: Tele-sales Team Performance Table */}
        <Card className="lg:col-span-2 rounded-2xl border-slate-200/90 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Tele-Sales Leaderboard & Velocity
                </CardTitle>
                <CardDescription className="text-xs">
                  Active workloads, calling volume, and conversion performance
                </CardDescription>
              </div>
              <Link href="/admin/employees" className="text-xs text-emerald-700 font-semibold hover:underline">
                Staff Directory
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-3">Consultant</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Leads</th>
                    <th className="px-3 py-3 text-right">Calls Made</th>
                    <th className="px-3 py-3 text-right">Conversions</th>
                    <th className="px-3 py-3 text-right">Close Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Loading team performance...
                      </td>
                    </tr>
                  ) : !data?.salesTeamPerformance || data.salesTeamPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No sales consultants registered
                      </td>
                    </tr>
                  ) : (
                    data.salesTeamPerformance.map((rep: any, idx: number) => {
                      const isTopPerformer = idx === 0 && rep.conversions > 0;
                      return (
                        <tr key={rep.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                                {rep.name ? rep.name.split(' ').map((n: string) => n[0]).join('') : 'SC'}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-900">{rep.name}</span>
                                  {isTopPerformer && (
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      <Award className="h-2.5 w-2.5" /> Top
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px] text-slate-500">{rep.employeeCode}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                rep.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${rep.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {rep.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-900">{rep.assignedLeads}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-700">{rep.callsLogged}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                            {rep.conversions}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-bold text-slate-900 font-mono">{rep.conversionRate}%</span>
                              <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-600 rounded-full"
                                  style={{ width: `${Math.min(100, rep.conversionRate * 2.5)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent System Activity Feed */}
      <Card className="rounded-2xl border-slate-200/90 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Recent System Activity Stream
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time chronological immutable audit actions across all 5 operational panels
              </CardDescription>
            </div>
            <Link href="/admin/audit" className="text-xs text-emerald-700 font-semibold hover:underline">
              Full Audit Trail ({data?.recentActivityFeed?.length || 0})
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading audit feed...</div>
          ) : !data?.recentActivityFeed || data.recentActivityFeed.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No recent activity recorded</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentActivityFeed.map((act: any) => (
                <div key={act.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-2 text-xs hover:bg-slate-50/60 px-2 rounded-lg transition">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider ${getActionBadgeColor(
                        act.action,
                      )}`}
                    >
                      {act.action}
                    </span>
                    <span className="text-slate-700">
                      Entity: <span className="font-semibold text-slate-900">{act.entityType}</span>{' '}
                      <span className="font-mono text-slate-500">({act.entityId.slice(0, 8)}...)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {act.actor}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Manual Lead Modal */}
      <Modal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        title="Create New Customer Product Lead"
        description="Manually ingest a new prospective buyer inquiry for Ayurvedic medicine products."
      >
        <form onSubmit={handleCreateManualLead} className="space-y-3.5">
          <Input
            label="Customer Full Name"
            value={leadForm.customerName}
            onChange={(e) => setLeadForm({ ...leadForm, customerName: e.target.value })}
            placeholder="e.g. Rameshchandra Dave"
            required
          />

          <Input
            label="Primary 10-Digit Mobile Number"
            value={leadForm.phoneNumber}
            onChange={(e) => setLeadForm({ ...leadForm, phoneNumber: e.target.value })}
            placeholder="98XXXXXXXX"
            leftIcon={<Phone className="h-4 w-4" />}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={leadForm.city}
              onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
              placeholder="e.g. Ahmedabad"
            />
            <Input
              label="State"
              value={leadForm.state}
              onChange={(e) => setLeadForm({ ...leadForm, state: e.target.value })}
              placeholder="e.g. Gujarat"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Interested Ayurvedic Product / Concern
            </label>
            <select
              value={leadForm.productInterest}
              onChange={(e) => setLeadForm({ ...leadForm, productInterest: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Artho-Care Ayurvedic Joint Therapy">Artho-Care Ayurvedic Joint Therapy</option>
              <option value="Pure Himalayan Shilajit & Ashwagandha Kit">Pure Himalayan Shilajit & Ashwagandha Kit</option>
              <option value="Digestive Churna & Liv-Shuddhi Kwath">Digestive Churna & Liv-Shuddhi Kwath</option>
              <option value="Skin Glow Elixir & Triphala Course">Skin Glow Elixir & Triphala Course</option>
              <option value="General Ayurvedic Health Consultation">General Ayurvedic Health Consultation</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Priority Level
            </label>
            <select
              value={leadForm.priority}
              onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="NORMAL">Normal Priority</option>
              <option value="HIGH">High Priority (Requested Callback)</option>
              <option value="URGENT">Urgent (Immediate Purchase Intent)</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Customer Inquiry Notes
            </label>
            <textarea
              value={leadForm.notes}
              onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
              placeholder="e.g. Inquiring for 60-day joint pain churna course for elderly parent."
              rows={2}
              className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddLeadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingLead}
              className="bg-emerald-800 hover:bg-emerald-900 text-white"
            >
              Create Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
