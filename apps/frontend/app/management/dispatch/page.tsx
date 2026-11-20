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
  Search,
  ExternalLink,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Package,
  RotateCcw,
} from 'lucide-react';

export default function CourierDispatchPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manifest Consignment Modal state
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [courierPartner, setCourierPartner] = useState('Delhivery');
  const [trackingAwb, setTrackingAwb] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [isManifesting, setIsManifesting] = useState(false);

  // Update Status Modal state
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<'IN_TRANSIT' | 'DELIVERED' | 'RTO'>('IN_TRANSIT');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchShipments = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [statusFilter]);

  const openManifestModal = async () => {
    setIsManifestModalOpen(true);
    setLoadingOrders(true);
    try {
      const res = await apiClient.get('/orders?status=CONFIRMED&limit=50');
      const unmanifested = (res.data?.data || res.data || []).filter((o: any) => !o.shipment);
      setPendingOrders(unmanifested);
      if (unmanifested.length > 0) {
        setSelectedOrderId(unmanifested[0].id);
      }
      const randomAwb = `AWB-${Math.floor(100000000 + Math.random() * 900000000)}`;
      setTrackingAwb(randomAwb);
      setTrackingUrl(`https://track.melayurveda.com/?awb=${randomAwb}`);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingOrders(false);
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

      setSuccessMsg(`Consignment manifested with ${courierPartner} (AWB: ${res.data?.trackingAwb}). Order marked SHIPPED.`);
      setIsManifestModalOpen(false);
      fetchShipments();
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

  const columns: Column<any>[] = [
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
            <span>Shipped: {new Date(item.shippedAt || item.createdAt).toLocaleDateString()}</span>
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
            <Badge variant="role">Courier Dispatch</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Logistics & Consignment Tracking Integration
          </h2>
          <p className="text-xs text-slate-500">
            Assign courier partners (Delhivery, BlueDart, DTDC, India Post), generate AWB tracking manifests, and fulfill order delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchShipments}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openManifestModal}
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

      {/* Shipments DataTable */}
      <DataTable
        columns={columns}
        data={shipments}
        isLoading={isLoading}
        emptyMessage="No courier consignments manifested yet."
      />

      {/* Manifest Consignment Modal */}
      <Modal
        isOpen={isManifestModalOpen}
        onClose={() => setIsManifestModalOpen(false)}
        title="Manifest Consignment for Dispatch"
        description="Select a CONFIRMED order and assign courier partner with AWB tracking."
        maxWidth="md"
      >
        <form onSubmit={handleManifestSubmit} className="space-y-4 text-xs">
          {loadingOrders ? (
            <div className="py-6 text-center text-slate-400">Loading confirmed orders...</div>
          ) : pendingOrders.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-amber-800">
              No confirmed unmanifested orders available. Confirm draft orders in Formulation Orders first.
            </div>
          ) : (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Confirmed Order *
                </label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                >
                  {pendingOrders.map((ord: any) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.orderNumber} - {ord.customer?.fullName} (₹{ord.totalAmount}) •{' '}
                      {ord.customer?.city || 'Gujarat'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Courier Partner *</label>
                  <select
                    value={courierPartner}
                    onChange={(e) => setCourierPartner(e.target.value)}
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
                    onChange={(e) => setTrackingAwb(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tracking URL</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
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
                <Button type="submit" variant="primary" size="sm" isLoading={isManifesting}>
                  Manifest & Dispatch
                </Button>
              </div>
            </>
          )}
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
                DELIVERED - Successfully handed to patient (Fulfills order & payment)
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
                <strong>Order Fulfillment:</strong> Marking DELIVERED will advance Order to DELIVERED,
                mark payment as COMPLETED (for COD or Online), and atomically fulfill reserved inventory.
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
