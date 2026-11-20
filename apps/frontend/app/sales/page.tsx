'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { StatCard } from '../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  PhoneCall,
  CalendarClock,
  Send,
  Users,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Flame,
  PhoneForwarded,
} from 'lucide-react';

export default function SalesDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const DAILY_CALL_QUOTA = 30;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [analyticsRes, leadsRes] = await Promise.all([
        apiClient.get('/analytics/dashboard/sales'),
        apiClient.get('/leads?limit=5'),
      ]);

      setData(analyticsRes.data);
      setLeads(leadsRes.data?.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const callsToday = data?.todayActivity?.callsLoggedToday ?? 0;
  const quotaPercent = Math.min(100, Math.round((callsToday / DAILY_CALL_QUOTA) * 100));

  return (
    <div className="space-y-6">
      {/* Top Banner / Calling Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-sky-800 uppercase tracking-widest">
              {data?.salesperson?.employeeCode || 'MEL-SAL-XXX'}
            </span>
            <Badge variant="role">Sales Consultant</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Consultant Calling Dashboard
          </h2>
          <p className="text-xs text-slate-500">
            Assigned customer inquiries, daily calling targets, and scheduled product follow-ups.
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
          <Link href="/sales/calling">
            <Button
              variant="primary"
              size="sm"
              icon={<PhoneCall className="h-3.5 w-3.5" />}
            >
              Start Calling Queue
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

      {/* Daily Calling Target Quota Card */}
      <div className="rounded-2xl border border-forest-200 bg-gradient-to-r from-forest-900 to-forest-800 p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Daily Consultation Quota
              </span>
            </div>
            <h3 className="text-xl font-bold text-white">
              {callsToday} / {DAILY_CALL_QUOTA} Consultations Completed Today
            </h3>
            <p className="text-xs text-slate-300">
              {callsToday >= DAILY_CALL_QUOTA
                ? 'Target achieved! Outstanding consistency.'
                : `${DAILY_CALL_QUOTA - callsToday} calls remaining to meet your daily target.`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-3xl font-black text-amber-400">{quotaPercent}%</span>
              <span className="block text-[10px] uppercase font-bold text-slate-300">Target Progress</span>
            </div>
          </div>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-forest-950/60 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500 shadow-sm"
            style={{ width: `${quotaPercent}%` }}
          />
        </div>
      </div>

      {/* StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Leads"
          value={data?.pipeline?.totalAssigned ?? 0}
          subtitle={`${data?.pipeline?.newLeads ?? 0} uncontacted leads`}
          icon={Users}
          colorTheme="forest"
        />

        <StatCard
          title="Consultations Logged"
          value={data?.todayActivity?.callsLoggedToday ?? 0}
          subtitle={`${data?.performance?.totalCallsLogged ?? 0} lifetime calls`}
          icon={PhoneCall}
          colorTheme="blue"
        />

        <StatCard
          title="Follow-ups Agenda"
          value={data?.todayActivity?.pendingFollowUpsToday ?? 0}
          subtitle={
            data?.todayActivity?.overdueFollowUps > 0
              ? `${data?.todayActivity?.overdueFollowUps} overdue calls!`
              : 'All follow-ups on schedule'
          }
          icon={CalendarClock}
          colorTheme={data?.todayActivity?.overdueFollowUps > 0 ? 'amber' : 'emerald'}
        />

        <StatCard
          title="Closing Conversion"
          value={`${data?.pipeline?.conversionRate ?? 0}%`}
          subtitle={`${data?.pipeline?.convertedLeads ?? 0} customers converted`}
          icon={TrendingUp}
          colorTheme="gold"
        />
      </div>

      {/* Main Grid: Pipeline Breakdown & Priority Call Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Pipeline Stages */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Lead Pipeline</CardTitle>
              <Link href="/sales/leads" className="text-xs text-forest-800 font-semibold hover:underline">
                View All
              </Link>
            </div>
            <CardDescription>Status breakdown of your assigned customer leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
              <span className="font-medium text-slate-700">Fresh / Uncontacted</span>
              <Badge variant="info">{data?.pipeline?.newLeads ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
              <span className="font-medium text-slate-700">Contacted / In Discussion</span>
              <Badge variant="slate">{data?.pipeline?.contactedLeads ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
              <span className="font-medium text-slate-700">Follow-Up Required</span>
              <Badge variant="warning">{data?.pipeline?.followUpRequiredLeads ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
              <span className="font-medium text-slate-700">Submitted to Product Review</span>
              <Badge variant="warning">{data?.pipeline?.pendingReviewLeads ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
              <span className="font-medium text-slate-700">Approved for Order</span>
              <Badge variant="success">{data?.pipeline?.approvedLeads ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between py-1.5 text-xs">
              <span className="font-medium text-slate-700">Converted Customers</span>
              <Badge variant="success">{data?.pipeline?.convertedLeads ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Priority Calling Queue Table (100% ZERO SOURCE PRIVACY) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Priority Calling Queue</CardTitle>
                <CardDescription>
                  Urgent and high-priority assigned customer inquiries requiring product consultation
                </CardDescription>
              </div>
              <Link href="/sales/calling">
                <Button variant="primary" size="sm" icon={<PhoneForwarded className="h-3.5 w-3.5" />}>
                  Open Calling Drawer
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
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Medicine / Product Interest</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Loading assigned leads...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No assigned leads in your queue.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {lead.leadCode}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">
                          {lead.customerName}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">
                          {lead.phoneNumber}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {lead.productInterest || 'General Consultation'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="priority">{lead.priority}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="leadStatus">{lead.status}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link href={`/sales/calling?leadId=${lead.id}`}>
                            <Button variant="outline" size="sm" icon={<PhoneCall className="h-3 w-3" />}>
                              Call
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
