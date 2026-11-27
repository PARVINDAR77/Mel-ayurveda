'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Drawer } from '../../../components/ui/drawer';
import { ExportButton } from '../../../components/ui/export-button';
import { ImportButton } from '../../../components/ui/import-button';
import { OFFICIAL_SALES_ORDERS_EXPORT_COLUMNS } from '../../../lib/official-sales-export';
import { OFDCallingModal } from '../../../components/operations/ofd-calling-modal';
import {
  Truck,
  PhoneCall,
  Phone,
  RotateCcw,
  CheckCircle2,
  CalendarClock,
  Clock,
  MapPin,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Boxes,
  Package,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  DollarSign,
  TrendingUp,
  FileText,
  AlertCircle,
  Calendar,
  UserCheck,
} from 'lucide-react';

export default function OFDCallingPage() {
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'CONFIRMED' | 'ISSUES'>('QUEUE');

  const [shipments, setShipments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalOfd: 0,
    confirmedDelivered: 0,
    rescheduled: 0,
    refused: 0,
    totalCodCollected: 0,
    confirmationRate: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [courierFilter, setCourierFilter] = useState('ALL');
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);

  // Modal & Drawer state
  const [callingShipment, setCallingShipment] = useState<any | null>(null);
  const [inspectingShipment, setInspectingShipment] = useState<any | null>(null);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/dispatch/ofd/stats');
      if (res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      // Quiet fail for stats
    }
  };

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (courierFilter !== 'ALL') params.append('courierPartner', courierFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('limit', '100');

      const res = await apiClient.get(`/dispatch/ofd/queue?${params.toString()}`);
      setShipments(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAll = () => {
    fetchStats();
    fetchQueue();
  };

  useEffect(() => {
    refreshAll();
  }, [courierFilter]);

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAwb(text);
      setTimeout(() => setCopiedAwb(null), 2000);
    }
  };

  // Filter shipments based on active tab and search query
  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      const status = item.ofdCallStatus || 'PENDING_CALL';

      if (activeTab === 'QUEUE') {
        // Pending calling queue
        if (status === 'DELIVERED_CONFIRMED' || status === 'DOORSTEP_REFUSED' || status === 'RE_ATTEMPT_SCHEDULED') {
          return false;
        }
      } else if (activeTab === 'CONFIRMED') {
        // Delivered & Confirmed
        if (status !== 'DELIVERED_CONFIRMED') return false;
      } else if (activeTab === 'ISSUES') {
        // Rescheduled or Doorstep Refused
        if (status !== 'RE_ATTEMPT_SCHEDULED' && status !== 'DOORSTEP_REFUSED') return false;
      }

      // In-memory text search fallback
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const awb = (item.trackingAwb || '').toLowerCase();
        const orderNum = (item.order?.orderNumber || '').toLowerCase();
        const custName = (item.order?.customer?.fullName || '').toLowerCase();
        const phone = (item.order?.customer?.phoneNumber || '').toLowerCase();
        const city = (item.order?.customer?.city || '').toLowerCase();

        return (
          awb.includes(query) ||
          orderNum.includes(query) ||
          custName.includes(query) ||
          phone.includes(query) ||
          city.includes(query)
        );
      }

      return true;
    });
  }, [shipments, activeTab, searchQuery]);

  // Transform data for official Excel export
  const exportData = useMemo(() => {
    return filteredShipments.map((item) => item.order).filter(Boolean);
  }, [filteredShipments]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED_CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered & Received
          </span>
        );
      case 'RE_ATTEMPT_SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <CalendarClock className="w-3.5 h-3.5" /> Re-Attempt Scheduled
          </span>
        );
      case 'DOORSTEP_REFUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <RotateCcw className="w-3.5 h-3.5" /> Refused (Sent to RTO)
          </span>
        );
      case 'CUSTOMER_UNREACHABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5" /> Phone Unreachable
          </span>
        );
      case 'CALL_CONNECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <PhoneCall className="w-3.5 h-3.5" /> Call In Progress
          </span>
        );
      case 'PENDING_CALL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300 animate-pulse">
            <PhoneCall className="w-3.5 h-3.5" /> Pending Call
          </span>
        );
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'order',
      header: 'Order & Date',
      render: (row: any) => (
        <div>
          <span className="font-bold text-slate-900 block text-sm">
            {row.order?.orderNumber || 'N/A'}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" />
            {row.dispatchedAt ? new Date(row.dispatchedAt).toLocaleDateString('en-IN') : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer Details',
      render: (row: any) => {
        const cust = row.order?.customer;
        return (
          <div className="space-y-0.5">
            <div className="font-semibold text-slate-900 text-sm">{cust?.fullName || 'Valued Patient'}</div>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${cust?.phoneNumber}`}
                className="text-xs font-mono text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 font-semibold"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3 h-3 text-emerald-600" />
                {cust?.phoneNumber || 'N/A'}
              </a>
              {cust?.city && (
                <span className="text-xs text-slate-400 flex items-center gap-0.5">
                  • {cust.city}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={cust?.address}>
              {cust?.address || 'Address on file'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'consignment',
      header: 'Consignment AWB',
      render: (row: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {row.trackingAwb || 'PENDING'}
            </span>
            {row.trackingAwb && (
              <button
                type="button"
                onClick={() => copyToClipboard(row.trackingAwb)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Copy AWB"
              >
                {copiedAwb === row.trackingAwb ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Truck className="w-3 h-3 text-blue-500" />
            <span>{row.courierPartner || 'Delhivery'}</span>
            {row.trackingUrl && (
              <a
                href={row.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center ml-1"
                title="Track on Courier Portal"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount & Mode',
      render: (row: any) => {
        const order = row.order;
        const isCod = order?.paymentMode === 'CASH_ON_DELIVERY';
        const total = order?.invoice?.grandTotal || order?.totalAmount || 0;
        return (
          <div>
            <div className="font-bold text-slate-900 text-sm">
              ₹{Number(total).toLocaleString('en-IN')}
            </div>
            <div className="mt-0.5">
              <Badge variant={isCod ? 'warning' : 'success'} className="text-[10px] font-semibold">
                {isCod ? 'COD' : 'PREPAID'}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      key: 'callingStatus',
      header: 'Calling Status',
      render: (row: any) => (
        <div className="space-y-1">
          <div>{renderStatusBadge(row.ofdCallStatus)}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>Calls: {row.ofdCallAttempts || 0}</span>
            {row.ofdLastCalledAt && (
              <span>• Last: {new Date(row.ofdLastCalledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          {row.ofdRescheduleDate && (
            <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Next Re-Attempt: {new Date(row.ofdRescheduleDate).toLocaleDateString('en-IN')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => setCallingShipment(row)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Client</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setInspectingShipment(row)}
            className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
            title="Inspect Consignment"
          >
            <Eye className="w-4 h-4" />
          </Button>

          {row.ofdCallStatus === 'DOORSTEP_REFUSED' && (
            <Link
              href="/management/returns"
              className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
              title="View in Return & RTO Desk"
            >
              <RotateCcw className="w-4 h-4" />
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                OFD & Delivery Confirmation Desk (COF)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Doorstep customer calling desk for out-for-delivery shipments. Verify parcel receipt, settle COD cash, schedule re-attempts, or route doorstep refusals to RTO.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ImportButton mode="orders" onImportSuccess={refreshAll} />
          <ExportButton
            data={exportData}
            fileName={`OFD_Calling_Consignments_${activeTab}`}
            columns={OFFICIAL_SALES_ORDERS_EXPORT_COLUMNS}
          />
          <Button
            variant="outline"
            onClick={refreshAll}
            className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Today's OFD */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Out For Delivery</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalOfd || 0}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>Dispatched to customer hubs</span>
          </div>
        </div>

        {/* Card 2: Confirmed Delivered */}
        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Delivered</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{stats.confirmedDelivered || 0}</div>
          <div className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{stats.confirmationRate || 0}% Confirmation Rate</span>
          </div>
        </div>

        {/* Card 3: COD Collected */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">COD Collected</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            ₹{Number(stats.totalCodCollected || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">Cash verified at doorstep</div>
        </div>

        {/* Card 4: Re-Attempts */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Re-Attempts</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-700">{stats.rescheduled || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Customer rescheduled</div>
        </div>

        {/* Card 5: Refused / RTO */}
        <div className="bg-white rounded-xl border border-red-200 bg-red-50/20 p-4 shadow-sm">
          <div className="flex items-center justify-between text-red-800 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Doorstep Refusals</span>
            <div className="p-1.5 bg-red-100 text-red-700 rounded-lg">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-red-700">{stats.refused || 0}</div>
          <div className="text-xs text-red-600 mt-1 font-medium">Sent to Return & RTO Desk</div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('QUEUE')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'QUEUE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>Active Calling Queue</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[11px]">
                {shipments.filter((s) => !['DELIVERED_CONFIRMED', 'DOORSTEP_REFUSED', 'RE_ATTEMPT_SCHEDULED'].includes(s.ofdCallStatus)).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('CONFIRMED')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'CONFIRMED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Delivered & Picked</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[11px]">
                {shipments.filter((s) => s.ofdCallStatus === 'DELIVERED_CONFIRMED').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ISSUES')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'ISSUES'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rescheduled & Refusals</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[11px]">
                {shipments.filter((s) => ['RE_ATTEMPT_SCHEDULED', 'DOORSTEP_REFUSED'].includes(s.ofdCallStatus)).length}
              </span>
            </button>
          </div>

          {/* Quick Stats in tab bar */}
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredShipments.length}</strong> consignments
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone, order number, tracking AWB or city..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={courierFilter}
                onChange={(e) => setCourierFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-slate-700"
              >
                <option value="ALL">All Couriers</option>
                <option value="Delhivery">Delhivery</option>
                <option value="India Post">India Post</option>
                <option value="DTDC">DTDC</option>
                <option value="Blue Dart">Blue Dart</option>
                <option value="Ekart">Ekart</option>
                <option value="Shadowfax">Shadowfax</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DataTable
          columns={columns}
          data={filteredShipments}
          isLoading={isLoading}
          emptyMessage="No shipments found in this calling queue."
        />
      </div>

      {/* OFD Calling Modal */}
      <OFDCallingModal
        isOpen={Boolean(callingShipment)}
        onClose={() => setCallingShipment(null)}
        shipment={callingShipment}
        onSuccess={() => {
          setSuccessMsg('Call disposition logged and order status updated successfully!');
          refreshAll();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />

      {/* Inspection Drawer */}
      <Drawer
        isOpen={Boolean(inspectingShipment)}
        onClose={() => setInspectingShipment(null)}
        title="Consignment Dossier & Audit"
        subtitle={`AWB: ${inspectingShipment?.trackingAwb || 'N/A'} • Order #${inspectingShipment?.order?.orderNumber || 'N/A'}`}
        width="2xl"
      >
        {inspectingShipment && (
          <div className="space-y-5 text-sm">
            {/* Top Status & Call Action */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Current Call Status</span>
                <div className="mt-1">{renderStatusBadge(inspectingShipment.ofdCallStatus)}</div>
              </div>
              <Button
                onClick={() => {
                  const s = inspectingShipment;
                  setInspectingShipment(null);
                  setCallingShipment(s);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Customer Now</span>
              </Button>
            </div>

            {/* Patient Card */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-base">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                {inspectingShipment.order?.customer?.fullName || 'Patient'}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block">Phone</span>
                  <a
                    href={`tel:${inspectingShipment.order?.customer?.phoneNumber}`}
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    {inspectingShipment.order?.customer?.phoneNumber || 'N/A'}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block">Alternate Phone</span>
                  <span className="font-medium text-slate-700">
                    {inspectingShipment.order?.customer?.alternatePhone || 'None'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">Delivery Address</span>
                  <span className="text-slate-800 font-medium">
                    {inspectingShipment.order?.customer?.address || 'N/A'},{' '}
                    {inspectingShipment.order?.customer?.city}, {inspectingShipment.order?.customer?.state} -{' '}
                    {inspectingShipment.order?.customer?.pincode}
                  </span>
                </div>
              </div>
            </div>

            {/* Prescribed Formulations */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                Prescribed Medicines
              </h4>
              <div className="divide-y divide-slate-100">
                {inspectingShipment.order?.items?.map((item: any, idx: number) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {item.product?.name || 'Ayurvedic Formula'}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        SKU: {item.product?.sku || 'N/A'}
                      </span>
                    </div>
                    <span className="font-bold text-slate-700">Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calling Dossier & Remarks */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Calling History & Operational Log
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Call Attempts</span>
                  <span className="font-bold text-slate-800">{inspectingShipment.ofdCallAttempts || 0}</span>
                </div>
                {inspectingShipment.ofdLastCalledAt && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Last Called At</span>
                    <span className="font-medium text-slate-800">
                      {new Date(inspectingShipment.ofdLastCalledAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {inspectingShipment.ofdCustomerReason && (
                  <div className="py-1 border-b border-slate-100">
                    <span className="text-slate-500 block mb-0.5">Customer Reason / Remarks:</span>
                    <span className="font-medium text-slate-800 bg-slate-50 p-2 rounded block">
                      {inspectingShipment.ofdCustomerReason}
                    </span>
                  </div>
                )}
                {inspectingShipment.ofdCallNotes && (
                  <div className="py-1">
                    <span className="text-slate-500 block mb-0.5">Staff Internal Notes:</span>
                    <span className="text-slate-700 italic bg-slate-50 p-2 rounded block">
                      {inspectingShipment.ofdCallNotes}
                    </span>
                  </div>
                )}
                {inspectingShipment.codAmountCollected && (
                  <div className="flex justify-between py-1 border-t border-slate-100">
                    <span className="text-emerald-700 font-semibold">COD Amount Collected</span>
                    <span className="font-extrabold text-emerald-800">
                      ₹{Number(inspectingShipment.codAmountCollected).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
