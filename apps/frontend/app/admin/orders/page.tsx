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
  Phone,
  MapPin,
  TrendingUp,
  Receipt,
  ArrowLeft,
} from 'lucide-react';

export default function SuperAdminOrdersPage() {
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
  const [cancelReason, setCancelReason] = useState('Super Admin requested cancellation');
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
            dosage: prods[0].dosageInstructions || '1 dose daily with lukewarm water',
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
        dosage: products[0].dosageInstructions || '1 dose daily with lukewarm water',
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
      setSuccessMsg('Order cancelled and reserved stock returned to warehouse inventory.');
      setCancelOrderId(null);
      fetchOrders();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsCancelling(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'orderNumber',
      header: 'Order Code',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          {item.orderNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer Details',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.customer?.fullName || 'Customer'}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
            <Phone className="h-3 w-3 text-slate-400" />
            <span>{item.customer?.phoneNumber}</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {[item.customer?.city, item.customer?.state].filter(Boolean).join(', ')}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Formulations / Regimen',
      render: (item) => (
        <div>
          <span className="font-medium text-slate-800 text-xs block">
            {item.items?.[0]?.product?.name || 'Ayurvedic Medicine'}
          </span>
          <span className="text-[11px] text-slate-500">
            {item.items?.length || 0} formulation unit(s)
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Order Value & Payment',
      render: (item) => (
        <div>
          <span className="font-bold font-mono text-slate-900">
            ₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}
          </span>
          <span className="block text-[10px] uppercase font-semibold text-slate-500">
            {item.paymentMode?.replace(/_/g, ' ') || 'COD'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <Badge variant="leadStatus" status={item.status}>{item.status}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Created At',
      render: (item) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          {item.status === 'DRAFT' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleConfirmOrder(item.id)}
              isLoading={actionLoadingId === item.id}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs px-2.5 py-1 h-7"
              icon={<CheckCircle2 className="h-3 w-3" />}
            >
              Confirm
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => openOrderDetail(item.id)}
            icon={<Eye className="h-3 w-3" />}
            className="text-xs px-2 py-1 h-7"
          >
            Details
          </Button>

          {item.status !== 'CANCELLED' && item.status !== 'DELIVERED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCancelOrderId(item.id);
                setCancelReason('Super Admin cancelled order');
              }}
              icon={<Trash2 className="h-3 w-3 text-red-500" />}
              className="text-xs px-2 py-1 h-7 hover:bg-red-50 text-red-700 border-red-200"
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-semibold">
              <ArrowLeft className="h-3 w-3" /> Master Dashboard
            </Link>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-widest">
              SUPER ADMIN
            </span>
            <Badge variant="role">Enterprise Order Control</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Customer Formulation Orders & Fulfillment
          </h2>
          <p className="text-xs text-slate-500">
            Manage customer medicine orders, confirm stock allocations, inspect Gujarat GST invoices, and oversee dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            className="bg-emerald-800 hover:bg-emerald-900 text-white"
          >
            + New Order
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={metrics?.totalOrders ?? (isLoading ? '...' : 0)}
          subtitle="All-time recorded orders"
          icon={Package}
          colorTheme="forest"
        />

        <StatCard
          title="Confirmed Orders"
          value={metrics?.confirmedOrders ?? (isLoading ? '...' : 0)}
          subtitle="Atomic inventory reserved"
          icon={CheckCircle2}
          colorTheme="emerald"
        />

        <StatCard
          title="Shipped & Dispatched"
          value={metrics?.shippedOrders ?? (isLoading ? '...' : 0)}
          subtitle="In transit via BlueDart/DTDC"
          icon={Truck}
          colorTheme="blue"
        />

        <StatCard
          title="Gross Order Revenue"
          value={`₹${(metrics?.totalRevenue ?? 0).toLocaleString('en-IN')}`}
          subtitle="Gujarat GST inclusive billing"
          icon={Boxes}
          colorTheme="gold"
        />
      </div>

      {/* Filter Tabs and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto">
          {['ALL', 'DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md font-semibold transition shrink-0 ${
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
            placeholder="Search order #, customer, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyMessage="No customer formulation orders found matching the filter."
      />

      {/* Order Details Drawer */}
      <Drawer
        isOpen={!!selectedOrderId}
        onClose={() => {
          setSelectedOrderId(null);
          setOrderDetail(null);
        }}
        title="Formulation Order Specification & Invoice"
        width="lg"
      >
        {loadingDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading order details...</div>
        ) : !orderDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Order not found</div>
        ) : (
          <div className="space-y-6 text-xs text-slate-700">
            {/* Order Header Summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {orderDetail.orderNumber}
                  </span>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Placed on {new Date(orderDetail.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge variant="leadStatus" status={orderDetail.status}>{orderDetail.status}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/80 pt-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment Mode</span>
                  <p className="font-bold text-slate-900 mt-0.5">{orderDetail.paymentMode?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Bill Value</span>
                  <p className="font-black font-mono text-emerald-800 mt-0.5 text-base">
                    ₹{Number(orderDetail.totalAmount).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-700" /> Customer & Delivery Address
              </h4>
              <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">{orderDetail.customer?.fullName}</span>
                  <span className="font-mono text-xs text-slate-500">{orderDetail.customer?.customerCode}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">{orderDetail.customer?.phoneNumber}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {[orderDetail.customer?.address, orderDetail.customer?.city, orderDetail.customer?.state, orderDetail.customer?.pincode]
                      .filter(Boolean)
                      .join(', ') || 'Address not specified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-700" /> Prescribed Formulations & Regimen
              </h4>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Medicine Product</th>
                      <th className="px-3 py-2">Dosage Instructions</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderDetail.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {item.product?.name}
                          <span className="block font-mono text-[10px] text-slate-400">{item.product?.sku}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 italic">
                          {item.dosageInstructions || 'Standard Dosage'}
                        </td>
                        <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">₹{Number(item.unitPrice).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tax & GST Summary */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal (Formulations Base)</span>
                <span className="font-mono">₹{(Number(orderDetail.totalAmount) * 0.88).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Gujarat SGST (6%)</span>
                <span className="font-mono">₹{(Number(orderDetail.totalAmount) * 0.06).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Central CGST (6%)</span>
                <span className="font-mono">₹{(Number(orderDetail.totalAmount) * 0.06).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                <span>Total Commercial Invoice Amount</span>
                <span className="font-mono font-black text-emerald-800">
                  ₹{Number(orderDetail.totalAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Drawer Quick Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              {orderDetail.status === 'DRAFT' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleConfirmOrder(orderDetail.id);
                    setSelectedOrderId(null);
                  }}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  Confirm & Allocate Stock
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Customer Formulation Order"
        description="Prescribe Ayurvedic medicines, configure dosage regimens, and generate a confirmed order."
      >
        <form onSubmit={handleCreateDraftSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Select Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.phoneNumber}) - {c.city || 'Gujarat'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold uppercase tracking-wider text-slate-700">
                Prescribed Medicines & Formulations
              </label>
              <Button type="button" variant="outline" size="sm" onClick={addItemRow} icon={<PlusCircle className="h-3 w-3" />}>
                Add Medicine
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 border border-slate-200 p-2 rounded-lg bg-slate-50/50">
                  <select
                    value={item.productId}
                    onChange={(e) => handleItemProductChange(idx, e.target.value)}
                    className="flex-1 rounded border border-slate-300 p-1.5 text-xs bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{Number(p.sellingPrice).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                    className="w-16 rounded border border-slate-300 p-1.5 text-center text-xs bg-white font-bold"
                  />

                  <input
                    type="text"
                    value={item.dosage}
                    onChange={(e) =>
                      setOrderItems((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, dosage: e.target.value } : it))
                      )
                    }
                    placeholder="Dosage instruction"
                    className="w-40 rounded border border-slate-300 p-1.5 text-xs bg-white"
                  />

                  {orderItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="CASH_ON_DELIVERY">Cash on Delivery (COD)</option>
                <option value="PREPAID_UPI">Prepaid UPI / QR</option>
                <option value="NET_BANKING">Net Banking / NEFT</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Clinical / Delivery Notes
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Special packaging or delivery notes"
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingOrder} className="bg-emerald-800 hover:bg-emerald-900 text-white">
              Create Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={!!cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        title="Cancel Customer Order"
        description="Cancelling will release reserved warehouse batches and record an immutable cancellation audit log."
      >
        <form onSubmit={handleCancelOrderSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Cancellation Reason
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCancelOrderId(null)}>
              Abort
            </Button>
            <Button type="submit" variant="danger" isLoading={isCancelling}>
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
