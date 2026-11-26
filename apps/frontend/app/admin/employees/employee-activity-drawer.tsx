'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '../../../components/ui/drawer';
import { Badge } from '../../../components/ui/badge';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import {
  Phone,
  Mail,
  Calendar,
  Clock,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  UserCheck,
  RefreshCw,
  Layers,
  History,
  KeyRound,
  Power,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface EmployeeActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any | null;
  onResetPassword?: (emp: any) => void;
  onToggleStatus?: (emp: any) => void;
}

export function EmployeeActivityDrawer({
  isOpen,
  onClose,
  employee,
  onResetPassword,
  onToggleStatus,
}: EmployeeActivityDrawerProps) {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'ledger' | 'audit'>('summary');

  const fetchActivity = async (empId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get(`/employees/${empId}/activity`);
      setData(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && employee?.id) {
      fetchActivity(employee.id);
      setActiveTab('summary');
    } else {
      setData(null);
    }
  }, [isOpen, employee?.id]);

  if (!employee) return null;

  const emp = data?.employee || employee;
  const summary = data?.summary || {};
  const breakdowns = data?.breakdowns || {};
  const recentWorkItems = data?.recentWorkItems || {};
  const auditTrail = data?.auditTrail || [];

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width="3xl"
      title="Staff Performance Dossier & Work Activity"
      subtitle={`Comprehensive operational audit & output tracking for ${emp.firstName} ${emp.lastName}`}
    >
      <div className="space-y-6 pb-8">
        {/* Profile Card Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 via-white to-emerald-50/30 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-white font-black text-xl shadow-md border-2 border-emerald-700">
                {emp.firstName?.[0]}
                {emp.lastName?.[0]}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded-md tracking-wider">
                    {emp.employeeCode}
                  </span>
                  <Badge variant="role">{emp.role}</Badge>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      emp.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}
                    />
                    {emp.isActive ? 'Active Staff' : 'Deactivated'}
                  </span>
                </div>

                <h3 className="mt-1.5 text-xl font-black text-slate-900 tracking-tight">
                  {emp.firstName} {emp.lastName}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{emp.phoneNumber || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Last Login:{' '}
                      {emp.lastLoginAt
                        ? new Date(emp.lastLoginAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Never logged in'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Admin Actions */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              {onResetPassword && (
                <button
                  onClick={() => onResetPassword(emp)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                  title="Reset Credentials"
                >
                  <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                  <span>Reset Pwd</span>
                </button>
              )}
              {onToggleStatus && (
                <button
                  onClick={() => onToggleStatus(emp)}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition ${
                    emp.isActive
                      ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title={emp.isActive ? 'Deactivate Account' : 'Activate Account'}
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{emp.isActive ? 'Suspend' : 'Activate'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading / Error Indicators */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <RefreshCw className="h-7 w-7 animate-spin text-emerald-700" />
            <p className="mt-3 text-xs font-semibold text-slate-600">
              Aggregating live performance metrics and work logs...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            <div className="flex items-center gap-2 font-bold text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span>Failed to load employee dossier</span>
            </div>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!isLoading && data && (
          <>
            {/* Role-Specific Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* SALESPERSON METRICS */}
              {(emp.role === 'SALESPERSON' || emp.role === 'SUPER_ADMIN') && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Assigned Leads
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {summary.totalAssignedLeads || 0}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {summary.conversionRate || 0}% Conv.
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {summary.convertedLeads || 0} successfully converted
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Calls Completed
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {summary.totalCalls || 0}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        avg {formatDuration(summary.avgCallDurationSeconds)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Total talk: {formatDuration(summary.totalCallDurationSeconds)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Orders Booked
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {summary.totalOrdersBooked || 0}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        Bookings
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Ayurvedic formulation kits
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Realized Revenue
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-emerald-950 font-mono">
                        {formatCurrency(summary.realizedRevenue)}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 mt-1 block">
                      Gross customer sales value
                    </span>
                  </div>
                </>
              )}

              {/* BILLING_EXECUTIVE METRICS */}
              {emp.role === 'BILLING_EXECUTIVE' && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      GST Invoices Issued
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {summary.totalInvoices || 0}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Active Bills
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      B2C statutory GST invoices
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Total Invoiced Value
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-emerald-950 font-mono">
                        {formatCurrency(summary.totalInvoicedAmount)}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 mt-1 block">
                      Gross order billing sum
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      GST Tax Realized
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {formatCurrency(summary.totalGstCollected)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      CGST + SGST + IGST liability
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Stock Operations
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {summary.inventoryActionsLogged || 0}
                      </span>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        Adjustments
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Replenishments & adjustments
                    </span>
                  </div>
                </>
              )}

              {/* APPROVAL_OFFICER METRICS */}
              {emp.role === 'APPROVAL_OFFICER' && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total Verifications
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {summary.totalApprovalsReviewed || 0}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        Reviews
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Clinical verification requests
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Orders Approved
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-emerald-950">
                        {summary.approvedCount || 0}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {summary.approvalRate || 0}%
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 mt-1 block">
                      Cleared for dispatch & billing
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Rejected Cases
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-red-700">
                        {summary.rejectedCount || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Disqualified or contra-indicated
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Sent Back to Sales
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-amber-700">
                        {summary.sentBackCount || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Clarification required on dosage
                    </span>
                  </div>
                </>
              )}

              {/* PENDING_REVIEWER METRICS */}
              {emp.role === 'PENDING_REVIEWER' && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total Leads Triaged
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {summary.totalReviewsHandled || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Evaluated intake queue
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Approved to Advance
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-emerald-950">
                        {summary.reviewApproved || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 mt-1 block">
                      Forwarded to approval desk
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Rejected Leads
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-red-700">
                        {summary.reviewRejected || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Non-viable or fake inquiries
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Sent Back
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-amber-700">
                        {summary.reviewSentBack || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Returned to sales agent
                    </span>
                  </div>
                </>
              )}

              {/* FOLLOWUP_EXECUTIVE METRICS */}
              {emp.role === 'FOLLOWUP_EXECUTIVE' && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Assigned Patients
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {summary.totalFollowupsAssigned || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Post-dispatch customer cohort
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Follow-up Calls
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-emerald-950">
                        {summary.totalFollowupCallsLogged || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 mt-1 block">
                      Patient health check-ins
                    </span>
                  </div>
                </>
              )}

              {/* MANAGEMENT METRICS */}
              {emp.role === 'MANAGEMENT' && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Orders Dispatched
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {summary.dispatchesHandled || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Handed to logistics partners
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      RTOs Handled
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {summary.returnsHandled || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Customer outreach & restock
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Segmented Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'summary'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Performance Breakdown</span>
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'ledger'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Recent Work Ledger</span>
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'audit'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Live Audit Activity ({auditTrail.length})</span>
              </button>
            </div>

            {/* TAB 1: PERFORMANCE BREAKDOWN */}
            {activeTab === 'summary' && (
              <div className="space-y-5">
                {/* SALES BREAKDOWNS */}
                {breakdowns.leadsBySource && Object.keys(breakdowns.leadsBySource).length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-700" />
                      <span>Marketing Source Inflow (Where this salesperson gets leads)</span>
                    </h4>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {Object.entries(breakdowns.leadsBySource).map(([src, count]: any) => (
                        <div
                          key={src}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/60"
                        >
                          <span className="text-xs font-medium text-slate-700">
                            {src.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {count} leads
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {breakdowns.leadsByStatus && Object.keys(breakdowns.leadsByStatus).length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-700" />
                      <span>Pipeline Funnel & Conversion Status</span>
                    </h4>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {Object.entries(breakdowns.leadsByStatus).map(([status, count]: any) => (
                        <div
                          key={status}
                          className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between"
                        >
                          <span className="text-[11px] font-semibold text-slate-600">
                            {status.replace(/_/g, ' ')}
                          </span>
                          <span className="mt-1 font-mono text-sm font-black text-slate-900">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {breakdowns.callOutcomes && Object.keys(breakdowns.callOutcomes).length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-700" />
                      <span>Calling Disposition & Outcomes</span>
                    </h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(breakdowns.callOutcomes).map(([outcome, count]: any) => (
                        <span
                          key={outcome}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700"
                        >
                          <span>{outcome.replace(/_/g, ' ')}:</span>
                          <span className="font-bold font-mono text-slate-900">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* BILLING TAX DETAILS */}
                {emp.role === 'BILLING_EXECUTIVE' && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-700" />
                      <span>GST Tax Liability Breakdown</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          Intra-state CGST (50%)
                        </span>
                        <span className="text-base font-black font-mono text-slate-900 mt-1 block">
                          {formatCurrency(summary.cgstTotal)}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          Intra-state SGST (50%)
                        </span>
                        <span className="text-base font-black font-mono text-slate-900 mt-1 block">
                          {formatCurrency(summary.sgstTotal)}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          Inter-state IGST (100%)
                        </span>
                        <span className="text-base font-black font-mono text-slate-900 mt-1 block">
                          {formatCurrency(summary.igstTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RECENT WORK LEDGER */}
            {activeTab === 'ledger' && (
              <div className="space-y-6">
                {/* Recent Leads */}
                {recentWorkItems.leads && recentWorkItems.leads.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Recent Leads Assigned (Last 10)</span>
                    </h4>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      {recentWorkItems.leads.map((lead: any) => (
                        <div
                          key={lead.id}
                          className="p-3 hover:bg-slate-50/60 transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                {lead.leadCode}
                              </span>
                              <span className="font-bold text-slate-900">{lead.customerName}</span>
                              <span className="text-slate-400 font-mono">({lead.phoneNumber})</span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-0.5 block">
                              Interest: {lead.productInterest || 'General Consultation'} • Source:{' '}
                              {lead.sourceType}
                            </span>
                          </div>
                          <Badge variant="leadStatus">{lead.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Calls */}
                {recentWorkItems.calls && recentWorkItems.calls.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Recent Telephonic Consultations (Last 10)</span>
                    </h4>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      {recentWorkItems.calls.map((call: any) => (
                        <div
                          key={call.id}
                          className="p-3 hover:bg-slate-50/60 transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {call.lead?.customerName || 'Customer'}
                              </span>
                              <span className="text-slate-400 font-mono">
                                ({call.lead?.phoneNumber})
                              </span>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                {formatDuration(call.durationSeconds)}
                              </span>
                            </div>
                            {call.notes && (
                              <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-1">
                                "{call.notes}"
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-slate-900 block">
                              {call.callOutcome}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(call.calledAt).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Invoices (For Billing) */}
                {recentWorkItems.invoices && recentWorkItems.invoices.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-emerald-700" />
                      <span>GST Tax Invoices Issued (Last 10)</span>
                    </h4>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      {recentWorkItems.invoices.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="p-3 hover:bg-slate-50/60 transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                {inv.invoiceNumber}
                              </span>
                              <span className="font-bold text-slate-900">
                                {inv.order?.customer?.fullName || 'Customer'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-0.5 block">
                              Order: {inv.order?.orderNumber} • Tax: {formatCurrency(inv.totalTax)}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-slate-900 block">
                              {formatCurrency(inv.grandTotal)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(inv.issuedAt).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State for Ledger */}
                {Object.values(recentWorkItems).every((arr: any) => !arr || arr.length === 0) && (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No output records logged yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Completed tasks, converted leads, and invoices will appear in this ledger.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SYSTEM AUDIT FEED */}
            {activeTab === 'audit' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <History className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Immutable System Audit Trail (Last 30 Events)</span>
                </h4>

                {auditTrail.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <History className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No audit events recorded yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    {auditTrail.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-3 hover:bg-slate-50/60 transition flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                            <Activity className="h-3.5 w-3.5 text-slate-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                {log.action}
                              </span>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {log.entityType}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                              Entity ID: {log.entityId}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-slate-600 font-mono block">
                            {new Date(log.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                            })}
                          </span>
                          {log.ipAddress && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              IP: {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
