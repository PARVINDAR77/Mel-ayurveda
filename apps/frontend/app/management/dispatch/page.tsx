'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
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
} from 'lucide-react';

export default function CourierDispatchPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoadingShipments, setIsLoadingShipments] = useState(true);
  const [isLoadingReady, setIsLoadingReady] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

      setSuccessMsg(`Consignment manifested with ${courierPartner} (AWB: ${res.data?.trackingAwb}). Order moved to SHIPPED.`);
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

      setSuccessMsg(`Shipment ${selectedShipment.trackingAwb} updated to ${newStatus}. Order status & inventory synchronized.`);
      setSelectedShipment(null);
      fetchShipments();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const shipmentColumns: Column<any>[] = [
    {
      key: 'trackingAwb',
      header: 'AWB Tracking Number',
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {item.trackingAwb}
          </span>
          {item.trackingUrl && (
            <a
              href={item.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-forest-700 hover:text-forest-900 ml-1.5 align-middle"
              title="Track Package on Courier Portal"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'courierPartner',
      header: 'Logistics Partner',
      render: (item) => (
        <span className="font-semibold text-slate-800 text-xs">{item.courierPartner}</span>
      ),
    },
    {
      key: 'orderNumber',
      header: 'Order Reference',
      render: (item) => (
        <span className="font-mono font-semibold text-slate-700 text-xs">
          {item.order?.orderNumber}
        </span>
      ),
    },
    {
      key: 'destination',
      header: 'Destination & Customer',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.order?.customer?.fullName}</span>
          <span className="block font-mono text-[10px] text-slate-400">
            {[item.order?.customer?.city, item.order?.customer?.state].filter(Boolean).join(', ') || 'Gujarat'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Consignment Status',
      render: (item) => {
        let variant: any = 'slate';
        if (item.status === 'MANIFESTED') variant = 'info';
        else if (item.status === 'IN_TRANSIT') variant = 'warning';
        else if (item.status === 'DELIVERED') variant = 'success';
        else if (item.status === 'RTO') variant = 'danger';

        return <Badge variant={variant}>{item.status}</Badge>;
      },
    },
    {
      key: 'timestamps',
      header: 'Dispatch & Delivery',
      render: (item) => (
        <div className="text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span>Shipped: {new Date(item.dispatchedAt || item.createdAt).toLocaleDateString()}</span>
          </div>
          {item.deliveredAt && (
            <span className="text-[10px] text-emerald-700 block font-semibold">
              Delivered: {new Date(item.deliveredAt).toLocaleDateString()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => {
        if (item.status === 'DELIVERED' || item.status === 'RTO') {
          return (
            <span className="text-[11px] text-slate-400 font-mono">Consignment Closed</span>
          );
        }

        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openUpdateStatusModal(item)}
            icon={<Truck className="h-3 w-3" />}
          >
            Update Status
          </Button>
        );
      },
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

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Awaiting Dispatch</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950 font-mono">
            {readyOrders.length}
          </div>
          <p className="mt-0.5 text-[11px] text-amber-700">Confirmed & waiting for courier</p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">In Transit</span>
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-950 font-mono">
            {shipments.filter((s) => s.status === 'IN_TRANSIT' || s.status === 'MANIFESTED').length}
          </div>
          <p className="mt-0.5 text-[11px] text-blue-700">On the road with courier</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-950 font-mono">
            {shipments.filter((s) => s.status === 'DELIVERED').length}
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-700">Fulfilled & customer delivered</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Consignments</span>
            <Package className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {shipments.length}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">All historical shipments</p>
        </div>
      </div>

      {/* SECTION 1: Confirmed Orders Ready for Dispatch */}
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
        </div>

        {isLoadingReady ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading ready orders...</div>
        ) : readyOrders.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2 opacity-80" />
            <p className="text-xs font-bold text-slate-700">All confirmed orders have been dispatched!</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              When an order is confirmed in Formulation Orders, it will automatically queue here for dispatch.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto divide-y divide-slate-100">
            {readyOrders.map((ord: any) => {
              const customer = ord.customer;
              const addressStr = [customer?.address, customer?.city, customer?.state, customer?.pincode]
                .filter(Boolean)
                .join(', ');

              return (
                <div key={ord.id} className="p-4 hover:bg-slate-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Confirmed: {new Date(ord.updatedAt || ord.createdAt).toLocaleDateString()}
                      </span>
                      <Badge variant="success" className="text-[10px] py-0">CONFIRMED</Badge>
                      <span className="text-[11px] font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded">
                        {ord.paymentMode === 'CASH_ON_DELIVERY' ? 'COD' : 'PREPAID'} • ₹{Number(ord.totalAmount).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-700 font-medium">
                      <span className="font-bold text-slate-900">{customer?.fullName}</span>
                      {customer?.phoneNumber && (
                        <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                          <Phone className="h-3 w-3" />
                          {customer.phoneNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-1 text-[11px] text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                      <span className="line-clamp-1">{addressStr || 'Gujarat, India'}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700">Prescription Medicines: </span>
                      {ord.items && ord.items.length > 0 ? (
                        ord.items.map((it: any) => `${it.product?.name} (Qty: ${it.quantity})`).join(', ')
                      ) : (
                        'Standard Formulation'
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

      {/* SECTION 2: Manifested Consignments & Tracking */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Manifested Consignments & Tracking</h3>
            <p className="text-xs text-slate-500">Real-time parcel transit status across courier networks.</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs w-fit">
            {['ALL', 'MANIFESTED', 'IN_TRANSIT', 'DELIVERED', 'RTO'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md font-semibold transition ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Shipments DataTable */}
        <DataTable
          columns={shipmentColumns}
          data={shipments}
          isLoading={isLoadingShipments}
          emptyMessage="No courier consignments manifested yet."
        />
      </div>

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
                  setTrackingUrl(`https://track.delhivery.com/?awb=${val}`);
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
            <Button type="submit" variant="primary" size="sm" isLoading={isManifesting} icon={<Send className="h-3 w-3" />}>
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
