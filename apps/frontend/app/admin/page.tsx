'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { StatCard } from '../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
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
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-forest-800 uppercase tracking-widest">
              MEL-ADM-001
            </span>
            <Badge variant="gold">Super Admin Panel</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Master Executive Overview
          </h2>
          <p className="text-xs text-slate-500">
            Real-time multi-source lead operations, tele-sales team metrics, and commercial revenue.
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
            Refresh Data
          </Button>
          <Link href="/admin/assignments">
            <Button
              variant="primary"
              size="sm"
              icon={<UserCheck className="h-3.5 w-3.5" />}
            >
              Distribute Leads
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Ingested Leads"
          value={data?.overview?.totalLeads ?? (isLoading ? '...' : 0)}
          subtitle={`${data?.overview?.leadsThisMonth ?? 0} ingested this month`}
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
            label: 'conversion',
          }}
        />

        <StatCard
          title="In Clinical Triage"
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
          subtitle={`${data?.overview?.totalOrders ?? 0} orders confirmed`}
          icon={Package}
          colorTheme="gold"
        />
      </div>

      {/* Main Grid: Source Distribution & Sales Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lead Sources Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lead Source Distribution</CardTitle>
              <Link href="/admin/sources" className="text-xs text-forest-800 font-semibold hover:underline">
                View All
              </Link>
            </div>
            <CardDescription>
              Channel breakdown & attribution ROI (Admin exclusive)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading sources...</div>
            ) : !data?.sourceDistribution || data.sourceDistribution.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No lead sources registered</div>
            ) : (
              data.sourceDistribution.map((src: any) => (
                <div key={src.sourceId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{src.sourceName}</span>
                    <span className="font-mono text-slate-500">
                      {src.leadsCount} leads ({src.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-forest-700 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, src.percentage))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Column: Tele-sales Team Performance Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tele-Sales Team Performance</CardTitle>
                <CardDescription>
                  Assigned workloads, calling velocity, and customer conversion rates
                </CardDescription>
              </div>
              <Link href="/admin/employees" className="text-xs text-forest-800 font-semibold hover:underline">
                Manage Reps
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3">Code</th>
                    <th className="px-3 py-3">Sales Consultant</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Leads</th>
                    <th className="px-3 py-3 text-right">Calls Logged</th>
                    <th className="px-3 py-3 text-right">Conversions</th>
                    <th className="px-3 py-3 text-right">Closing Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Loading team performance...
                      </td>
                    </tr>
                  ) : !data?.salesTeamPerformance || data.salesTeamPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No sales consultants registered
                      </td>
                    </tr>
                  ) : (
                    data.salesTeamPerformance.map((rep: any) => (
                      <tr key={rep.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {rep.employeeCode}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">{rep.name}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={rep.isActive ? 'success' : 'slate'} className="text-[10px]">
                            {rep.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium">{rep.assignedLeads}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{rep.callsLogged}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                          {rep.conversions}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          {rep.conversionRate}%
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

      {/* Recent System Activity Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent System Activity Trail</CardTitle>
              <CardDescription>
                Chronological real-time immutable audit actions from all panels
              </CardDescription>
            </div>
            <Link href="/admin/audit" className="text-xs text-forest-800 font-semibold hover:underline">
              Full Audit Trail
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading audit feed...</div>
          ) : !data?.recentActivityFeed || data.recentActivityFeed.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No recent activity recorded</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentActivityFeed.map((act: any) => (
                <div key={act.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                      {act.action}
                    </span>
                    <span className="text-slate-700">
                      Entity: <span className="font-semibold">{act.entityType}</span> ({act.entityId.slice(0, 8)}...)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="font-medium text-slate-700">{act.actor}</span>
                    <span>{new Date(act.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
