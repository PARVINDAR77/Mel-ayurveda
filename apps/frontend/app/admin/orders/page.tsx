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
import { EditOrderModal } from '../../../components/orders/edit-order-modal';
import { DecideOrderModal } from '../../../components/orders/decide-order-modal';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import { OFFICIAL_SALES_ORDERS_EXPORT_COLUMNS } from '../../../lib/official-sales-export';
import {
  Package,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  CheckCheck,
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
  Edit3,
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

  // Edit & Decide Modals
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [decidingOrder, setDecidingOrder] = useState<any | null>(null);

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

  // Dispatch Consignment Modal state
  const [dispatchOrder, setDispatchOrder] = useState<any | null>(null);
  const [courierPartner, setCourierPartner] = useState('BlueDart Express');
  const [trackingAwb, setTrackingAwb] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  // Action Loading state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('limit', '50');
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

  const openDispatchModal = (order: any) => {
    setDispatchOrder(order);
    setCourierPartner('BlueDart Express');
    const orderNumClean = (order.orderNumber || '').replace(/[^0-9]/g, '');
    const randDigits = Math.floor(100000 + Math.random() * 900000);
    setTrackingAwb(`BD${orderNumClean || randDigits}IN`);
    setTrackingUrl('');
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;
    try {
      setIsDispatching(true);
      setError(null);
      await apiClient.post(`/dispatch/${dispatchOrder.id}`, {
        courierPartner,
        trackingAwb: trackingAwb.trim().toUpperCase(),
        trackingUrl: trackingUrl.trim() || undefined,
      });
      setSuccessMsg(`Order ${dispatchOrder.orderNumber} successfully manifested & dispatched via ${courierPartner} (AWB: ${trackingAwb.trim().toUpperCase()}).`);
      setDispatchOrder(null);
      fetchOrders();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsDispatching(false);
    }
  };

  const handleDeliverOrder = async (order: any) => {
    if (!window.confirm(`Mark order ${order.orderNumber} as DELIVERED to customer? This will fulfill warehouse reserved inventory and mark payment as PAID.`)) {
      return;
    }
    try {
      setActionLoadingId(order.id);
      setError(null);
      if (order.shipment?.id) {
        await apiClient.patch(`/dispatch/${order.shipment.id}/status`, { status: 'DELIVERED' });
      } else {
        await apiClient.patch(`/orders/${order.id}`, { status: 'DELIVERED' });
      }
      setSuccessMsg(`Order ${order.orderNumber} successfully marked as DELIVERED.`);
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
      key: 'createdBy',
      header: 'Sales Agent',
      render: (item) => (
        <div>
          <span className="font-semibold text-xs text-emerald-950 flex items-center gap-1">
            <span>👤</span> {item.createdBy?.firstName ? `${item.createdBy.firstName} ${item.createdBy.lastName || ''}` : 'Sales Agent'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block">
            {item.createdBy?.employeeCode || 'MEL-SLS'}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Disease & Formulation',
      render: (item) => {
        const firstItem = item.items?.[0];
        const disease = firstItem?.product?.targetDisease;
        return (
          <div>
            {disease && (
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 mb-1">
                {disease}
              </span>
            )}
            <span className="font-semibold text-slate-800 text-xs block truncate max-w-[180px]">
              {firstItem?.product?.name || 'Ayurvedic Medicine'}
            </span>
            <span className="text-[11px] text-slate-500">
              {item.items?.length || 0} line item(s)
            </span>
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Agreed Price vs MRP',
      render: (item) => {
        const firstItem = item.items?.[0];
        const mrp = firstItem?.product?.mrpPrice ? Number(firstItem.product.mrpPrice) : null;
        const total = Number(item.totalAmount || 0);
        const discount = item.discountAmount ? Number(item.discountAmount) : (mrp && mrp > total ? mrp - total : 0);
        return (
          <div>
            <span className="font-bold font-mono text-emerald-900 text-sm block">
              ₹{total.toLocaleString('en-IN')}
            </span>
            {mrp && mrp > total && (
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="line-through text-slate-400 font-mono">₹{mrp.toLocaleString('en-IN')}</span>
                <span className="text-emerald-700 font-semibold">-₹{discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <span className="block text-[10px] uppercase font-semibold text-slate-500 mt-0.5">
              {item.paymentMode === 'FACE_TO_FACE' ? 'Face to Face' : item.paymentMode === 'PREPAID' ? 'Prepaid' : item.paymentMode === 'HOLD' ? 'Hold' : item.paymentMode === 'CASH_ON_DELIVERY' ? 'COD' : item.paymentMode?.replace(/_/g, ' ') || 'COD'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <div>
          <Badge variant="leadStatus" status={item.status}>{item.status}</Badge>
          {item.shipment?.trackingAwb && (
            <div className="flex items-center gap-1 text-[10px] text-blue-700 font-mono mt-0.5" title={`Dispatched via ${item.shipment.courierPartner}`}>
              <Truck className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate max-w-[130px]">{item.shipment.trackingAwb}</span>
            </div>
          )}
        </div>
      ),
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

          {(item.status === 'CONFIRMED' || item.status === 'PROCESSING') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDispatchModal(item)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 font-semibold text-xs px-2.5 py-1 h-7"
              icon={<Truck className="h-3 w-3 text-blue-600" />}
            >
              Dispatch
            </Button>
          )}

          {item.status === 'SHIPPED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeliverOrder(item)}
              isLoading={actionLoadingId === item.id}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300 font-semibold text-xs px-2.5 py-1 h-7"
              icon={<CheckCheck className="h-3 w-3 text-purple-600" />}
            >
              Deliver
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingOrder(item)}
            icon={<Edit3 className="h-3 w-3 text-amber-600" />}
            className="text-xs px-2 py-1 h-7"
          >
            Edit
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

  // Official 27-column Melayurveda Sales Excel Export Template
  const adminOrdersExportColumns: ExcelColumnDef[] = OFFICIAL_SALES_ORDERS_EXPORT_COLUMNS;

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
          <ExportButton
            data={orders}
            columns={adminOrdersExportColumns}
            fileName="Melayurveda_SuperAdmin_Orders"
            sheetName="All Orders"
          />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
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
          subtitle="In transit via courier"
          icon={Truck}
          colorTheme="blue"
        />

        <StatCard
          title="Delivered to Customer"
          value={metrics?.deliveredOrders ?? (isLoading ? '...' : 0)}
          subtitle="Fulfilled & finalized"
          icon={CheckCheck}
          colorTheme="purple"
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
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'ALL', count: metrics?.totalOrders },
            { id: 'CONFIRMED', label: 'CONFIRMED', count: metrics?.confirmedOrders },
            { id: 'SHIPPED', label: 'SHIPPED', count: metrics?.shippedOrders },
            { id: 'DELIVERED', label: 'DELIVERED', count: metrics?.deliveredOrders },
            { id: 'PROCESSING', label: 'PROCESSING', count: metrics?.processingOrders },
            { id: 'DRAFT', label: 'DRAFT', count: metrics?.draftOrders },
            { id: 'CANCELLED', label: 'CANCELLED', count: metrics?.cancelledOrders },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition shrink-0 ${
                statusFilter === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    statusFilter === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
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
        exportConfig={{
          fileName: 'Melayurveda_SuperAdmin_Orders',
          sheetName: 'All Orders',
          columns: adminOrdersExportColumns,
        }}
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
                  <p className="font-bold text-slate-900 mt-0.5">
                    {orderDetail.paymentMode === 'FACE_TO_FACE' ? 'Face to Face' : orderDetail.paymentMode === 'PREPAID' ? 'Prepaid' : orderDetail.paymentMode === 'HOLD' ? 'Hold' : orderDetail.paymentMode === 'CASH_ON_DELIVERY' ? 'Cash on Delivery (COD)' : orderDetail.paymentMode?.replace(/_/g, ' ')}
                  </p>
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

            {/* Notes & Remarks History */}
            {orderDetail.notes && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-700" /> Approver Directives & Chronological Notes
                </h4>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950 font-mono whitespace-pre-line">
                  {orderDetail.notes}
                </div>
              </div>
            )}

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
              <Button
                variant="outline"
                onClick={() => {
                  setEditingOrder(orderDetail);
                  setSelectedOrderId(null);
                }}
                icon={<Edit3 className="h-4 w-4 text-amber-600" />}
              >
                Edit Order & Prices
              </Button>
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
              {(orderDetail.status === 'CONFIRMED' || orderDetail.status === 'PROCESSING') && (
                <Button
                  variant="primary"
                  onClick={() => {
                    openDispatchModal(orderDetail);
                    setSelectedOrderId(null);
                  }}
                  icon={<Truck className="h-4 w-4" />}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Dispatch via Courier
                </Button>
              )}
              {orderDetail.status === 'SHIPPED' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleDeliverOrder(orderDetail);
                    setSelectedOrderId(null);
                  }}
                  icon={<CheckCheck className="h-4 w-4" />}
                  className="bg-purple-700 hover:bg-purple-800 text-white"
                >
                  Mark Delivered to Customer
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
                style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                className="w-full rounded-md border border-slate-300 p-2 text-xs font-bold text-slate-900 bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="CASH_ON_DELIVERY" style={{ color: '#0f172a', backgroundColor: '#ffffff', fontWeight: 600 }}>Cash on Delivery (COD)</option>
                <option value="FACE_TO_FACE" style={{ color: '#0f172a', backgroundColor: '#ffffff', fontWeight: 600 }}>Face to Face</option>
                <option value="PREPAID" style={{ color: '#0f172a', backgroundColor: '#ffffff', fontWeight: 600 }}>Prepaid</option>
                <option value="HOLD" style={{ color: '#0f172a', backgroundColor: '#ffffff', fontWeight: 600 }}>Hold</option>
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

      {/* Dispatch Consignment Modal */}
      <Modal
        isOpen={!!dispatchOrder}
        onClose={() => setDispatchOrder(null)}
        title="Dispatch Order via Courier Consignment"
        description="Manifest an express courier consignment to dispatch this confirmed formulation order."
      >
        {dispatchOrder && (
          <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 font-mono text-sm">{dispatchOrder.orderNumber}</span>
                <span className="font-bold text-emerald-800 font-mono">₹{Number(dispatchOrder.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-slate-700">
                <span className="font-semibold">Recipient:</span> {dispatchOrder.customer?.fullName} ({dispatchOrder.customer?.phoneNumber})
              </p>
              <p className="text-slate-600 truncate">
                <span className="font-semibold">Destination:</span> {[dispatchOrder.customer?.city, dispatchOrder.customer?.state, dispatchOrder.customer?.pincode].filter(Boolean).join(', ') || 'Gujarat'}
              </p>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Courier Partner *
              </label>
              <select
                value={courierPartner}
                onChange={(e) => setCourierPartner(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs font-semibold text-slate-900 bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                required
              >
                <option value="BlueDart Express">BlueDart Express (Air Priority)</option>
                <option value="DTDC Priority">DTDC Priority Logistics</option>
                <option value="Delhivery Surface">Delhivery Surface Cargo</option>
                <option value="Ekart Logistics">Ekart Logistics</option>
                <option value="India Post Speed Post">India Post Speed Post</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold uppercase tracking-wider text-slate-700">
                  AWB Tracking Number *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Consignment Manifest ID</span>
              </div>
              <input
                type="text"
                value={trackingAwb}
                onChange={(e) => setTrackingAwb(e.target.value.toUpperCase())}
                placeholder="e.g. BD78392101IN"
                className="w-full rounded-md border border-slate-300 p-2 text-xs font-mono font-bold tracking-wide uppercase text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Tracking URL (Optional)
              </label>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://track.bluedart.com/..."
                className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDispatchOrder(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isDispatching}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                icon={<Truck className="h-4 w-4" />}
              >
                Manifest & Dispatch Order
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          isOpen={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          order={editingOrder}
          onOrderUpdated={(updated) => {
            setSuccessMsg(`Order ${updated.orderNumber} successfully updated.`);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}
