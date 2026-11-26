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

  // Mapping customer follow-up status
  const followUpMap = new Map();
  followUps.forEach((f) => {
    followUpMap.set(f.customerId, f);
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
      return f?.assignedUser ? `${f.assignedUser.firstName || ''} ${f.assignedUser.lastName || ''}`.trim() : 'Unassigned';
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
            Client Follow-Up Allocation & Care Desk
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
            sheetName="Follow-Up Allocation"
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
                          <div className="space-y-1">
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
                            <span className="block text-[10px] text-slate-600 font-mono">
                              Assigned: {fu.assignedTo?.employeeCode || 'Executive'}
                            </span>
                            <span className="block text-[10px] text-slate-500 truncate max-w-[180px]">
                              {fu.campaignObjective}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Unassigned
                          </span>
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
        <div className="sticky bottom-4 z-40 p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl border border-emerald-700/50 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 font-black flex items-center justify-center text-base shadow-md">
              {selectedIds.size}
            </div>
            <div>
              <div className="font-extrabold text-sm flex items-center gap-2">
                <span>{selectedIds.size} Clients Selected for Care Follow-Up</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-800 text-amber-300">
                  Ready to Assign
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/90">
                Click below to assign this client batch to an executive with campaign objective and directives.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="border-slate-600 text-white hover:bg-slate-800 text-xs"
            >
              Clear Selection
            </Button>
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={() => setIsAssignModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 shadow-lg text-xs"
              icon={<UserCheck className="w-4 h-4 text-slate-950" />}
            >
              Assign Batch to Executive ➔
            </Button>
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
    </div>
  );
}
