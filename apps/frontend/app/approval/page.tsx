'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { StatCard } from '../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Package,
  Layers,
  FileCheck,
} from 'lucide-react';

export default function ApprovalDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [analyticsRes, queueRes] = await Promise.all([
        apiClient.get('/analytics/dashboard/approval'),
        apiClient.get('/approvals/queue?limit=5'),
      ]);

      setData(analyticsRes.data);
      setQueue(queueRes.data?.data || queueRes.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-800 uppercase tracking-widest">
              MEL-APR-001
            </span>
            <Badge variant="role">Panel 04: Approval Authority</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Medical & Commercial Sign-Off Dashboard
          </h2>
          <p className="text-xs text-slate-500">
            Final medical authorization, formulation prescription verification, and customer conversion unlocking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Link href="/approval/queue">
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              Open Approval Queue
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Approvals"
          value={data?.queue?.totalPendingApproval ?? 0}
          subtitle="Awaiting final medical sign-off"
          icon={FileCheck}
          colorTheme="amber"
        />

        <StatCard
          title="Approved Today"
          value={data?.todayActivity?.approvedToday ?? 0}
          subtitle={`${data?.todayActivity?.approvalRate ?? 0}% sign-off rate`}
          icon={CheckCircle2}
          colorTheme="emerald"
        />

        <StatCard
          title="Sign-Off Decisions"
          value={data?.todayActivity?.totalDecidedToday ?? 0}
          subtitle={`${data?.todayActivity?.rejectedToday ?? 0} rejected • ${data?.todayActivity?.sendBackToday ?? 0} returned`}
          icon={Layers}
          colorTheme="blue"
        />

        <StatCard
          title="Approved Order Value"
          value={`₹${(data?.commercialImpact?.totalApprovedOrderValue ?? 0).toLocaleString('en-IN')}`}
          subtitle="Commercial formulation volume"
          icon={Package}
          colorTheme="gold"
        />
      </div>

      {/* Main Grid: Disease Categories & Pending Approval Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Disease Categories & Treatment Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Disease Categories</CardTitle>
            <CardDescription>
              Top requested Ayurvedic treatment indications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading categories...</div>
            ) : !data?.diseaseCategories || data.diseaseCategories.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No categories recorded</div>
            ) : (
              data.diseaseCategories.map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                    <span className="block text-[10px] text-slate-400">
                      {cat.productsCount} formulations registered
                    </span>
                  </div>
                  <Badge variant="slate" className="font-mono text-[10px]">
                    {cat.code || 'MEL'}
                  </Badge>
                </div>
              ))
            )}

            {/* Decisions Summary */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Today&apos;s Review Breakdown
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-semibold">Approved for Conversion</span>
                <span className="font-mono font-bold text-emerald-800">
                  {data?.todayActivity?.approvedToday ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-700 font-semibold">Rejected Commercials</span>
                <span className="font-mono font-bold text-red-800">
                  {data?.todayActivity?.rejectedToday ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700 font-semibold">Sent Back to Reviewer</span>
                <span className="font-mono font-bold text-blue-800">
                  {data?.todayActivity?.sendBackToday ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Pending Sign-Off Preview Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Medical Verification Queue</CardTitle>
                <CardDescription>
                  Dossiers qualified by Panel 03 awaiting final conversion unlock
                </CardDescription>
              </div>
              <Link href="/approval/queue">
                <Button variant="primary" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Full Approval Queue
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3">Lead Code</th>
                    <th className="px-3 py-3">Customer Name</th>
                    <th className="px-3 py-3">Medicine / Product Inquiry</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Forwarded</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Loading verification queue...
                      </td>
                    </tr>
                  ) : queue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Zero pending approvals! All product verification dossiers signed off.
                      </td>
                    </tr>
                  ) : (
                    queue.map((req: any) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {req.lead?.leadCode || req.leadId?.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">
                          {req.lead?.customerName || 'Customer'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {req.lead?.productInterest || 'Ayurvedic Product'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="priority">{req.lead?.priority || 'NORMAL'}</Badge>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link href="/approval/queue">
                            <Button variant="outline" size="sm">
                              Verify & Sign
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
