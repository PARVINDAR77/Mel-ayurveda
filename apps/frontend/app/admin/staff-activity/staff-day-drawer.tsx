'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '../../../components/ui/drawer';
import { Badge } from '../../../components/ui/badge';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import {
  PhoneCall,
  Clock,
  UserCheck,
  Package,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  History,
  FileText,
  DollarSign,
  TrendingUp,
  Tag,
  ArrowRight,
} from 'lucide-react';

interface StaffDayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any | null;
  dateStr: string;
}

export function StaffDayDrawer({
  isOpen,
  onClose,
  staff,
  dateStr,
}: StaffDayDrawerProps) {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'calls' | 'leads' | 'orders' | 'audit'>('calls');

  const fetchDayLog = async (userId: string, targetDate: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get(`/analytics/staff-activity/${userId}/day-log`, {
        params: { date: targetDate },
      });
      setData(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && staff?.id) {
      fetchDayLog(staff.id, dateStr);
      setActiveTab('calls');
    } else {
      setData(null);
    }
  }, [isOpen, staff?.id, dateStr]);

  if (!staff) return null;

  const calls = data?.calls || [];
  const leads = data?.leads || [];
  const orders = data?.orders || [];
  const auditLogs = data?.auditLogs || [];

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

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'INTERESTED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">INTERESTED</span>;
      case 'FOLLOW_UP_REQUIRED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">FOLLOW-UP</span>;
      case 'NOT_INTERESTED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">NOT INTERESTED</span>;
      case 'BUSY_CALL_LATER':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-300">BUSY</span>;
      case 'NO_ANSWER':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-300">NO ANSWER</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">{outcome}</span>;
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Staff Daily Work Dossier: ${staff.name}`}
      subtitle={`${staff.employeeCode} • ${staff.role?.replace('_', ' ')} • Date: ${data?.label || dateStr}`}
      width="3xl"
    >
      <div className="flex flex-col h-full overflow-hidden bg-slate-50">
        {/* Profile Card Header */}
        <div className="p-4 bg-gradient-to-r from-[#071912] to-[#0f2e22] text-white border-b border-emerald-900/60 shadow-sm shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-bold text-lg shadow-inner">
                {staff.name
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase() || 'EMP'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white">{staff.name}</h4>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-900/70 border border-emerald-700/60 text-emerald-300">
                    {staff.employeeCode}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    {staff.phoneNumber || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-amber-400" />
                    {staff.email}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300">
                <Calendar className="w-3.5 h-3.5" />
                {data?.label || dateStr}
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-emerald-900/50">
            <div className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Calls Dialed</span>
              <span className="text-base font-bold text-white">{calls.length}</span>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Talk Duration</span>
              <span className="text-base font-bold text-emerald-300">
                {formatDuration(
                  calls.reduce((acc: number, c: any) => acc + (c.durationSeconds || 0), 0)
                )}
              </span>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Leads Assigned</span>
              <span className="text-base font-bold text-amber-300">{leads.length}</span>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Orders / Revenue</span>
              <span className="text-base font-bold text-emerald-400">
                {orders.length} / {formatCurrency(orders.reduce((acc: number, o: any) => acc + Number(o.totalAmount || 0), 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 shrink-0 shadow-2xs">
          <button
            onClick={() => setActiveTab('calls')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'calls'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Calls Dialed ({calls.length})
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'leads'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Assigned Leads ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Orders Created ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs font-medium">Loading chronological day ledger...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : (
            <>
              {/* TAB 1: CALLS */}
              {activeTab === 'calls' && (
                <div className="space-y-2.5">
                  {calls.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                      No customer calls recorded on this date.
                    </div>
                  ) : (
                    calls.map((c: any) => (
                      <div
                        key={c.id}
                        className="bg-white rounded-xl border border-slate-200 p-3.5 hover:shadow-sm transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <PhoneCall className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">
                                  {c.lead?.customerName || 'Customer'}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {c.lead?.phoneNumber}
                                </span>
                                {c.lead?.city && (
                                  <span className="text-[10px] text-slate-400">
                                    • {c.lead.city}, {c.lead.state}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Lead: {c.lead?.leadCode || 'N/A'} • Product: {c.lead?.productInterest || 'General'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {getOutcomeBadge(c.callOutcome)}
                            <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formatDuration(c.durationSeconds)}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(c.calledAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                        {c.notes && (
                          <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-sans">
                            <span className="font-semibold text-slate-700">Notes: </span>
                            {c.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: LEADS */}
              {activeTab === 'leads' && (
                <div className="space-y-2">
                  {leads.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                      No new leads were assigned on this date.
                    </div>
                  ) : (
                    leads.map((l: any) => (
                      <div
                        key={l.id}
                        className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-sm transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{l.customerName}</span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {l.leadCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {l.phoneNumber} • {l.productInterest || 'Ayurvedic Formulations'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {l.status}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(l.assignedAt || l.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-2.5">
                  {orders.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                      No prescription orders were booked on this date.
                    </div>
                  ) : (
                    orders.map((o: any) => (
                      <div
                        key={o.id}
                        className="bg-white rounded-xl border border-slate-200 p-3.5 hover:shadow-sm transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {o.orderNumber}
                                </span>
                                <span className="text-xs text-slate-600">
                                  Patient: {o.customer?.fullName || 'Customer'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-sans">
                                {o.customer?.phoneNumber} • {o.customer?.city}, {o.customer?.state}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-emerald-700 font-mono block">
                              {formatCurrency(Number(o.totalAmount || 0))}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {o.status}
                            </span>
                          </div>
                        </div>

                        {o.items?.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-700">Formulations: </span>
                            {o.items.map((i: any, idx: number) => (
                              <span key={i.id || idx} className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono mr-1 mb-1">
                                {i.product?.name || 'Item'} ×{i.quantity}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: AUDIT LOG */}
              {activeTab === 'audit' && (
                <div className="space-y-1.5">
                  {auditLogs.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                      No system events recorded on this date.
                    </div>
                  ) : (
                    auditLogs.map((a: any) => (
                      <div
                        key={a.id}
                        className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span className="font-mono font-bold text-slate-800 text-[11px]">{a.action}</span>
                          <span className="text-[11px] text-slate-400">({a.entityType})</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(a.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
