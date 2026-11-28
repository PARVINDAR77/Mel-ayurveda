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
  Clock,
  Send,
  Users,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Flame,
  PhoneForwarded,
  Truck,
  ExternalLink,
  Package,
} from 'lucide-react';

export default function SalesDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const DAILY_CALL_QUOTA = 30;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [analyticsRes, leadsRes, dispatchRes] = await Promise.all([
        apiClient.get('/analytics/dashboard/sales'),
        apiClient.get('/leads?limit=10'),
        apiClient.get('/dispatch?limit=5').catch(() => ({ data: { data: [] } })),
      ]);

      setData(analyticsRes.data);
      setLeads(leadsRes.data?.data || []);
      setDispatches(dispatchRes.data?.data || dispatchRes.data || []);
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

      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
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

      {/* Main Section: Pipeline Breakdown (25%) & Priority Call Queue (75%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column: My Pipeline Stages (3 cols = 25%) */}
        <Card className="xl:col-span-3 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900">My Lead Pipeline</CardTitle>
                <Link href="/sales/leads" className="text-xs text-emerald-800 font-bold hover:underline">
                  View All
                </Link>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Live lifecycle stage breakdown of your assigned customer leads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              <Link
                href="/sales/leads?status=NEW_LEAD"
                className="flex items-center justify-between py-2 px-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 transition text-xs group"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  <span className="font-semibold text-slate-700 group-hover:text-slate-900">Fresh / Uncontacted</span>
                </div>
                <Badge variant="info">{data?.pipeline?.newLeads ?? 0}</Badge>
              </Link>

              <Link
                href="/sales/leads?status=CONTACTED"
                className="flex items-center justify-between py-2 px-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 transition text-xs group"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span className="font-semibold text-slate-700 group-hover:text-slate-900">Contacted / In Discussion</span>
                </div>
                <Badge variant="slate">{data?.pipeline?.contactedLeads ?? 0}</Badge>
              </Link>

              <Link
                href="/sales/leads?status=FOLLOW_UP"
                className="flex items-center justify-between py-2 px-2.5 rounded-xl border border-amber-100 bg-amber-50/30 hover:bg-amber-50 hover:border-amber-200 transition text-xs group"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="font-semibold text-slate-700 group-hover:text-slate-900">Follow-Up Required</span>
                </div>
                <Badge variant="warning">{data?.pipeline?.followUpRequiredLeads ?? 0}</Badge>
              </Link>

              <Link
                href="/sales/leads?status=PENDING_REVIEW"
                className="flex items-center justify-between py-2 px-2.5 rounded-xl border border-purple-100 bg-purple-50/30 hover:bg-purple-50 hover:border-purple-200 transition text-xs group"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="font-semibold text-slate-700 group-hover:text-slate-900">Submitted to Product Review</span>
                </div>
                <Badge variant="warning">{data?.pipeline?.pendingReviewLeads ?? 0}</Badge>
              </Link>

              <Link
                href="/sales/leads?status=APPROVED"
                className="flex items-center justify-between py-2 px-2.5 rounded-xl border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-200 transition text-xs group"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-700 group-hover:text-slate-900">Approved for Order</span>
                </div>
                <Badge variant="success">{data?.pipeline?.approvedLeads ?? 0}</Badge>
              </Link>

              <Link
                href="/sales/leads?status=CONVERTED"
                className="flex items-center justify-between py-2 px-2.5 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-100/50 hover:border-amber-200 transition text-xs group"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-600" />
                  <span className="font-semibold text-slate-700 group-hover:text-slate-900">Converted Customers</span>
                </div>
                <Badge variant="success">{data?.pipeline?.convertedLeads ?? 0}</Badge>
              </Link>
            </CardContent>
          </div>

          <div className="p-4 pt-0">
            <Link href="/sales/calling" className="block w-full">
              <Button
                variant="primary"
                size="sm"
                icon={<PhoneCall className="h-3.5 w-3.5" />}
                className="w-full justify-center bg-[#0f3822] hover:bg-[#154d2f] text-white shadow-xs font-semibold py-2"
              >
                Start Calling Desk
              </Button>
            </Link>
          </div>
        </Card>

        {/* Right Column: Priority Calling Queue Table (9 cols = 75%) */}
        <Card className="xl:col-span-9">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Priority Calling Queue</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Urgent and high-priority assigned customer inquiries requiring product consultation
                </CardDescription>
              </div>
              <Link href="/sales/calling">
                <Button variant="outline" size="sm" icon={<PhoneForwarded className="h-3.5 w-3.5" />}>
                  Open Calling Drawer
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-3 whitespace-nowrap">Lead Code</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Customer Name</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Phone</th>
                    <th className="px-3.5 py-3">Medicine / Product Interest</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Priority</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Status</th>
                    <th className="px-3.5 py-3 text-right whitespace-nowrap">Action</th>
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
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {lead.leadCode}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                          {lead.customerName}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                          {lead.phoneNumber}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">
                          {lead.productInterest || 'General Consultation'}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <Badge variant="priority">{lead.priority}</Badge>
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <Badge variant="leadStatus">{lead.status}</Badge>
                        </td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/sales/calling?leadId=${lead.id}`}>
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<PhoneCall className="h-3 w-3" />}
                                className="bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] px-2.5 py-1 h-7 shadow-xs font-semibold whitespace-nowrap"
                              >
                                Call Client
                              </Button>
                            </Link>
                            <Link href="/sales/leads">
                              <Button variant="outline" size="sm" className="text-[11px] px-2 py-1 h-7 whitespace-nowrap">
                                View
                              </Button>
                            </Link>
                          </div>
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

      {/* Full-Width Dispatched Orders & Consignments (100% width, no right-side gap) */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-700" />
                <span>Recent Dispatched Consignments & Tracking</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Real-time physical dispatches handed over to courier partners for your booked customer orders.
              </CardDescription>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs self-start sm:self-auto">
              Live Courier Sync
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">AWB Tracking #</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Order Reference</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Patient / Client</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Courier Network</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Transit Status</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Dispatched Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dispatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No recent dispatched consignments found.
                    </td>
                  </tr>
                ) : (
                  dispatches.map((shipment: any) => (
                    <tr key={shipment.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                          {shipment.trackingAwb}
                        </span>
                        {shipment.trackingUrl && (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1.5 text-emerald-700 hover:text-emerald-900 inline-block align-middle"
                            title="Track with Courier"
                          >
                            <ExternalLink className="h-3 w-3 inline" />
                          </a>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {shipment.order?.orderNumber || 'MEL-ORD-N/A'}
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                        {shipment.order?.customer?.fullName || 'Patient'}
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                        {shipment.courierPartner}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <Badge variant={shipment.status === 'DELIVERED' ? 'success' : 'priority'}>
                          {shipment.status}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(shipment.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
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
  );
}
