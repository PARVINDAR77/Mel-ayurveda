'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { StatCard } from '../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  FileCheck2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Flame,
  Layers,
} from 'lucide-react';

export default function PendingReviewDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [analyticsRes, queueRes] = await Promise.all([
        apiClient.get('/analytics/dashboard/pending'),
        apiClient.get('/pending-reviews/queue?limit=5'),
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
            <span className="font-mono text-xs font-bold text-amber-800 uppercase tracking-widest">
              MEL-PND-001
            </span>
            <Badge variant="warning">Panel 03: Clinical Triage</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Pending Review Triage Dashboard
          </h2>
          <p className="text-xs text-slate-500">
            FIFO medical triage queue, reviewer claiming concurrency lock, and 4-way decision workflow.
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
          <Link href="/pending/queue">
            <Button
              variant="primary"
              size="sm"
              icon={<FileCheck2 className="h-3.5 w-3.5" />}
            >
              Open Triage Queue
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

      {/* SLA Alert Banner if Overdue Reviews Exist */}
      {data?.queue?.overdueReviewsCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-red-300 bg-red-50 p-4 shadow-sm text-red-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">
                {data.queue.overdueReviewsCount} Review{data.queue.overdueReviewsCount > 1 ? 's' : ''} Exceeding 24h SLA!
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                These patient submissions were forwarded over 24 hours ago and require immediate clinical assessment.
              </p>
            </div>
          </div>
          <Link href="/pending/queue">
            <Button variant="danger" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
              Prioritize Overdue Queue
            </Button>
          </Link>
        </div>
      )}

      {/* KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Queue Workload"
          value={data?.queue?.totalOpenWorkload ?? 0}
          subtitle={`${data?.queue?.totalPendingInQueue ?? 0} Unclaimed • ${data?.queue?.underReviewCount ?? 0} Claimed`}
          icon={FileCheck2}
          colorTheme="forest"
        />

        <StatCard
          title="Overdue Reviews (>24h)"
          value={data?.queue?.overdueReviewsCount ?? 0}
          subtitle={
            data?.queue?.overdueReviewsCount > 0
              ? 'Immediate triage required'
              : 'Zero SLA breaches'
          }
          icon={AlertTriangle}
          colorTheme={data?.queue?.overdueReviewsCount > 0 ? 'amber' : 'emerald'}
        />

        <StatCard
          title="Triage Decisions Today"
          value={data?.todayActivity?.totalDecidedToday ?? 0}
          subtitle={`${data?.todayActivity?.approvedToday ?? 0} Approved for sign-off`}
          icon={CheckCircle2}
          colorTheme="blue"
        />

        <StatCard
          title="Approval Rate Today"
          value={`${data?.todayActivity?.approvalRateToday ?? 0}%`}
          subtitle={`${data?.todayActivity?.rejectedToday ?? 0} rejected • ${data?.todayActivity?.sendBackToday ?? 0} sent back`}
          icon={Flame}
          colorTheme="gold"
        />
      </div>

      {/* Main Grid: Decisions Breakdown & Quick Triage Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Decision Distribution Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Today&apos;s Decision Breakdown</CardTitle>
            <CardDescription>Outcome distribution across 4-way decision engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-slate-800">Approved for Panel 04</span>
              </div>
              <Badge variant="success">{data?.todayActivity?.approvedToday ?? 0}</Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-semibold text-slate-800">Rejected / Ineligible</span>
              </div>
              <Badge variant="danger">{data?.todayActivity?.rejectedToday ?? 0}</Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-slate-800">Follow-Up Requested</span>
              </div>
              <Badge variant="warning">{data?.todayActivity?.followUpRequestedToday ?? 0}</Badge>
            </div>

            <div className="flex items-center justify-between py-2 text-xs">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-800">Sent Back to Sales</span>
              </div>
              <Badge variant="info">{data?.todayActivity?.sendBackToday ?? 0}</Badge>
            </div>

            {/* Urgency Distribution */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Pending Queue Urgency
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-700 font-semibold">Urgent Priority</span>
                <span className="font-mono font-bold text-red-700">
                  {data?.priorityBreakdown?.urgent ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-700 font-semibold">High Priority</span>
                <span className="font-mono font-bold text-orange-700">
                  {data?.priorityBreakdown?.high ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Normal Priority</span>
                <span className="font-mono font-bold text-slate-700">
                  {data?.priorityBreakdown?.normal ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Next in FIFO Queue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Next in FIFO Triage Queue</CardTitle>
                <CardDescription>
                  Submissions ordered chronologically by submission time
                </CardDescription>
              </div>
              <Link href="/pending/queue">
                <Button variant="primary" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Full Triage Queue
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
                    <th className="px-3 py-3">Patient Name</th>
                    <th className="px-3 py-3">Consultant Reason</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Submitted</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Loading triage queue...
                      </td>
                    </tr>
                  ) : queue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Queue is clear! All submissions reviewed.
                      </td>
                    </tr>
                  ) : (
                    queue.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {item.lead?.leadCode || item.leadId?.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">
                          {item.lead?.customerName || 'Patient'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 truncate max-w-[200px]">
                          {item.reason}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="priority">{item.lead?.priority || 'NORMAL'}</Badge>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link href="/pending/queue">
                            <Button variant="outline" size="sm">
                              Review
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
