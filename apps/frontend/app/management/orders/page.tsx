'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { Drawer } from '../../../components/ui/drawer';
import { StatCard } from '../../../components/ui/stat-card';
import {
  Package,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Truck,
  Eye,
  AlertCircle,
  User,
  Clock,
  Trash2,
  Boxes,
} from 'lucide-react';

export default function FormulationOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Order Details Drawer
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Draft Order Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH_ON_DELIVERY');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number; dosage: string }>>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Cancel Order Modal state
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer requested cancellation');
  const [isCancelling, setIsCancelling] = useState(false);

  // Action Loading state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const [ordersRes, metricsRes] = await Promise.all([
        apiClient.get(`/orders?${params.toString()}`),
        apiClient.get('/orders/metrics'),
      ]);

      setOrders(ordersRes.data?.data || ordersRes.data || []);
      setMetrics(metricsRes.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const openOrderDetail = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/orders/${orderId}`);
      setOrderDetail(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setSelectedOrderId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openCreateModal = async () => {
    setIsCreateModalOpen(true);
    try {
      const [custRes, prodRes] = await Promise.all([
        apiClient.get('/customers?limit=100'),
        apiClient.get('/products?limit=100'),
      ]);
      const custs = custRes.data?.data || custRes.data || [];
      const prods = prodRes.data?.data || prodRes.data || [];
      setCustomers(custs);
      setProducts(prods);
      if (custs.length > 0) setSelectedCustomerId(custs[0].id);
      if (prods.length > 0) {
        setOrderItems([
          {
            productId: prods[0].id,
            quantity: 1,
            unitPrice: Number(prods[0].sellingPrice),
            dosage: prods[0].dosageInstructions || '1 dose daily',
          },
        ]);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    setOrderItems((prev) => [
      ...prev,
      {
        productId: products[0].id,
        quantity: 1,
        unitPrice: Number(products[0].sellingPrice),
        dosage: products[0].dosageInstructions || '1 dose daily',
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemProductChange = (idx: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setOrderItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              productId,
              unitPrice: prod ? Number(prod.sellingPrice) : item.unitPrice,
              dosage: prod?.dosageInstructions || item.dosage,
            }
          : item
      )
    );
  };

  const handleItemQtyChange = (idx: number, quantity: number) => {
    setOrderItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  };

  const handleCreateDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || orderItems.length === 0) return;

    try {
      setIsSubmittingOrder(true);
      setError(null);
      const res = await apiClient.post('/orders/draft', {
        customerId: selectedCustomerId,
        paymentMode,
        notes: orderNotes.trim() || undefined,
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          dosageInstructions: item.dosage,
        })),
      });

      setSuccessMsg(`Draft order ${res.data?.orderNumber} created successfully.`);
      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    try {
      setActionLoadingId(orderId);
      setError(null);
      await apiClient.post(`/orders/${orderId}/confirm`, {});
      setSuccessMsg('Order confirmed! Warehouse inventory atomically reserved.');
      fetchOrders();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelOrderId) return;

    try {
      setIsCancelling(true);
      setError(null);
      await apiClient.patch(`/orders/${cancelOrderId}/cancel`, {
        reason: cancelReason.trim(),
      });
      setSuccessMsg('Order cancelled and reserved inventory restored to available stock.');
      setCancelOrderId(null);
      fetchOrders();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleGenerateInvoice = async (orderId: string) => {
    try {
      setActionLoadingId(orderId);
      setError(null);
      const res = await apiClient.post(`/invoices/generate/${orderId}`, {});
      setSuccessMsg(`GST Tax Invoice ${res.data?.invoiceNumber} generated!`);
      fetchOrders();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'orderNumber',
      header: 'Order Number',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {item.orderNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer Details',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.customer?.fullName}</span>
          <span className="block font-mono text-[10px] text-slate-400">
            {item.customer?.customerCode} • {item.customer?.city || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Prescribed Items',
      render: (item) => (
        <div className="text-xs text-slate-700">
          <span className="font-medium">
            {item.items?.[0]?.product?.name || 'Ayurvedic Items'}
            {item.items?.length > 1 && ` + ${item.items.length - 1} more`}
          </span>
          <span className="block text-[10px] text-slate-400 font-mono">
            {item.items?.reduce((acc: number, it: any) => acc + it.quantity, 0)} total units
          </span>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Value',
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs">
            ₹{Number(item.totalAmount).toLocaleString('en-IN')}
          </span>
          <span className="block text-[10px] text-slate-500 uppercase">{item.paymentMode}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Order Status',
      render: (item) => {
        let variant: any = 'slate';
        if (item.status === 'CONFIRMED' || item.status === 'PROCESSING') variant = 'info';
        else if (item.status === 'SHIPPED') variant = 'warning';
        else if (item.status === 'DELIVERED') variant = 'success';
        else if (item.status === 'CANCELLED') variant = 'danger';

        return <Badge variant={variant}>{item.status}</Badge>;
      },
    },
    {
      key: 'logistics',
      header: 'Billing & Logistics',
      render: (item) => {
        return (
          <div className="space-y-1 text-xs">
            {item.invoice ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <FileText className="h-3 w-3 text-emerald-600" />
                {item.invoice.invoiceNumber}
              </span>
            ) : item.status !== 'DRAFT' && item.status !== 'CANCELLED' ? (
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] py-0 px-2 h-6"
                onClick={() => handleGenerateInvoice(item.id)}
                isLoading={actionLoadingId === item.id}
              >
                + Gen Invoice
              </Button>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">No invoice</span>
            )}

            {item.shipment ? (
              <span className="block font-mono text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                AWB: {item.shipment.trackingAwb}
              </span>
            ) : (
              item.status === 'CONFIRMED' && (
                <Link href="/management/dispatch">
                  <span className="block text-[10px] text-forest-700 underline hover:text-forest-900 cursor-pointer">
                    + Dispatch Consignment
                  </span>
                </Link>
              )
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openOrderDetail(item.id)}
            icon={<Eye className="h-3 w-3" />}
          >
            View
          </Button>

          {item.status === 'DRAFT' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleConfirmOrder(item.id)}
              isLoading={actionLoadingId === item.id}
              icon={<CheckCircle2 className="h-3 w-3" />}
            >
              Confirm
            </Button>
          )}

          {(item.status === 'DRAFT' || item.status === 'CONFIRMED') && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setCancelOrderId(item.id)}
              icon={<XCircle className="h-3 w-3" />}
            >
              Cancel
            </Button>
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
            <Badge variant="role">Formulation Orders</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Ayurvedic Medicine & Product Orders
          </h2>
          <p className="text-xs text-slate-500">
            Compile customer sales drafts with Ayurvedic medicines, atomically reserve warehouse stock on confirmation, and generate GST invoices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            icon={<PlusCircle className="h-3.5 w-3.5" />}
          >
            New Draft Order
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

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
          <span className="block text-[11px] font-semibold text-slate-500">Total Orders</span>
          <span className="mt-1 block text-lg font-black text-slate-900 font-mono">
            {metrics?.totalOrders ?? 0}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
          <span className="block text-[11px] font-semibold text-amber-600">Drafts</span>
          <span className="mt-1 block text-lg font-black text-amber-700 font-mono">
            {metrics?.draftOrders ?? 0}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
          <span className="block text-[11px] font-semibold text-blue-600">Confirmed (Reserved)</span>
          <span className="mt-1 block text-lg font-black text-blue-700 font-mono">
            {metrics?.confirmedOrders ?? 0}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
          <span className="block text-[11px] font-semibold text-indigo-600">In Transit</span>
          <span className="mt-1 block text-lg font-black text-indigo-700 font-mono">
            {metrics?.shippedOrders ?? 0}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
          <span className="block text-[11px] font-semibold text-emerald-600">Delivered</span>
          <span className="mt-1 block text-lg font-black text-emerald-700 font-mono">
            {metrics?.deliveredOrders ?? 0}
          </span>
        </div>
      </div>

      {/* Status Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          {['ALL', 'DRAFT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
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

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search order number, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Orders DataTable */}
      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyMessage="No formulation orders found matching current criteria."
      />

      {/* Order Details Drawer */}
      <Drawer
        isOpen={!!selectedOrderId}
        onClose={() => {
          setSelectedOrderId(null);
          setOrderDetail(null);
        }}
        title="Formulation Order Dossier & Audit"
        width="lg"
      >
        {loadingDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading order dossier...</div>
        ) : !orderDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Order not found</div>
        ) : (
          <div className="space-y-6 text-xs text-slate-700">
            {/* Order Header */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-forest-800 uppercase">
                    {orderDetail.orderNumber}
                  </span>
                  <h4 className="mt-1 text-base font-bold text-slate-900">
                    Customer: {orderDetail.customer?.fullName} ({orderDetail.customer?.customerCode})
                  </h4>
                  <div className="mt-1 text-xs text-slate-500">
                    <span>Phone: {orderDetail.customer?.phoneNumber}</span> •{' '}
                    <span>
                      {[orderDetail.customer?.city, orderDetail.customer?.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={orderDetail.status === 'DELIVERED' ? 'success' : 'info'}>
                    {orderDetail.status}
                  </Badge>
                  <span className="block font-mono text-sm font-bold text-slate-900 mt-1">
                    ₹{Number(orderDetail.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-600">Payment Mode:</span>
                  <p className="mt-0.5 font-mono uppercase text-slate-900">{orderDetail.paymentMode}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Created By:</span>
                  <p className="mt-0.5 font-mono text-slate-900">
                    {orderDetail.createdBy?.employeeCode} ({orderDetail.createdBy?.firstName})
                  </p>
                </div>
              </div>
            </div>

            {/* Prescribed Items Breakdown */}
            <div>
              <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-forest-700" />
                Formulation Items ({orderDetail.items?.length || 0})
              </h5>
              <div className="space-y-2">
                {orderDetail.items?.map((it: any) => (
                  <div key={it.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{it.product?.name}</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{Number(it.totalPrice).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono">
                      <span>
                        SKU: {it.product?.sku} • {it.quantity} units @ ₹{Number(it.unitPrice).toLocaleString('en-IN')}
                      </span>
                      <span>GST: {it.product?.gstRate || 12}%</span>
                    </div>
                    {it.dosageInstructions && (
                      <p className="text-[11px] text-forest-700 italic mt-0.5">
                        Instructions: &quot;{it.dosageInstructions}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invoicing & Shipping Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-forest-700" />
                  Tax Invoicing
                </span>
                {orderDetail.invoice ? (
                  <div>
                    <span className="font-mono font-semibold text-emerald-800 text-[11px]">
                      {orderDetail.invoice.invoiceNumber}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono">
                      Grand Total: ₹{Number(orderDetail.invoice.grandTotal).toLocaleString('en-IN')}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">No GST invoice generated yet</span>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-forest-700" />
                  Courier Shipment
                </span>
                {orderDetail.shipment ? (
                  <div>
                    <span className="font-mono font-semibold text-amber-800 text-[11px]">
                      AWB: {orderDetail.shipment.trackingAwb}
                    </span>
                    <span className="block text-[10px] text-slate-500 capitalize">
                      {orderDetail.shipment.courierPartner} • {orderDetail.shipment.status}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">Consignment not dispatched</span>
                )}
              </div>
            </div>

            {/* Actions inside Drawer */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOrderId(null);
                  setOrderDetail(null);
                }}
              >
                Close Dossier
              </Button>

              {orderDetail.status === 'DRAFT' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleConfirmOrder(orderDetail.id);
                    setSelectedOrderId(null);
                  }}
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                >
                  Confirm Order
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Draft Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Medicine & Product Draft Order"
        description="Select verified customer, attach Ayurvedic medicines & products, and specify payment mode."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateDraftSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Customer *</label>
            <select
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerCode} - {c.fullName} ({c.phoneNumber}) • {c.city || 'Gujarat'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-700">Formulation Items *</label>
              <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                + Add Item
              </Button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {orderItems.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemProductChange(idx, e.target.value)}
                      className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) - ₹{p.sellingPrice}
                        </option>
                      ))}
                    </select>

                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value, 10))}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 text-center focus:border-forest-600 focus:outline-none"
                      />
                    </div>

                    <div className="w-24 text-right font-mono font-bold text-slate-900 text-xs">
                      ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                    </div>

                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={item.dosage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOrderItems((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, dosage: val } : it))
                      );
                    }}
                    placeholder="Dosage instruction (e.g. 1 spoon twice daily)"
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-forest-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="mt-2 text-right font-bold text-slate-900 text-sm">
              Estimated Total: ₹
              {orderItems
                .reduce((acc, it) => acc + it.unitPrice * it.quantity, 0)
                .toLocaleString('en-IN')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              >
                <option value="CASH_ON_DELIVERY">Cash on Delivery (COD)</option>
                <option value="ONLINE_UPI">Online UPI / QR Payment</option>
                <option value="BANK_TRANSFER">NEFT / RTGS Bank Transfer</option>
                <option value="CREDIT_CARD">Credit / Debit Card</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Order Notes</label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Discounts, packaging instructions..."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingOrder}>
              Create Draft Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={!!cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        title="Cancel Formulation Order"
        description="Cancelling will release all atomically reserved inventory back to warehouse stock."
        maxWidth="sm"
      >
        <form onSubmit={handleCancelOrderSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Cancellation Reason *</label>
            <textarea
              rows={3}
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer cancelled order, delivery unserviceable..."
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-red-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelOrderId(null)}
            >
              Back
            </Button>
            <Button type="submit" variant="danger" size="sm" isLoading={isCancelling}>
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
