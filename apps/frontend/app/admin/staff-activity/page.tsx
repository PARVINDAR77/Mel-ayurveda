'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import { StaffDayDrawer } from './staff-day-drawer';
import { IncentiveRulesModal } from './incentive-rules-modal';
import {
  Calendar,
  Clock,
  PhoneCall,
  Package,
  TrendingUp,
  Users,
  Award,
  Search,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  FileText,
  HeartHandshake,
  ArrowUpRight,
  Filter,
  DollarSign,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  X,
  Stethoscope,
  Briefcase,
  Layers,
} from 'lucide-react';

export default function StaffActivityPage() {
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [mode, setMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer & Modal states
  const [drawerStaff, setDrawerStaff] = useState<any | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);

  // Fetch Activity Data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: Record<string, string> = {
        mode,
      };

      if (mode === 'daily') {
        params.date = selectedDate;
      } else {
        params.month = selectedMonth;
      }

      if (selectedRole !== 'ALL') {
        params.role = selectedRole;
      }

      const res = await apiClient.get('/analytics/staff-activity', { params });
      setData(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mode, selectedDate, selectedMonth, selectedRole]);

  // Filtering by search query
  const filteredStaff = useMemo(() => {
    if (!data?.staff) return [];
    if (!searchQuery.trim()) return data.staff;
    const q = searchQuery.toLowerCase().trim();
    return data.staff.filter(
      (s: any) =>
        s.name.toLowerCase().includes(q) ||
        s.employeeCode.toLowerCase().includes(q) ||
        (s.phoneNumber && s.phoneNumber.includes(q))
    );
  }, [data?.staff, searchQuery]);

  // Role Counts for Filter Pills
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    if (!data?.staff) return counts;
    counts.ALL = data.staff.length;
    for (const s of data.staff) {
      counts[s.role] = (counts[s.role] || 0) + 1;
    }
    return counts;
  }, [data?.staff]);

  // Currency & Duration formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SALESPERSON':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Ayurvedic Consultant
          </span>
        );
      case 'APPROVAL_OFFICER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Medical Doctor
          </span>
        );
      case 'PENDING_REVIEWER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Triage Reviewer
          </span>
        );
      case 'BILLING_EXECUTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
            Billing & GST Desk
          </span>
        );
      case 'FOLLOWUP_EXECUTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Patient Care Desk
          </span>
        );
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-900 text-amber-300 border border-amber-400/50 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Super Administrator
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700 whitespace-nowrap">
            {role.replace('_', ' ')}
          </span>
        );
    }
  };

  // Excel Columns Specification
  const exportColumns: ExcelColumnDef<any>[] = [
    { header: 'Employee Code', accessor: 'employeeCode' },
    { header: 'Staff Name', accessor: 'name' },
    { header: 'Department / Role', accessor: (item: any) => String(item.role || '').replace('_', ' ') },
    { header: 'Assigned Leads', accessor: 'leadsAssigned' },
    { header: 'Calls Logged', accessor: 'callsCount' },
    { header: 'Talk Time (Sec)', accessor: 'callDurationSeconds' },
    { header: 'Orders Booked', accessor: 'ordersCount' },
    { header: 'Realized Revenue (₹)', accessor: (item: any) => Number(item.revenueRealized || 0).toFixed(2) },
    { header: 'MTD Achieved (₹)', accessor: (item: any) => Number(item.monthlyAchieved || 0).toFixed(2) },
    { header: 'Quota Achieved %', accessor: (item: any) => `${item.monthlyQuotaPercentage || 0}%` },
    { header: 'Base Incentive (₹)', accessor: (item: any) => Number(item.baseIncentive || 0).toFixed(2) },
    { header: 'Milestone Bonus (₹)', accessor: (item: any) => Number(item.milestoneBonus || 0).toFixed(2) },
    { header: 'Volume Bonus (₹)', accessor: (item: any) => Number(item.activityBonus || 0).toFixed(2) },
    { header: 'Total Payable Incentive (₹)', accessor: (item: any) => Number(item.totalIncentive || 0).toFixed(2) },
  ];

  const summary = data?.summaryKpis || {};
  const timeframe = data?.timeframe || {};

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Header Banner & Operations Control Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Personnel Work Dossier & Analytics
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {timeframe.label || 'Live Sync'}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
              Staff Daily Activity & Performance
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Incentive Control
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Track real-time tele-sales calls, talk duration, leads assigned, orders created, and monthly quota incentives across all staff.
            </p>
          </div>

          {/* Action Tools: Mode Toggle, Date Selector, Rules & Excel Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setMode('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                  mode === 'daily'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Daily Work View
              </button>
              <button
                type="button"
                onClick={() => setMode('monthly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                  mode === 'monthly'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Monthly Incentive View
              </button>
            </div>

            {/* Date / Month Selector */}
            {mode === 'daily' ? (
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer ${
                    selectedDate === todayStr
                      ? 'bg-emerald-100 text-emerald-800 font-extrabold'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Today
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                />
              </div>
            )}

            {/* Incentive Rules Button */}
            <button
              type="button"
              onClick={() => setIsRulesModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              Incentive Rules
            </button>

            {/* Excel Export Button */}
            <ExportButton
              data={filteredStaff}
              columns={exportColumns}
              fileName={`Melayurveda_Staff_Activity_${mode === 'daily' ? selectedDate : selectedMonth}`}
              sheetName={mode === 'daily' ? 'Daily Productivity' : 'Monthly Incentives'}
              label="Export to Excel"
            />

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Active Staff */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Staff On Duty</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{summary.totalActiveStaff || 0}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {timeframe.label || 'Selected Period'}
          </p>
        </div>

        {/* Card 2: Calls Dialed */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Calls Dialed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{summary.totalCalls || 0}</span>
            <span className="text-xs font-mono font-bold text-emerald-700">
              {formatDuration(summary.totalCallDurationSeconds || 0)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total tele-sales talk time</p>
        </div>

        {/* Card 3: Orders Booked */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Orders Booked</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{summary.totalOrdersCreated || 0}</span>
            <span className="text-[11px] text-slate-500">prescriptions</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Confirmed clinical kits</p>
        </div>

        {/* Card 4: Realized Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Realized Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-emerald-800 font-mono tracking-tight block truncate">
              {formatCurrency(summary.totalRevenueRealized || 0)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Booked commercial value</p>
        </div>

        {/* Card 5: Top Performer */}
        <div className="bg-gradient-to-br from-[#071912] to-[#123828] text-white rounded-2xl p-4 shadow-sm border border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Top Performer
            </span>
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-white block truncate">
              {summary.topPerformer?.name || 'In Progress'}
            </span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {formatCurrency(summary.topPerformer?.revenue || 0)}
            </span>
          </div>
          <p className="text-[10px] text-emerald-200/70 mt-1">
            {summary.topPerformer ? `${summary.topPerformer.orders} orders closed` : 'Awaiting sales'}
          </p>
        </div>

        {/* Card 6: Incentive Pool */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/60 to-emerald-50/40 rounded-2xl border border-amber-300/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Incentive Pool
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-amber-900 font-mono tracking-tight block">
              {formatCurrency(summary.totalIncentivePool || 0)}
            </span>
          </div>
          <p className="text-[11px] text-amber-700/80 mt-1">Accrued staff commissions</p>
        </div>
      </div>

      {/* 3. Filter Bar & Search Box */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Role Filter Pills with live counts */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Roles', count: roleCounts.ALL || 0 },
            { id: 'SALESPERSON', label: 'Ayurvedic Consultants', count: roleCounts.SALESPERSON || 0 },
            { id: 'APPROVAL_OFFICER', label: 'Medical Doctors', count: roleCounts.APPROVAL_OFFICER || 0 },
            { id: 'PENDING_REVIEWER', label: 'Reviewers', count: roleCounts.PENDING_REVIEWER || 0 },
            { id: 'BILLING_EXECUTIVE', label: 'Billing & Stock', count: roleCounts.BILLING_EXECUTIVE || 0 },
            { id: 'FOLLOWUP_EXECUTIVE', label: 'Care Follow-Up', count: roleCounts.FOLLOWUP_EXECUTIVE || 0 },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRole(r.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                selectedRole === r.id
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>{r.label}</span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  selectedRole === r.id
                    ? 'bg-emerald-950 text-emerald-200'
                    : 'bg-slate-200/80 text-slate-700'
                }`}
              >
                {r.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[280px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-emerald-600 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Master Staff Performance Table Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Staff Daily Work Output & Incentive Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredStaff.length} personnel records for {timeframe.label || 'current period'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
              Mode: {mode === 'daily' ? '📅 Daily Work View' : '📈 Monthly Quota & Incentives'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs font-medium">Aggregating live tele-consultation and sales metrics...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs font-semibold">
            Failed to load activity metrics: {error}
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            No staff members found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3.5 px-5">Staff Member</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Department / Role</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Leads Assigned</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Calls & Talk Time</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Orders</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Realized Sales (₹)</th>
                  <th className="py-3.5 px-5 whitespace-nowrap">Monthly Quota / Output</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Earned Incentive</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((staff: any) => {
                  const quotaPct = Math.min(staff.monthlyQuotaPercentage || 0, 100);
                  const isSales = staff.role === 'SALESPERSON';

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-emerald-50/40 transition-colors group"
                    >
                      {/* 1. Staff Member Avatar + Name */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-900 group-hover:border-emerald-300 transition">
                            {staff.name
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .toUpperCase() || 'EMP'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              {staff.name}
                              {!staff.isActive && (
                                <span className="text-[10px] text-rose-600 bg-rose-50 px-1 rounded border border-rose-200">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 block">
                              {staff.employeeCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Department / Role Badge */}
                      <td className="py-3.5 px-4">
                        {getRoleBadge(staff.role)}
                      </td>

                      {/* 3. Leads Assigned */}
                      <td className="py-3.5 px-4 text-center">
                        {staff.leadsAssigned > 0 ? (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-mono font-bold text-emerald-900 text-xs shadow-2xs">
                            {staff.leadsAssigned}
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-slate-300 font-medium">0</span>
                        )}
                      </td>

                      {/* 4. Calls & Talk Time */}
                      <td className="py-3.5 px-4">
                        {staff.callsCount > 0 ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-slate-900 text-xs">
                                {staff.callsCount} calls
                              </span>
                              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
                                {formatDuration(staff.callDurationSeconds || 0)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-mono">
                              <span className="text-emerald-700 font-bold">{staff.callOutcomes?.INTERESTED || 0} Int</span>
                              <span>•</span>
                              <span className="text-amber-700 font-bold">{staff.callOutcomes?.FOLLOW_UP_REQUIRED || 0} F/U</span>
                              <span>•</span>
                              <span className="text-rose-600 font-bold">{staff.callOutcomes?.NOT_INTERESTED || 0} Rej</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span className="font-mono text-xs">0 calls</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              0m
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 5. Orders Booked */}
                      <td className="py-3.5 px-4 text-center">
                        {staff.ordersCount > 0 ? (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 font-mono font-extrabold text-amber-900 text-xs shadow-2xs">
                            {staff.ordersCount}
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-slate-300 font-medium">0</span>
                        )}
                      </td>

                      {/* 6. Realized Sales */}
                      <td className="py-3.5 px-4 text-right">
                        {staff.revenueRealized > 0 ? (
                          <div>
                            <span className="font-mono font-extrabold text-emerald-800 text-xs block">
                              {formatCurrency(staff.revenueRealized)}
                            </span>
                            {staff.conversionRate > 0 && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block mt-0.5 font-mono">
                                {staff.conversionRate}% close
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-slate-300 font-medium">₹0</span>
                        )}
                      </td>

                      {/* 7. Monthly Quota / Output (Intelligent Role-specific) */}
                      <td className="py-3.5 px-5">
                        {isSales ? (
                          <div className="min-w-[170px]">
                            <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                              <span className="font-bold text-slate-800">
                                {formatCurrency(staff.monthlyAchieved || 0)}
                              </span>
                              <span
                                className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                                  staff.monthlyQuotaPercentage >= 100
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : staff.monthlyQuotaPercentage >= 50
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {staff.monthlyQuotaPercentage || 0}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  staff.monthlyQuotaPercentage >= 100
                                    ? 'bg-emerald-600'
                                    : staff.monthlyQuotaPercentage >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-400'
                                }`}
                                style={{ width: `${quotaPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              Quota: {formatCurrency(staff.monthlyTarget || 100000)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-slate-500 text-xs">
                            {staff.role === 'APPROVAL_OFFICER' && (
                              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 text-[11px] inline-flex items-center gap-1 shadow-2xs">
                                <Stethoscope className="w-3 h-3 text-blue-600" />
                                {staff.approvalsCount || 0} Approvals Done
                              </span>
                            )}
                            {staff.role === 'PENDING_REVIEWER' && (
                              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200 text-[11px] inline-flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-purple-600" />
                                {staff.reviewsCount || 0} Reviews Handled
                              </span>
                            )}
                            {staff.role === 'BILLING_EXECUTIVE' && (
                              <span className="font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-1 rounded-lg border border-cyan-200 text-[11px] inline-flex items-center gap-1 shadow-2xs">
                                <FileText className="w-3 h-3 text-cyan-600" />
                                {staff.invoicesCount || 0} Invoices Issued
                              </span>
                            )}
                            {staff.role === 'FOLLOWUP_EXECUTIVE' && (
                              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-[11px] inline-flex items-center gap-1 shadow-2xs">
                                <HeartHandshake className="w-3 h-3 text-amber-600" />
                                {staff.followupsCount || 0} Client Follow-ups
                              </span>
                            )}
                            {staff.role === 'SUPER_ADMIN' && (
                              <span className="text-slate-400 font-mono text-[11px] font-bold">
                                Executive Oversight
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 8. Earned Incentive */}
                      <td className="py-3.5 px-4 text-right">
                        {staff.totalIncentive > 0 ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-950 border border-amber-300 shadow-2xs whitespace-nowrap">
                              {formatCurrency(staff.totalIncentive)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                              Base ₹{staff.baseIncentive}
                              {(staff.milestoneBonus || 0) + (staff.activityBonus || 0) > 0 &&
                                ` + Bonus ₹${(staff.milestoneBonus || 0) + (staff.activityBonus || 0)}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono font-bold text-slate-300">₹0</span>
                        )}
                      </td>

                      {/* 9. Action: Inspect Dossier */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setDrawerStaff(staff)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-800 text-slate-700 hover:text-white border border-slate-300 hover:border-emerald-700 text-xs font-bold transition shadow-2xs cursor-pointer group/btn select-none"
                          title="Open detailed day log dossier"
                        >
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white transition" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-Over Staff Day Dossier Drawer */}
      <StaffDayDrawer
        isOpen={Boolean(drawerStaff)}
        onClose={() => setDrawerStaff(null)}
        staff={drawerStaff}
        dateStr={selectedDate}
      />

      {/* Incentive Rules Formula Modal */}
      <IncentiveRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </div>
  );
}
