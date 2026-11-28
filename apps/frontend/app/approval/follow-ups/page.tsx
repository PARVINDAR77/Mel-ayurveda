'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Drawer } from '../../../components/ui/drawer';
import {
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  Phone,
  PhoneCall,
  Calendar,
  Clock,
  User,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
  Eye,
  Activity,
  HeartHandshake,
} from 'lucide-react';

export default function VerificationFollowUpsPage() {
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalCancelled: 0,
    pendingCallbacks: 0,
    completedCallbacks: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('ALL');

  // Inspection Drawer
  const [inspectingItem, setInspectingItem] = useState<any | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await apiClient.get('/approvals/cancellations-metrics');
      if (res.data) setMetrics(res.data);
    } catch {
      // Quiet
    }
  };

  const fetchCancellations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (reasonFilter !== 'ALL') params.append('reason', reasonFilter);
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', '100');

      const res = await apiClient.get(`/approvals/cancellations-queue?${params.toString()}`);
      setCancellations(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAll = () => {
    fetchMetrics();
    fetchCancellations();
  };

  useEffect(() => {
    refreshAll();
  }, [reasonFilter]);

  const renderReasonBadge = (reason: string) => {
    switch (reason) {
      case 'PRICE_TOO_HIGH':
        return <Badge variant="warning">Price Too High</Badge>;
      case 'FAMILY_OBJECTED':
        return <Badge variant="danger">Family Objected</Badge>;
      case 'NOT_READY_NOW':
        return <Badge variant="gold">Not Ready Now</Badge>;
      case 'HESITANT_ON_RESULTS':
        return <Badge variant="info">Hesitant on Efficacy</Badge>;
      case 'FINANCIAL_CONSTRAINT':
        return <Badge variant="danger">Financial Issue</Badge>;
      case 'DELIVERY_TIME_CONCERN':
        return <Badge variant="warning">Delivery Concerns</Badge>;
      case 'DENIES_PLACING_ORDER':
        return <Badge variant="danger">Denies Order</Badge>;
      case 'PURCHASED_COMPETITOR':
        return <Badge variant="slate">Bought Alternate</Badge>;
      default:
        return <Badge variant="default">{reason?.replace(/_/g, ' ') || 'Cancelled'}</Badge>;
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'lead',
      header: 'Lead & Submitted',
      render: (row) => {
        const lead = row.lead;
        return (
          <div>
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs inline-block">
              {lead?.leadCode || row.leadId?.slice(0, 8)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1 flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3 text-slate-400" />
              {row.decidedAt ? new Date(row.decidedAt).toLocaleDateString('en-IN') : 'N/A'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'patient',
      header: 'Patient Details',
      render: (row) => {
        const lead = row.lead;
        return (
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-900 block text-xs">
              {lead?.customerName || 'Patient'}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
              <a
                href={`tel:${lead?.phoneNumber}`}
                className="text-emerald-700 hover:underline font-bold flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3 h-3 text-emerald-600" />
                {lead?.phoneNumber || 'N/A'}
              </a>
              {lead?.city && <span className="text-slate-400 text-[11px]">• {lead.city}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'bookingSalesperson',
      header: 'Booking Salesperson',
      render: (row) => {
        const sp = row.followUp?.assignedTo || row.lead?.assignedTo;
        return (
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-1 font-bold text-slate-800">
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span>{sp ? `${sp.firstName} ${sp.lastName}` : 'Unassigned'}</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 inline-block">
              {sp?.employeeCode || 'MEL-SAL'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'cancellationReason',
      header: 'Cancellation Reason & Feedback',
      render: (row) => (
        <div className="space-y-1 max-w-[280px]">
          <div>{renderReasonBadge(row.cancellationReason)}</div>
          {row.cancellationNotes && (
            <p className="text-[11px] text-slate-700 bg-amber-50/70 border border-amber-200/60 rounded p-1.5 italic line-clamp-2">
              &quot;{row.cancellationNotes}&quot;
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'formulations',
      header: 'Prescribed Regimen',
      render: (row) => {
        const order = row.order;
        const total = order?.grandTotal || order?.totalAmount || 0;
        return (
          <div className="space-y-1 text-xs">
            {order?.items && order.items.length > 0 ? (
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {order.items.slice(0, 2).map((it: any, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700 truncate"
                  >
                    <Boxes className="w-2.5 h-2.5 text-blue-500" />
                    {it.product?.name || 'Medicine'}
                  </span>
                ))}
                {order.items.length > 2 && (
                  <span className="text-[10px] text-slate-400">+{order.items.length - 2} more</span>
                )}
              </div>
            ) : (
              <span className="text-slate-400 text-[11px] italic">Inquiry stage</span>
            )}
            {total > 0 && (
              <span className="font-mono font-bold text-slate-900 block text-[11px]">
                ₹{Number(total).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'callback',
      header: 'Callback Agenda',
      render: (row) => {
        const fu = row.followUp;
        if (!fu) return <span className="text-slate-400 text-[11px]">No follow-up linked</span>;

        const isCompleted = fu.status === 'COMPLETED';
        const dateObj = new Date(fu.scheduledTime);
        const isPast = !isCompleted && dateObj < new Date();

        return (
          <div className="space-y-1 text-xs">
            <Badge variant={isCompleted ? 'success' : isPast ? 'danger' : 'warning'}>
              {isCompleted ? 'COMPLETED' : isPast ? 'OVERDUE' : 'SCHEDULED'}
            </Badge>
            <div className={`text-[11px] font-mono ${isPast ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{dateObj.toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setInspectingItem(row)}
            icon={<Eye className="w-3.5 h-3.5" />}
            className="text-xs h-7 px-2.5 cursor-pointer"
          >
            Dossier
          </Button>

          {row.lead?.phoneNumber && (
            <a
              href={`tel:${row.lead.phoneNumber}`}
              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition-colors cursor-pointer"
              title="Call Patient"
            >
              <PhoneCall className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-sm">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Verification Follow-Ups (Cancelled Deals)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Deals cancelled by patients during medical verification calls. Automatically routed to booking salespersons for objection handling and deal recovery.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/approval/queue"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <span>← Back to Verification Queue</span>
          </Link>
          <Button
            variant="outline"
            onClick={refreshAll}
            disabled={isLoading}
            className="flex items-center gap-1 text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Cancelled in Verification</span>
            <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{metrics.totalCancelled || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Cross-verification cancellations</div>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Sales Callbacks</span>
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700">{metrics.pendingCallbacks || 0}</div>
          <div className="text-xs text-amber-600 mt-1 font-medium">Currently in sales recovery agenda</div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Recovery Calls</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{metrics.completedCallbacks || 0}</div>
          <div className="text-xs text-emerald-600 mt-1 font-medium">Follow-ups completed by sales team</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, phone number, or lead code..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium text-slate-700 bg-white"
          >
            <option value="ALL">All Cancellation Reasons</option>
            <option value="PRICE_TOO_HIGH">Price Too High</option>
            <option value="FAMILY_OBJECTED">Family Member Objected</option>
            <option value="NOT_READY_NOW">Not Ready Now</option>
            <option value="HESITANT_ON_RESULTS">Hesitant on Efficacy</option>
            <option value="FINANCIAL_CONSTRAINT">Financial Issue</option>
            <option value="DELIVERY_TIME_CONCERN">Delivery Concerns</option>
            <option value="DENIES_PLACING_ORDER">Denies Order</option>
            <option value="OTHER">Other Custom Reasons</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <DataTable
          columns={columns}
          data={cancellations}
          isLoading={isLoading}
          emptyMessage="No verification-cancelled deals found. All verification calls cleared or active in queue."
        />
      </div>

      {/* Dossier Drawer */}
      <Drawer
        isOpen={Boolean(inspectingItem)}
        onClose={() => setInspectingItem(null)}
        title="Verification Cancellation Dossier"
        subtitle={`Lead ${inspectingItem?.lead?.leadCode || 'N/A'} • ${inspectingItem?.lead?.customerName || 'Patient'}`}
        width="lg"
      >
        {inspectingItem && (
          <div className="space-y-4 text-xs">
            {/* Cancellation Summary Banner */}
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-900 text-sm flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                  Client Refused Deal During Verification
                </span>
                {renderReasonBadge(inspectingItem.cancellationReason)}
              </div>
              {inspectingItem.cancellationNotes && (
                <div className="text-red-800 bg-white/80 p-2 rounded border border-red-200/60 mt-1 italic">
                  &quot;{inspectingItem.cancellationNotes}&quot;
                </div>
              )}
              {inspectingItem.officerNotes && (
                <div className="text-slate-600 text-[11px] pt-1">
                  <strong>Officer Advice:</strong> {inspectingItem.officerNotes}
                </div>
              )}
            </div>

            {/* Sales Consultant Details */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" />
                Assigned Recovery Salesperson
              </h4>
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">
                    {inspectingItem.followUp?.assignedTo
                      ? `${inspectingItem.followUp.assignedTo.firstName} ${inspectingItem.followUp.assignedTo.lastName}`
                      : inspectingItem.lead?.assignedTo
                      ? `${inspectingItem.lead.assignedTo.firstName} ${inspectingItem.lead.assignedTo.lastName}`
                      : 'Unassigned Salesperson'}
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    Code: {inspectingItem.followUp?.assignedTo?.employeeCode || inspectingItem.lead?.assignedTo?.employeeCode || 'N/A'}
                  </span>
                </div>
                <Badge variant={inspectingItem.followUp?.status === 'COMPLETED' ? 'success' : 'warning'}>
                  {inspectingItem.followUp?.status || 'SCHEDULED'}
                </Badge>
              </div>
            </div>

            {/* Patient Dossier */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Patient Contact Information
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Full Name</span>
                  <span className="font-bold text-slate-900">{inspectingItem.lead?.customerName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Phone Number</span>
                  <a
                    href={`tel:${inspectingItem.lead?.phoneNumber}`}
                    className="font-mono font-bold text-emerald-700 hover:underline"
                  >
                    {inspectingItem.lead?.phoneNumber || 'N/A'}
                  </a>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">Location</span>
                  <span className="font-medium text-slate-800">
                    {[inspectingItem.lead?.city, inspectingItem.lead?.state].filter(Boolean).join(', ') || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Prescribed Formulations */}
            {inspectingItem.order && (
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-blue-600" />
                    Prescribed Course ({inspectingItem.order.orderNumber})
                  </h4>
                  <span className="font-bold font-mono text-slate-900">
                    ₹{Number(inspectingItem.order.totalAmount || inspectingItem.order.grandTotal || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {inspectingItem.order.items?.map((it: any, idx: number) => (
                    <div key={idx} className="py-1.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 block">{it.product?.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{it.product?.sku}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">Qty: {it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
