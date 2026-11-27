'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { StatCard } from '../../../components/ui/stat-card';
import { BatchAssignModal } from '../../../components/admin/batch-assign-modal';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import {
  Users,
  UserCheck,
  RefreshCw,
  Search,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Package,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  Eye,
  FileText,
  HeartPulse,
  History,
} from 'lucide-react';

export default function SuperAdminCustomerFollowupsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'COMPLETED'>('ALL');

  // Checkbox multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Inspected Dossier Modal State
  const [inspectedData, setInspectedData] = useState<{ customer: any; followUp: any } | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());

      const [custRes, followUpsRes] = await Promise.all([
        apiClient.get(`/customers?${params.toString()}&limit=100`),
        apiClient.get('/customer-followups/all?limit=100'),
      ]);

      setCustomers(custRes.data?.data || custRes.data || []);
      setFollowUps(followUpsRes.data?.data || followUpsRes.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // Toggle single client checkbox
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle master select all
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredCustomers.map((c) => c.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  // Select first N clients shortcut (e.g. 5 or 10)
  const selectQuickBatch = (count: number) => {
    const slice = filteredCustomers.slice(0, count).map((c) => c.id);
    setSelectedIds(new Set(slice));
  };

  // Mapping customer follow-up status: Select canonical follow-up with logs & latest update
  const customerFollowUpsGroup = new Map<string, any[]>();
  followUps.forEach((f) => {
    if (!customerFollowUpsGroup.has(f.customerId)) {
      customerFollowUpsGroup.set(f.customerId, []);
    }
    customerFollowUpsGroup.get(f.customerId)!.push(f);
  });

  const followUpMap = new Map();
  customerFollowUpsGroup.forEach((list, custId) => {
    // Sort so:
    // 1. Follow-up with consultation logs comes first
    // 2. Most recently completed or updated comes first
    list.sort((a, b) => {
      const logsA = a.logs?.length || 0;
      const logsB = b.logs?.length || 0;
      if (logsA !== logsB) return logsB - logsA; // prioritize having consultation logs!

      const timeA = new Date(a.completedAt || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.completedAt || b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    const canonical = list[0];
    // Also aggregate all logs across duplicate records for full history in dossier
    const allLogs = list.flatMap((item) => item.logs || []).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    canonical.logs = allLogs;
    canonical.allFollowUps = list;
    followUpMap.set(custId, canonical);
  });

  const filteredCustomers = customers.filter((cust) => {
    const fu = followUpMap.get(cust.id);
    if (statusFilter === 'UNASSIGNED') return !fu;
    if (statusFilter === 'ASSIGNED') return fu && fu.status !== 'COMPLETED';
    if (statusFilter === 'COMPLETED') return fu && fu.status === 'COMPLETED';
    return true;
  });

  const selectedCustomers = customers.filter((c) => selectedIds.has(c.id));
  const isAllSelected =
    filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedIds.has(c.id));

  const handleAssignSuccess = (resData: any) => {
    setSuccessMsg(resData?.message || 'Clients successfully allocated to Follow-Up Executive!');
    setSelectedIds(new Set());
    fetchData();
  };

  const adminFollowupsExportColumns: ExcelColumnDef[] = [
    { header: 'Client Code', accessor: 'customerCode' },
    { header: 'Full Name', accessor: 'fullName' },
    { header: 'Phone Number', accessor: 'phoneNumber' },
    { header: 'Location', accessor: (c: any) => [c.city, c.state].filter(Boolean).join(', ') || 'N/A' },
    { header: 'Lifetime Orders', accessor: (c: any) => Number(c.orders?.length || 0) },
    { header: 'Follow-Up Status', accessor: (c: any) => {
      const f = followUps.find((item: any) => item.customerId === c.id);
      return f ? f.status : 'UNASSIGNED';
    }},
    { header: 'Assigned Executive', accessor: (c: any) => {
      const f = followUps.find((item: any) => item.customerId === c.id);
      return f?.assignedTo ? `${f.assignedTo.firstName || ''} ${f.assignedTo.lastName || ''} (${f.assignedTo.employeeCode})`.trim() : 'Unassigned';
    }},
    { header: 'Latest Call Outcome', accessor: (c: any) => {
      const f = followUps.find((item: any) => item.customerId === c.id);
      return f?.logs?.[0]?.disposition || 'N/A';
    }},
    { header: 'Patient Relief Scale', accessor: (c: any) => {
      const f = followUps.find((item: any) => item.customerId === c.id);
      return f?.logs?.[0]?.healthRating || 'N/A';
    }},
    { header: 'Consultation Notes', accessor: (c: any) => {
      const f = followUps.find((item: any) => item.customerId === c.id);
      return f?.logs?.[0]?.consultationNotes || 'N/A';
    }},
    { header: 'Refill Requested', accessor: (c: any) => {
      const f = followUps.find((item: any) => item.customerId === c.id);
      return f?.logs?.[0]?.refillRequested ? 'YES' : 'NO';
    }},
    { header: 'Completed Date', accessor: (c: any) => {
      const f = followUps.find((item: any) => item.customerId === c.id);
      return f?.completedAt ? new Date(f.completedAt).toLocaleString('en-IN') : 'N/A';
    }},
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-900 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              PANEL: SUPER ADMIN ALLOCATION
            </span>
            <Badge variant="role">Post-Sales Care Desk</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Manage Allocation & Care Desk
          </h2>
          <p className="text-xs text-slate-500">
            Select clients manually (5, 6, 10 or more) and assign them to a dedicated Follow-Up Executive with specific directives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredCustomers}
            columns={adminFollowupsExportColumns}
            fileName="Melayurveda_SuperAdmin_Client_Followups"
            sheetName="Manage Allocation"
          />

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
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              if (selectedIds.size === 0 && filteredCustomers.length > 0) {
                // Auto-select first 5 clients if none checked yet
                selectQuickBatch(Math.min(5, filteredCustomers.length));
              }
              setIsAssignModalOpen(true);
            }}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3 py-1.5 shadow-sm"
            icon={<UserCheck className="h-3.5 w-3.5" />}
          >
            {selectedIds.size > 0 ? `Assign (${selectedIds.size}) to Executive` : '+ Allocate Clients Batch'}
          </Button>

          <Link href="/sales/customer-care">
            <Button
              variant="gold"
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-emerald-950 font-extrabold shadow-sm"
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Open Follow-Up Care Desk
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Onboarded Clients"
          value={customers.length}
          icon={Users}
          subtitle="Verified Ayurvedic patients"
          colorTheme="forest"
        />
        <StatCard
          title="Active Assigned Follow-Ups"
          value={followUps.filter((f) => f.status === 'PENDING' || f.status === 'IN_PROGRESS').length}
          icon={Clock}
          colorTheme="amber"
          subtitle="In progress on care desks"
        />
        <StatCard
          title="Completed Consultations"
          value={followUps.filter((f) => f.status === 'COMPLETED').length}
          icon={CheckCircle2}
          colorTheme="emerald"
          subtitle="Wellness notes recorded"
        />
        <StatCard
          title="Selected for Allocation"
          value={selectedIds.size}
          icon={UserCheck}
          colorTheme="gold"
          subtitle="Ready for batch assignment"
        />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Clients ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('UNASSIGNED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === 'UNASSIGNED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unassigned ({customers.filter((c) => !followUpMap.has(c.id)).length})
          </button>
          <button
            onClick={() => setStatusFilter('ASSIGNED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === 'ASSIGNED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Assigned ({followUps.filter((f) => f.status !== 'COMPLETED').length})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === 'COMPLETED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({followUps.filter((f) => f.status === 'COMPLETED').length})
          </button>
        </div>

        {/* Quick select shortcuts & search */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 hidden md:inline">Quick Select:</span>
          <button
            type="button"
            onClick={() => selectQuickBatch(5)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            5 Clients
          </button>
          <button
            type="button"
            onClick={() => selectQuickBatch(10)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            10 Clients
          </button>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Search code, name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 sm:w-56 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-forest-600 focus:outline-none"
            />
            <Button type="submit" variant="secondary" size="sm">
              <Search className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>

      {/* Main Clients Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-700 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Client Code & Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Lifetime Orders</th>
                <th className="py-3 px-4">Latest Order</th>
                <th className="py-3 px-4">Follow-Up Care Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading clients database...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No clients found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isChecked = selectedIds.has(cust.id);
                  const fu = followUpMap.get(cust.id);
                  const orders = cust.orders || [];
                  const latestOrder = orders[0];

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => toggleSelectOne(cust.id)}
                      className={`cursor-pointer transition ${
                        isChecked ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(cust.id)}
                          className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-700 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {cust.customerCode}
                        </span>
                        <div className="font-bold text-slate-900 mt-0.5">{cust.fullName}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{cust.phoneNumber}</span>
                          {cust.alternatePhone && (
                            <span className="text-slate-400">/ {cust.alternatePhone}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{[cust.city, cust.state].filter(Boolean).join(', ') || 'N/A'}</span>
                        </div>
                        {cust.pincode && (
                          <span className="font-mono text-[10px] text-slate-400 block ml-4">
                            PIN: {cust.pincode}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {orders.length} Order{orders.length === 1 ? '' : 's'}
                        </span>
                        {orders.length > 0 && (
                          <span className="block text-[11px] text-emerald-700 font-mono font-semibold">
                            ₹
                            {orders
                              .reduce((acc: number, o: any) => acc + Number(o.totalAmount || 0), 0)
                              .toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {latestOrder ? (
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {latestOrder.orderNumber}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] mt-0.5">
                              <Badge
                                variant={
                                  latestOrder.status === 'DELIVERED'
                                    ? 'success'
                                    : latestOrder.status === 'CONFIRMED'
                                    ? 'warning'
                                    : 'slate'
                                }
                                className="text-[9px] px-1.5 py-0"
                              >
                                {latestOrder.status}
                              </Badge>
                              <span className="text-slate-400">
                                {new Date(latestOrder.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No orders yet</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {fu ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant={
                                  fu.status === 'COMPLETED'
                                    ? 'success'
                                    : fu.status === 'PENDING'
                                    ? 'warning'
                                    : 'info'
                                }
                              >
                                {fu.status}
                              </Badge>
                              {fu.assignedTo && (
                                <span className="text-[10px] text-slate-700 font-mono font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                  {fu.assignedTo.employeeCode}
                                </span>
                              )}
                            </div>

                            {/* Show Latest Consultation Log Notes & Response */}
                            {fu.logs && fu.logs.length > 0 ? (
                              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 space-y-1 text-xs max-w-xs shadow-2xs">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-extrabold text-[11px] text-emerald-950 truncate">
                                    {fu.logs[0].disposition}
                                  </span>
                                  {fu.logs[0].healthRating && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-700 text-white shrink-0">
                                      {fu.logs[0].healthRating === 'SIGNIFICANT_RELIEF'
                                        ? '🌟 80-100%'
                                        : fu.logs[0].healthRating === 'MODERATE_RELIEF'
                                        ? '🌿 40-79%'
                                        : '⏳ Adjust'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-800 font-medium italic line-clamp-2 bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                                  &quot;{fu.logs[0].consultationNotes}&quot;
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectedData({ customer: cust, followUp: fu });
                                  }}
                                  className="w-full mt-1 py-1 text-[10px] font-extrabold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <Eye className="w-3 h-3 text-emerald-700" />
                                  <span>View Consultation Notes ({fu.logs.length})</span>
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="block text-[10px] text-slate-500 truncate max-w-[180px]">
                                  {fu.campaignObjective || 'Routine health review'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectedData({ customer: cust, followUp: fu });
                                  }}
                                  className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View Care Dossier</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Unassigned
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedData({ customer: cust, followUp: null });
                              }}
                              className="block text-[10px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                            >
                              Client Profile
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Batch Allocation Toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-40 p-4 rounded-2xl bg-gradient-to-r from-[#041d13] via-[#072a1c] to-[#0a3826] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl border border-emerald-500/40 ring-1 ring-amber-400/20 animate-in slide-in-from-bottom duration-200 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black flex items-center justify-center text-base shadow-md shrink-0">
              {selectedIds.size}
            </div>
            <div>
              <div className="font-extrabold text-sm flex items-center gap-2">
                <span>{selectedIds.size} Client{selectedIds.size > 1 ? 's' : ''} Selected for Care Follow-Up</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Ready to Assign
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/90 mt-0.5">
                Assign this selected client batch to an executive with dedicated campaign directives.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <X className="w-3.5 h-3.5 text-slate-300" />
              <span>Clear Selection</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-105 transition-all shadow-lg shadow-amber-950/40 border border-amber-200/80 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <UserCheck className="w-4 h-4 text-slate-950" />
              <span>Assign Batch to Executive ➔</span>
            </button>
          </div>
        </div>
      )}

      {/* Batch Assign Modal */}
      <BatchAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedCustomers={selectedCustomers}
        onSuccess={handleAssignSuccess}
      />

      {/* Super Admin Inspection: Client Care & Consultation Dossier Modal */}
      {inspectedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setInspectedData(null)}
          />

          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#061e14] via-[#092b1d] to-[#0c3725] text-white p-5 border-b border-emerald-900/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold text-lg shadow-inner">
                  {inspectedData.customer.fullName?.charAt(0) || 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">
                      {inspectedData.customer.fullName}
                    </h3>
                    <span className="font-mono text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded">
                      {inspectedData.customer.customerCode}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-300/80 mt-0.5 font-mono">
                    📞 {inspectedData.customer.phoneNumber}{' '}
                    {inspectedData.customer.alternatePhone ? `/ ${inspectedData.customer.alternatePhone}` : ''} • 📍 {[inspectedData.customer.city, inspectedData.customer.state].filter(Boolean).join(', ') || 'India'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectedData(null)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs bg-slate-50/70">
              {/* Summary Metrics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Care Status</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge
                      variant={
                        inspectedData.followUp?.status === 'COMPLETED'
                          ? 'success'
                          : inspectedData.followUp?.status === 'PENDING'
                          ? 'warning'
                          : 'slate'
                      }
                    >
                      {inspectedData.followUp?.status || 'UNASSIGNED'}
                    </Badge>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Assigned Executive</span>
                  <span className="mt-1 block font-bold text-slate-900 font-mono">
                    {inspectedData.followUp?.assignedTo
                      ? `${inspectedData.followUp.assignedTo.employeeCode} (${inspectedData.followUp.assignedTo.firstName || ''})`
                      : 'None'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Lifetime Orders</span>
                  <span className="mt-1 block font-bold text-slate-900 font-mono">
                    {inspectedData.customer.orders?.length || 0} Orders
                  </span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Completed Date</span>
                  <span className="mt-1 block font-bold text-slate-900 font-mono text-[11px]">
                    {inspectedData.followUp?.completedAt
                      ? new Date(inspectedData.followUp.completedAt).toLocaleDateString('en-IN')
                      : 'Pending Care'}
                  </span>
                </div>
              </div>

              {/* Directives Banner */}
              {inspectedData.followUp?.adminDirectives && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                    Super Admin Directives:
                  </span>
                  <p className="text-xs text-amber-950 font-medium italic">
                    &quot;{inspectedData.followUp.adminDirectives}&quot;
                  </p>
                </div>
              )}

              {/* Section 1: Executive Consultation Logs & Discussion */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-emerald-700" />
                    <span>Executive Consultation Records & Patient Notes ({inspectedData.followUp?.logs?.length || 0})</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Real-time Tele-Care Feedback</span>
                </div>

                {(!inspectedData.followUp?.logs || inspectedData.followUp.logs.length === 0) ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 space-y-1">
                    <p className="font-semibold">No consultation notes recorded yet.</p>
                    <p className="text-[11px]">Once the executive conducts the call and submits the mandatory consultation details, they will be archived here permanently.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inspectedData.followUp.logs.map((log: any, idx: number) => (
                      <div
                        key={log.id || idx}
                        className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-2xs"
                      >
                        {/* Outcome & Rating Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                              {log.disposition}
                            </span>

                            {log.healthRating && (
                              <span
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border ${
                                  log.healthRating === 'SIGNIFICANT_RELIEF'
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                    : log.healthRating === 'MODERATE_RELIEF'
                                    ? 'bg-teal-50 text-teal-900 border-teal-300'
                                    : 'bg-amber-50 text-amber-900 border-amber-300'
                                }`}
                              >
                                {log.healthRating === 'SIGNIFICANT_RELIEF'
                                  ? '🌟 Significant Symptom Relief (80-100%)'
                                  : log.healthRating === 'MODERATE_RELIEF'
                                  ? '🌿 Moderate Symptom Relief (40-79%)'
                                  : '⏳ No Change / Regimen Adjusted'}
                              </span>
                            )}

                            {log.refillRequested && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shadow-2xs">
                                🛒 Refill Requested
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Consultation Notes & Discussion */}
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Consultation Notes & Patient Discussion:
                          </span>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium whitespace-pre-line leading-relaxed shadow-inner">
                            {log.consultationNotes}
                          </div>
                        </div>

                        {/* Patient Feedback */}
                        {log.patientFeedback && (
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                              Patient Remarks / Questions:
                            </span>
                            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-950 font-medium">
                              {log.patientFeedback}
                            </div>
                          </div>
                        )}

                        {/* Caller Metadata Footer */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-100">
                          <span>
                            Logged By: <strong>{log.caller?.employeeCode || 'Executive'}</strong>{' '}
                            {log.caller?.firstName ? `(${log.caller.firstName} ${log.caller.lastName || ''})` : ''}
                          </span>
                          <span>Duration: {log.callDurationSeconds || 0} seconds</span>
                          {log.nextFollowUpDate && (
                            <span className="text-emerald-700 font-bold">
                              Next Check-in: {new Date(log.nextFollowUpDate).toLocaleDateString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Patient Formulations & Orders */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-700" />
                  <span>Prescribed Formulations & Past Orders ({inspectedData.customer.orders?.length || 0})</span>
                </h4>

                {(!inspectedData.customer.orders || inspectedData.customer.orders.length === 0) ? (
                  <p className="text-slate-400 italic text-xs">No orders recorded for this patient.</p>
                ) : (
                  <div className="space-y-2">
                    {inspectedData.customer.orders.map((order: any) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
                            <Badge variant={order.status === 'DELIVERED' ? 'success' : 'slate'} className="text-[9px]">
                              {order.status}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(order.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900">
                            ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                          </span>
                          {order.shipment?.trackingAwb && (
                            <span className="block text-[10px] text-slate-500 font-mono">
                              AWB: {order.shipment.trackingAwb}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Patient Dossier verified by Melayurveda Clinical Governance Desk.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectedData(null)}
                className="font-bold text-xs px-5 cursor-pointer"
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
