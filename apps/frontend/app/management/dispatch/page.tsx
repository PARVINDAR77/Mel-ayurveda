'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { Drawer } from '../../../components/ui/drawer';
import {
  Truck,
  PlusCircle,
  RefreshCw,
  ExternalLink,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Package,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Send,
  Search,
  Filter,
  Eye,
  Copy,
  Check,
  FileText,
  History,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

export default function CourierDispatchPage() {
  // Main view tab: 'READY' = Orders Awaiting Dispatch, 'HISTORY' = Dispatch History & Consignments
  const [activeViewTab, setActiveViewTab] = useState<'READY' | 'HISTORY'>('READY');

  const [shipments, setShipments] = useState<any[]>([]);
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [historyCourierFilter, setHistoryCourierFilter] = useState<string>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [readySearchQuery, setReadySearchQuery] = useState('');

  const [isLoadingShipments, setIsLoadingShipments] = useState(true);
  const [isLoadingReady, setIsLoadingReady] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);

  // Manifest Consignment Modal state
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [courierPartner, setCourierPartner] = useState('Delhivery');
  const [trackingAwb, setTrackingAwb] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [isManifesting, setIsManifesting] = useState(false);

  // Update Status Modal state
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<'IN_TRANSIT' | 'DELIVERED' | 'RTO'>('IN_TRANSIT');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Inspect Consignment Drawer state
  const [inspectingShipment, setInspectingShipment] = useState<any | null>(null);

  const fetchReadyOrders = async () => {
    try {
      setIsLoadingReady(true);
      const res = await apiClient.get('/dispatch/ready-orders');
      setReadyOrders(res.data || []);
    } catch (err: any) {
      // Quiet fail if network hiccups
    } finally {
      setIsLoadingReady(false);
    }
  };

  const fetchShipments = async () => {
    try {
      setIsLoadingShipments(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      params.append('limit', '100');

      const res = await apiClient.get(`/dispatch?${params.toString()}`);
      setShipments(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingShipments(false);
    }
  };

  const refreshAll = () => {
    fetchReadyOrders();
    fetchShipments();
  };

  useEffect(() => {
    fetchReadyOrders();
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [statusFilter]);

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAwb(text);
      setTimeout(() => setCopiedAwb(null), 2200);
    }
  };

  const openManifestForOrder = (order: any) => {
    setSelectedOrderId(order.id);
    const randomAwb = `AWB-${Math.floor(100000000 + Math.random() * 900000000)}`;
    setTrackingAwb(randomAwb);
    setCourierPartner('Delhivery');
    setTrackingUrl(`https://track.delhivery.com/?awb=${randomAwb}`);
    setIsManifestModalOpen(true);
  };

  const openGeneralManifestModal = () => {
    if (readyOrders.length > 0) {
      openManifestForOrder(readyOrders[0]);
    } else {
      setSelectedOrderId('');
      const randomAwb = `AWB-${Math.floor(100000000 + Math.random() * 900000000)}`;
      setTrackingAwb(randomAwb);
      setCourierPartner('Delhivery');
      setTrackingUrl(`https://track.delhivery.com/?awb=${randomAwb}`);
      setIsManifestModalOpen(true);
    }
  };

  const handleManifestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;

    try {
      setIsManifesting(true);
      setError(null);
      const res = await apiClient.post(`/dispatch/${selectedOrderId}`, {
        courierPartner,
        trackingAwb: trackingAwb.trim().toUpperCase(),
        trackingUrl: trackingUrl.trim() || undefined,
      });

      setSuccessMsg(
        `Consignment manifested with ${courierPartner} (AWB: ${res.data?.trackingAwb}). Order moved to SHIPPED.`,
      );
      setIsManifestModalOpen(false);
      refreshAll();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsManifesting(false);
    }
  };

  const openUpdateStatusModal = (shipment: any) => {
    setSelectedShipment(shipment);
    setNewStatus('DELIVERED');
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    try {
      setIsUpdatingStatus(true);
      setError(null);
      await apiClient.patch(`/dispatch/${selectedShipment.id}/status`, {
        status: newStatus,
      });

      setSuccessMsg(
        `Shipment ${selectedShipment.trackingAwb} updated to ${newStatus}. Order status & inventory synchronized.`,
      );
      setSelectedShipment(null);
      if (inspectingShipment && inspectingShipment.id === selectedShipment.id) {
        setInspectingShipment({ ...inspectingShipment, status: newStatus });
      }
      refreshAll();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getCourierBadge = (courier: string) => {
    switch (courier) {
      case 'Delhivery':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-bold">
            Delhivery Express
          </span>
        );
      case 'BlueDart':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-bold">
            Blue Dart Apex
          </span>
        );
      case 'DTDC':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
            DTDC Courier
          </span>
        );
      case 'India Post':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-bold">
            India Post
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">
            {courier || 'Standard Courier'}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MANIFESTED':
        return <Badge variant="info">MANIFESTED</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="warning">IN TRANSIT</Badge>;
      case 'DELIVERED':
        return <Badge variant="success">DELIVERED</Badge>;
      case 'RTO':
        return <Badge variant="danger">RTO / RETURNED</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  // Filtered Ready Orders
  const filteredReadyOrders = useMemo(() => {
    if (!readySearchQuery.trim()) return readyOrders;
    const q = readySearchQuery.toLowerCase();
    return readyOrders.filter((ord) => {
      const orderNum = (ord.orderNumber || '').toLowerCase();
      const name = (ord.customer?.fullName || '').toLowerCase();
      const phone = (ord.customer?.phoneNumber || '').toLowerCase();
      const city = (ord.customer?.city || '').toLowerCase();
      const state = (ord.customer?.state || '').toLowerCase();
      return (
        orderNum.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        city.includes(q) ||
        state.includes(q)
      );
    });
  }, [readyOrders, readySearchQuery]);

  // Filtered Dispatch History Shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      // Courier filter
      if (historyCourierFilter !== 'ALL' && item.courierPartner !== historyCourierFilter) {
        return false;
      }
      // Search query filter
      if (!historySearchQuery.trim()) return true;
      const q = historySearchQuery.toLowerCase();
      const awb = (item.trackingAwb || '').toLowerCase();
      const courier = (item.courierPartner || '').toLowerCase();
      const orderNum = (item.order?.orderNumber || '').toLowerCase();
      const invNum = (item.order?.invoice?.invoiceNumber || '').toLowerCase();
      const customerName = (item.order?.customer?.fullName || '').toLowerCase();
      const phone = (item.order?.customer?.phoneNumber || '').toLowerCase();
      const city = (item.order?.customer?.city || '').toLowerCase();
      const state = (item.order?.customer?.state || '').toLowerCase();

      return (
        awb.includes(q) ||
        courier.includes(q) ||
        orderNum.includes(q) ||
        invNum.includes(q) ||
        customerName.includes(q) ||
        phone.includes(q) ||
        city.includes(q) ||
        state.includes(q)
      );
    });
  }, [shipments, historyCourierFilter, historySearchQuery]);

  // History shipment columns
  const shipmentColumns: Column<any>[] = [
    {
      key: 'trackingAwb',
      header: 'AWB & Courier Logistics',
      render: (item) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              {item.trackingAwb}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(item.trackingAwb);
              }}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
              title="Copy AWB Tracking Number"
            >
              {copiedAwb === item.trackingAwb ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
            {item.trackingUrl && (
              <a
                href={item.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-forest-700 hover:text-forest-900 hover:underline bg-forest-50 px-1.5 py-0.5 rounded border border-forest-200"
                title="Track Parcel on Courier Network"
              >
                <span>Track</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
          <div>{getCourierBadge(item.courierPartner)}</div>
        </div>
      ),
    },
    {
      key: 'orderNumber',
      header: 'Order & Invoice Reference',
      render: (item) => (
        <div className="space-y-0.5">
          <span className="font-mono font-bold text-slate-900 text-xs block">
            {item.order?.orderNumber}
          </span>
          {item.order?.invoice?.invoiceNumber ? (
            <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 block w-fit">
              Tax Inv: {item.order.invoice.invoiceNumber}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-slate-400 block">Inv: Standard</span>
          )}
          <span className="text-[11px] font-semibold text-slate-600 block">
            ₹{Number(item.order?.totalAmount || 0).toFixed(2)} •{' '}
            {item.order?.paymentMode === 'CASH_ON_DELIVERY' ? 'COD' : 'PREPAID'}
          </span>
        </div>
      ),
    },
    {
      key: 'destination',
      header: 'Recipient & Destination',
      render: (item) => (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 text-xs block">
            {item.order?.customer?.fullName || 'Customer'}
          </span>
          {item.order?.customer?.phoneNumber && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
              <Phone className="h-3 w-3 text-slate-400" />
              {item.order.customer.phoneNumber}
            </span>
          )}
          <span
            className="text-[10px] text-slate-500 block truncate max-w-[200px]"
            title={
              [
                item.order?.customer?.address,
                item.order?.customer?.city,
                item.order?.customer?.state,
                item.order?.customer?.pincode,
              ]
                .filter(Boolean)
                .join(', ') || 'Gujarat'
            }
          >
            {[item.order?.customer?.city, item.order?.customer?.state]
              .filter(Boolean)
              .join(', ') || 'Gujarat'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Delivery Status',
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: 'timestamps',
      header: 'Dispatch & Delivery Timeline',
      render: (item) => (
        <div className="text-xs text-slate-600 font-mono space-y-1">
          <div className="flex items-center gap-1 text-slate-500">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span>Shipped: {new Date(item.dispatchedAt || item.createdAt).toLocaleDateString()}</span>
          </div>
          {item.deliveredAt ? (
            <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Delivered: {new Date(item.deliveredAt).toLocaleDateString()}</span>
            </div>
          ) : (
            <span className="text-[10px] text-amber-600 block font-medium">In Transit</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Consignment Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInspectingShipment(item)}
            icon={<Eye className="h-3 w-3" />}
            title="Inspect Full Consignment Details"
          >
            Inspect
          </Button>
          {item.status !== 'DELIVERED' && item.status !== 'RTO' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openUpdateStatusModal(item)}
              icon={<Truck className="h-3 w-3" />}
              title="Update Transit / Delivery Status"
            >
              Update
            </Button>
          )}
          {item.status === 'RTO' && (
            <Link href="/management/returns">
              <Button
                variant="outline"
                size="sm"
                icon={<RotateCcw className="h-3 w-3" />}
                className="border-red-300 text-red-700 hover:bg-red-50"
                title="View in Returns & RTO Desk"
              >
                Return File
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-forest-800 uppercase tracking-widest">
              MEL-MGT-001
            </span>
            <Badge variant="role">Courier Dispatch Operations</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Logistics & Consignment Handover
          </h2>
          <p className="text-xs text-slate-500">
            Confirmed customer formulation orders automatically queue here for packaging, courier assignment, and AWB dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/management/returns">
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Returns & RTO Desk
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            isLoading={isLoadingShipments || isLoadingReady}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openGeneralManifestModal}
            icon={<PlusCircle className="h-3.5 w-3.5" />}
          >
            Manifest Consignment
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
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
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Stat Cards (Interactive Filters) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Awaiting Dispatch */}
        <div
          onClick={() => setActiveViewTab('READY')}
          className={`cursor-pointer rounded-xl border p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            activeViewTab === 'READY'
              ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/50'
              : 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'
          }`}
          title="Click to view Orders Awaiting Dispatch"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Awaiting Dispatch
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950 font-mono">
            {readyOrders.length}
          </div>
          <p className="mt-0.5 text-[11px] text-amber-700 flex items-center justify-between">
            <span>Confirmed & waiting for courier</span>
            <ChevronRight className="h-3 w-3 opacity-60" />
          </p>
        </div>

        {/* Card 2: In Transit */}
        <div
          onClick={() => {
            setActiveViewTab('HISTORY');
            setStatusFilter('IN_TRANSIT');
          }}
          className={`cursor-pointer rounded-xl border p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            activeViewTab === 'HISTORY' && statusFilter === 'IN_TRANSIT'
              ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-400/50'
              : 'border-blue-200 bg-blue-50/60 hover:bg-blue-50'
          }`}
          title="Click to filter Dispatch History by In Transit"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              In Transit
            </span>
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-950 font-mono">
            {shipments.filter((s) => s.status === 'IN_TRANSIT' || s.status === 'MANIFESTED').length}
          </div>
          <p className="mt-0.5 text-[11px] text-blue-700 flex items-center justify-between">
            <span>On the road with courier</span>
            <ChevronRight className="h-3 w-3 opacity-60" />
          </p>
        </div>

        {/* Card 3: Delivered */}
        <div
          onClick={() => {
            setActiveViewTab('HISTORY');
            setStatusFilter('DELIVERED');
          }}
          className={`cursor-pointer rounded-xl border p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            activeViewTab === 'HISTORY' && statusFilter === 'DELIVERED'
              ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/50'
              : 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'
          }`}
          title="Click to filter Dispatch History by Delivered"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Delivered
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-950 font-mono">
            {shipments.filter((s) => s.status === 'DELIVERED').length}
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-700 flex items-center justify-between">
            <span>Fulfilled & customer delivered</span>
            <ChevronRight className="h-3 w-3 opacity-60" />
          </p>
        </div>

        {/* Card 4: Total Consignments / Dispatch History */}
        <div
          onClick={() => {
            setActiveViewTab('HISTORY');
            setStatusFilter('ALL');
          }}
          className={`cursor-pointer rounded-xl border p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            activeViewTab === 'HISTORY' && statusFilter === 'ALL'
              ? 'border-forest-600 bg-forest-50/40 ring-2 ring-forest-500/50'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
          title="Click to view All Previous Dispatch History"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Total Consignments
            </span>
            <Package className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {shipments.length}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span>All historical shipments</span>
            <ChevronRight className="h-3 w-3 opacity-60" />
          </p>
        </div>
      </div>

      {/* EXECUTIVE SEGMENTED TABS: Switch between Awaiting Queue and Dispatch History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 flex flex-wrap items-center gap-1.5 md:gap-2 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveViewTab('READY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeViewTab === 'READY'
                ? 'bg-forest-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Orders Awaiting Dispatch</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeViewTab === 'READY'
                  ? 'bg-forest-800 text-forest-100'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {readyOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeViewTab === 'HISTORY'
                ? 'bg-forest-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Dispatch History & Consignments</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeViewTab === 'HISTORY'
                  ? 'bg-forest-800 text-forest-100'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {shipments.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {activeViewTab === 'READY' ? (
            <span>Showing confirmed orders awaiting physical dispatch</span>
          ) : (
            <span>Audited log of previously dispatched consignments</span>
          )}
        </div>
      </div>

      {/* VIEW 1: ORDERS AWAITING DISPATCH */}
      {activeViewTab === 'READY' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Orders Ready for Courier Dispatch</span>
                  {readyOrders.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      {readyOrders.length} Pending
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Orders confirmed by Management or Super Admin that need physical packaging and courier handover.
                </p>
              </div>
            </div>

            {/* Ready Orders Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search pending orders..."
                value={readySearchQuery}
                onChange={(e) => setReadySearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-forest-600"
              />
            </div>
          </div>

          {isLoadingReady ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-forest-700" />
              <span>Loading confirmed orders queue...</span>
            </div>
          ) : filteredReadyOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-800">
                {readyOrders.length === 0
                  ? 'All confirmed orders have been dispatched!'
                  : 'No orders match your search query.'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {readyOrders.length === 0
                  ? 'When an order is approved and invoiced, it will automatically queue here for courier packaging and dispatch.'
                  : 'Try clearing your search keyword to view all pending orders.'}
              </p>
              {readyOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReadySearchQuery('')}
                  className="mt-3 text-xs font-bold text-forest-700 hover:underline"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto divide-y divide-slate-100">
              {filteredReadyOrders.map((ord: any) => {
                const customer = ord.customer;
                const addressStr = [customer?.address, customer?.city, customer?.state, customer?.pincode]
                  .filter(Boolean)
                  .join(', ');

                return (
                  <div
                    key={ord.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          {ord.orderNumber}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          Confirmed: {new Date(ord.updatedAt || ord.createdAt).toLocaleDateString()}
                        </span>
                        <Badge variant="success" className="text-[10px] py-0">
                          CONFIRMED
                        </Badge>
                        {ord.invoice?.invoiceNumber && (
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            Inv: {ord.invoice.invoiceNumber}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded">
                          {ord.paymentMode === 'CASH_ON_DELIVERY' ? 'COD' : 'PREPAID'} • ₹
                          {Number(ord.totalAmount).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-700 font-medium">
                        <span className="font-bold text-slate-900">{customer?.fullName}</span>
                        {customer?.phoneNumber && (
                          <span className="flex items-center gap-1 text-slate-500 text-[11px] font-mono">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {customer.phoneNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-1 text-[11px] text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <span className="line-clamp-1">{addressStr || 'Gujarat, India'}</span>
                      </div>

                      <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-700">Prescription Medicines: </span>
                        {ord.items && ord.items.length > 0 ? (
                          ord.items.map((it: any) => `${it.product?.name} (Qty: ${it.quantity})`).join(', ')
                        ) : (
                          'Standard Ayurvedic Formulation'
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openManifestForOrder(ord)}
                        icon={<Truck className="h-3.5 w-3.5" />}
                      >
                        Dispatch Parcel
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: HISTORICAL DISPATCH & COURIER MANIFESTS */}
      {activeViewTab === 'HISTORY' && (
        <div className="space-y-4">
          {/* Dispatch History Header & Search / Filter Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="h-4 w-4 text-forest-700" />
                  <span>Consignment Dispatch History & Live Tracking</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Complete historical record of dispatched consignments, AWB tracking numbers, courier logistics, and proof of delivery.
                </p>
              </div>

              {/* Status Filter Tabs (no-scrollbar applied) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto no-scrollbar w-fit">
                {[
                  { id: 'ALL', label: 'All Records' },
                  { id: 'IN_TRANSIT', label: 'In Transit' },
                  { id: 'DELIVERED', label: 'Delivered' },
                  { id: 'MANIFESTED', label: 'Manifested' },
                  { id: 'RTO', label: 'RTO' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition ${
                      statusFilter === st.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Controls Row: Search Input + Courier Partner Selector */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by AWB code, Order #, Customer Name, Phone, or Courier..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-forest-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-[11px] font-bold text-slate-600 shrink-0">Logistics Partner:</label>
                <select
                  value={historyCourierFilter}
                  onChange={(e) => setHistoryCourierFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-forest-600"
                >
                  <option value="ALL">All Couriers</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="BlueDart">Blue Dart</option>
                  <option value="DTDC">DTDC</option>
                  <option value="India Post">India Post</option>
                </select>

                {(historySearchQuery || historyCourierFilter !== 'ALL' || statusFilter !== 'ALL') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHistorySearchQuery('');
                      setHistoryCourierFilter('ALL');
                      setStatusFilter('ALL');
                    }}
                    icon={<RotateCcw className="h-3 w-3" />}
                    title="Reset all filters"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Historical Shipments DataTable */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <DataTable
              columns={shipmentColumns}
              data={filteredShipments}
              isLoading={isLoadingShipments}
              emptyMessage={
                historySearchQuery || historyCourierFilter !== 'ALL'
                  ? 'No historical consignments match your search query.'
                  : 'No courier consignments manifested yet.'
              }
            />
          </div>
        </div>
      )}

      {/* CONSIGNMENT INSPECTION DRAWER */}
      <Drawer
        isOpen={!!inspectingShipment}
        onClose={() => setInspectingShipment(null)}
        title="Consignment Dispatch Details"
        subtitle={`AWB: ${inspectingShipment?.trackingAwb} • ${inspectingShipment?.courierPartner}`}
        width="xl"
      >
        {inspectingShipment && (
          <div className="p-6 space-y-6 text-xs">
            {/* Courier & Transit Status Banner */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Logistics Carrier
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    {getCourierBadge(inspectingShipment.courierPartner)}
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {inspectingShipment.trackingAwb}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inspectingShipment.trackingAwb)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded"
                      title="Copy AWB Number"
                    >
                      {copiedAwb === inspectingShipment.trackingAwb ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Transit State
                  </span>
                  {getStatusBadge(inspectingShipment.status)}
                </div>
              </div>

              {inspectingShipment.trackingUrl && (
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">Online Tracking Portal</span>
                  <a
                    href={inspectingShipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 hover:text-forest-900 bg-forest-50 hover:bg-forest-100 px-3 py-1 rounded-lg border border-forest-200 transition"
                  >
                    <span>Track on {inspectingShipment.courierPartner}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Destination Customer Info */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-forest-700" />
                <span>Recipient & Delivery Destination</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Customer Name</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {inspectingShipment.order?.customer?.fullName || 'Valued Customer'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Contact Phone</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {inspectingShipment.order?.customer?.phoneNumber || 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block">Shipping Address</span>
                  <span className="text-slate-700 text-xs leading-relaxed">
                    {[
                      inspectingShipment.order?.customer?.address,
                      inspectingShipment.order?.customer?.city,
                      inspectingShipment.order?.customer?.state,
                      inspectingShipment.order?.customer?.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Gujarat, India'}
                  </span>
                </div>
              </div>
            </div>

            {/* Order & Invoicing Information */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-forest-700" />
                <span>Order & Commercial Invoice</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Order Reference</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {inspectingShipment.order?.orderNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">GST Tax Invoice</span>
                  <span className="font-mono font-bold text-emerald-800 text-xs">
                    {inspectingShipment.order?.invoice?.invoiceNumber || 'Standard Invoice'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Payment Method</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {inspectingShipment.order?.paymentMode === 'CASH_ON_DELIVERY' ? 'Cash on Delivery (COD)' : 'Prepaid Online'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Amount</span>
                  <span className="font-mono font-bold text-forest-800 text-xs">
                    ₹{Number(inspectingShipment.order?.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ayurvedic Formulations Shipped */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-forest-700" />
                <span>Consignment Items & Prescription</span>
              </h4>
              {inspectingShipment.order?.items && inspectingShipment.order?.items.length > 0 ? (
                <div className="divide-y divide-slate-100 pt-1">
                  {inspectingShipment.order.items.map((it: any, idx: number) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">{it.product?.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{it.product?.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 text-xs">Qty: {it.quantity}</span>
                        {it.unitPrice && (
                          <span className="block font-mono text-[10px] text-slate-500">
                            ₹{Number(it.unitPrice).toFixed(2)} ea
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic pt-1">
                  Prescription Ayurvedic formulations dispatched per order specifications.
                </p>
              )}
            </div>

            {/* Lifecycle Timestamps */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Manifested & Dispatched:</span>
                <span className="font-mono font-bold text-slate-800">
                  {new Date(inspectingShipment.dispatchedAt || inspectingShipment.createdAt).toLocaleString()}
                </span>
              </div>
              {inspectingShipment.deliveredAt && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-semibold">Customer Delivered:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {new Date(inspectingShipment.deliveredAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Actions inside Drawer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingShipment(null)}
              >
                Close Drawer
              </Button>

              {inspectingShipment.status !== 'DELIVERED' && inspectingShipment.status !== 'RTO' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openUpdateStatusModal(inspectingShipment)}
                  icon={<Truck className="h-3.5 w-3.5" />}
                >
                  Update Delivery Status
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Manifest Consignment Modal */}
      <Modal
        isOpen={isManifestModalOpen}
        onClose={() => setIsManifestModalOpen(false)}
        title="Manifest Consignment for Dispatch"
        description="Assign courier partner and tracking AWB for this confirmed customer order."
        maxWidth="md"
      >
        <form onSubmit={handleManifestSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Confirmed Order Reference *
            </label>
            <select
              required
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              {readyOrders.map((ord: any) => (
                <option key={ord.id} value={ord.id}>
                  {ord.orderNumber} - {ord.customer?.fullName} (₹{ord.totalAmount}) •{' '}
                  {ord.customer?.city || 'Gujarat'}
                </option>
              ))}
              {readyOrders.length === 0 && (
                <option value="">No confirmed unmanifested orders available</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Logistics / Courier Partner *</label>
              <select
                value={courierPartner}
                onChange={(e) => {
                  const p = e.target.value;
                  setCourierPartner(p);
                  if (trackingAwb) {
                    if (p === 'Delhivery') setTrackingUrl(`https://track.delhivery.com/?awb=${trackingAwb}`);
                    else if (p === 'BlueDart') setTrackingUrl(`https://www.bluedart.com/tracking/?awb=${trackingAwb}`);
                    else if (p === 'DTDC') setTrackingUrl(`https://www.dtdc.in/tracking/?awb=${trackingAwb}`);
                    else setTrackingUrl(`https://track.melayurveda.com/?awb=${trackingAwb}`);
                  }
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              >
                <option value="Delhivery">Delhivery Express</option>
                <option value="BlueDart">Blue Dart Apex</option>
                <option value="DTDC">DTDC Courier</option>
                <option value="India Post">India Post Speed Post</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">AWB Tracking Code *</label>
              <input
                type="text"
                required
                value={trackingAwb}
                onChange={(e) => {
                  const val = e.target.value;
                  setTrackingAwb(val);
                  if (courierPartner === 'Delhivery') setTrackingUrl(`https://track.delhivery.com/?awb=${val}`);
                  else if (courierPartner === 'BlueDart') setTrackingUrl(`https://www.bluedart.com/tracking/?awb=${val}`);
                  else if (courierPartner === 'DTDC') setTrackingUrl(`https://www.dtdc.in/tracking/?awb=${val}`);
                  else setTrackingUrl(`https://track.melayurveda.com/?awb=${val}`);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tracking URL (Public Customer Link)</label>
            <input
              type="url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsManifestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isManifesting}
              icon={<Send className="h-3 w-3" />}
            >
              Manifest & Dispatch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Consignment Status Modal */}
      <Modal
        isOpen={!!selectedShipment}
        onClose={() => setSelectedShipment(null)}
        title="Update Consignment Delivery Status"
        description={`Consignment ${selectedShipment?.trackingAwb} (${selectedShipment?.courierPartner})`}
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Next Tracking Status *</label>
            <select
              value={newStatus}
              onChange={(e: any) => setNewStatus(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              <option value="IN_TRANSIT">IN_TRANSIT - In transit through hub</option>
              <option value="DELIVERED">
                DELIVERED - Successfully delivered to customer (Fulfills order & payment)
              </option>
              <option value="RTO">
                RTO - Return to Origin / Refused (Restocks reserved warehouse stock)
              </option>
            </select>
          </div>

          <div
            className={`p-2.5 rounded-lg border text-[11px] ${
              newStatus === 'DELIVERED'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : newStatus === 'RTO'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {newStatus === 'DELIVERED' && (
              <p>
                <strong>Order Fulfillment:</strong> Marking DELIVERED advances Order to DELIVERED,
                marks payment as COMPLETED (for COD or Online), and atomically fulfills reserved inventory.
              </p>
            )}
            {newStatus === 'RTO' && (
              <p>
                <strong>Return to Origin:</strong> Marking RTO will release reserved inventory back to
                warehouse available stock.
              </p>
            )}
            {newStatus === 'IN_TRANSIT' && (
              <p>
                <strong>In Transit:</strong> Shipment is currently moving between logistics hubs.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedShipment(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingStatus}>
              Save Status
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
