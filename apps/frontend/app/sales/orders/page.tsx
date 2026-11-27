'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Drawer } from '../../../components/ui/drawer';
import { StatCard } from '../../../components/ui/stat-card';
import { EditOrderModal } from '../../../components/orders/edit-order-modal';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import {
  Package,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  AlertCircle,
  Clock,
  Boxes,
  Phone,
  Receipt,
  Edit3,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Drawer
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fix & Edit Order Modal
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (statusFilter && statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await apiClient.get(`/orders?${params.toString()}`);
      setOrders(res.data?.data || res.data || []);
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

  // Metrics calculation
  const totalCount = orders.length;
  const draftCount = orders.filter((o) => o.status === 'DRAFT').length;
  const needsFixCount = orders.filter(
    (o) =>
      o.status === 'DRAFT' &&
      o.notes &&
      (o.notes.includes('RECTIFICATION') || o.notes.includes('AMENDMENT'))
  ).length;
  const confirmedCount = orders.filter((o) => o.status === 'CONFIRMED').length;

  const columns: Column<any>[] = [
    {
      key: 'orderNumber',
      header: 'Order Number',
      render: (o) => (
        <div>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {o.orderNumber}
          </span>
          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
            {new Date(o.createdAt).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => (
        <div>
          <span className="font-bold text-slate-900 block">{o.customer?.fullName}</span>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
            <Phone className="h-3 w-3 text-slate-400" />
            <span>{o.customer?.phoneNumber}</span>
          </div>
          <span className="text-[10px] text-slate-400">
            {[o.customer?.city, o.customer?.state].filter(Boolean).join(', ')}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Prescribed Formulations',
      render: (o) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs">
            {o.items?.length || 0} formulation(s)
          </span>
          <div className="flex flex-wrap gap-1 mt-1 max-w-xs">
            {o.items?.slice(0, 2).map((item: any, idx: number) => (
              <span
                key={idx}
                className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
              >
                {item.product?.name} (x{item.quantity})
              </span>
            ))}
            {o.items?.length > 2 && (
              <span className="text-[10px] text-slate-400">+{o.items.length - 2} more</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Payable',
      render: (o) => (
        <div>
          <span className="font-mono font-bold text-sm text-forest-800">
            ₹{Number(o.totalAmount).toFixed(2)}
          </span>
          <span className="block text-[10px] text-slate-500">{o.paymentMode}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Approval Status & Directives',
      render: (o) => {
        const hasRectification =
          o.notes &&
          (o.notes.includes('RECTIFICATION') || o.notes.includes('AMENDMENT'));
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Badge
                variant={
                  o.status === 'CONFIRMED'
                    ? 'success'
                    : o.status === 'CANCELLED'
                    ? 'danger'
                    : hasRectification
                    ? 'gold'
                    : 'info'
                }
              >
                {o.status === 'DRAFT' && hasRectification
                  ? 'RECTIFICATION REQUIRED'
                  : o.status}
              </Badge>
            </div>

            {/* Approver Remark Callout */}
            {hasRectification && (
              <div className="rounded border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-950 font-medium max-w-xs shadow-xs">
                <div className="flex items-start gap-1 font-bold text-amber-900 text-[10px] uppercase">
                  <ShieldAlert className="h-3 w-3 text-amber-700 shrink-0 mt-0.5" />
                  <span>Approver Directive:</span>
                </div>
                <p className="font-mono text-[10px] mt-0.5 whitespace-pre-line text-amber-900 line-clamp-2">
                  {o.notes.split('\n').pop()}
                </p>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (o) => {
        const isDraft = o.status === 'DRAFT';
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openOrderDetail(o.id)}
              icon={<Eye className="h-3 w-3" />}
            >
              Details
            </Button>
            {isDraft ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setEditingOrder(o)}
                icon={<Edit3 className="h-3 w-3" />}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Fix & Re-submit
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  // Official 27-column Melayurveda Sales Excel Export Template Matching Exact Layout
  const ordersExportColumns: ExcelColumnDef[] = [
    {
      header: 'Source Of Lead',
      width: 18,
      accessor: (o: any) => {
        const src = o.customer?.convertedFrom?.sourceType || o.customer?.sourceType || o.sourceType || 'Tele-Sales';
        return typeof src === 'string' ? src.replace(/_/g, ' ') : 'Tele-Sales';
      },
    },
    {
      header: 'PAYMENT MODE',
      width: 16,
      accessor: (o: any) => {
        const mode = o.paymentMode || o.paymentMethod || 'COD';
        if (mode === 'CASH_ON_DELIVERY') return 'COD';
        return String(mode).replace(/_/g, ' ');
      },
    },
    {
      header: 'DELIVERED / INTRANSIT/RTO/SHIPPED',
      width: 32,
      accessor: (o: any) => {
        const shipStatus = o.shipment?.status;
        if (shipStatus) return String(shipStatus).replace(/_/g, ' ');
        const ordStatus = o.orderStatus || o.status;
        if (ordStatus === 'CONFIRMED' || ordStatus === 'APPROVED') return 'CONFIRMED';
        if (ordStatus === 'DELIVERED') return 'DELIVERED';
        if (ordStatus === 'SHIPPED') return 'SHIPPED';
        return ordStatus ? String(ordStatus).replace(/_/g, ' ') : 'PENDING';
      },
    },
    {
      header: 'ORDER ID',
      width: 22,
      accessor: (o: any) => o.orderNumber || '',
    },
    {
      header: 'DATE',
      width: 14,
      accessor: (o: any) => {
        if (!o.createdAt) return '';
        const d = new Date(o.createdAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      },
    },
    {
      header: 'Agent',
      width: 22,
      accessor: (o: any) => {
        if (o.createdBy) {
          const name = `${o.createdBy.firstName || ''} ${o.createdBy.lastName || ''}`.trim();
          const code = o.createdBy.employeeCode ? ` (${o.createdBy.employeeCode})` : '';
          return (name + code).trim() || 'Sales Consultant';
        }
        return o.creator?.employeeCode || o.creator?.fullName || 'Sales Consultant';
      },
    },
    {
      header: "CUSTOMER'S NAME",
      width: 24,
      accessor: (o: any) => o.customer?.fullName || '',
    },
    {
      header: 'MOBILE',
      width: 16,
      accessor: (o: any) => o.customer?.phoneNumber || '',
    },
    {
      header: 'AL. MOBILE',
      width: 16,
      accessor: (o: any) => o.customer?.alternatePhone || o.customer?.convertedFrom?.alternatePhone || '',
    },
    {
      header: 'ADDRESS',
      width: 38,
      accessor: (o: any) => o.customer?.address || o.shippingAddress || o.customer?.convertedFrom?.address || '',
    },
    {
      header: 'PIN CODE',
      width: 12,
      accessor: (o: any) => o.customer?.pincode || o.pincode || '',
    },
    {
      header: 'CITY',
      width: 16,
      accessor: (o: any) => o.customer?.city || '',
    },
    {
      header: 'STATE',
      width: 16,
      accessor: (o: any) => o.customer?.state || '',
    },
    {
      header: 'DISEASE',
      width: 20,
      accessor: (o: any) => {
        return (
          o.items?.[0]?.product?.targetDisease ||
          o.customer?.convertedFrom?.productInterest ||
          o.productInterest ||
          'General Wellness'
        );
      },
    },
    {
      header: 'AMOUNT',
      width: 14,
      accessor: (o: any) => Number(o.totalAmount || o.grandTotal || 0),
    },
    {
      header: 'PRODUCT - 1',
      width: 26,
      accessor: (o: any) => o.items?.[0]?.product?.name || o.items?.[0]?.productName || '',
    },
    {
      header: 'QUANITY',
      width: 10,
      accessor: (o: any) => (o.items?.[0] ? o.items[0].quantity : ''),
    },
    {
      header: 'PRODUCT - 2',
      width: 26,
      accessor: (o: any) => o.items?.[1]?.product?.name || o.items?.[1]?.productName || '',
    },
    {
      header: 'QUANITY',
      width: 10,
      accessor: (o: any) => (o.items?.[1] ? o.items[1].quantity : ''),
    },
    {
      header: 'PRODUCT - 3',
      width: 26,
      accessor: (o: any) => o.items?.[2]?.product?.name || o.items?.[2]?.productName || '',
    },
    {
      header: 'QUANITY',
      width: 10,
      accessor: (o: any) => (o.items?.[2] ? o.items[2].quantity : ''),
    },
    {
      header: 'PRODUCT - 4',
      width: 26,
      accessor: (o: any) => o.items?.[3]?.product?.name || o.items?.[3]?.productName || '',
    },
    {
      header: 'QUANITY',
      width: 10,
      accessor: (o: any) => (o.items?.[3] ? o.items[3].quantity : ''),
    },
    {
      header: 'PRODUCT - 5',
      width: 26,
      accessor: (o: any) => o.items?.[4]?.product?.name || o.items?.[4]?.productName || '',
    },
    {
      header: 'QUANITY',
      width: 10,
      accessor: (o: any) => (o.items?.[4] ? o.items[4].quantity : ''),
    },
    {
      header: 'PRODUCT - 6',
      width: 26,
      accessor: (o: any) => o.items?.[5]?.product?.name || o.items?.[5]?.productName || '',
    },
    {
      header: 'QUANITY',
      width: 10,
      accessor: (o: any) => (o.items?.[5] ? o.items[5].quantity : ''),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-forest-800 uppercase tracking-widest">
              MEL-SAL-ORD-01
            </span>
            <Badge variant="role">Ayurvedic Consultant Order Desk</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            My Booked Formulation Orders
          </h2>
          <p className="text-xs text-slate-500">
            Track booked patient orders, view approval officer verification notes, fix requested discrepancies, and re-submit for immediate courier dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={orders}
            columns={ordersExportColumns}
            fileName="Melayurveda_My_Booked_Orders"
            sheetName="Booked Orders"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Orders
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Booked"
          value={totalCount}
          icon={Package}
          subtitle="My lifetime booked orders"
        />
        <StatCard
          title="Action Needed"
          value={needsFixCount}
          icon={RotateCcw}
          subtitle="Approver rectification directives"
          trend={
            needsFixCount > 0
              ? { value: `${needsFixCount} directives`, isPositive: false }
              : undefined
          }
        />
        <StatCard
          title="Awaiting Approval"
          value={draftCount}
          icon={Clock}
          subtitle="Pending medical/pricing review"
        />
        <StatCard
          title="Confirmed & Dispatched"
          value={confirmedCount}
          icon={CheckCircle2}
          subtitle="Cleared for courier delivery"
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All My Orders ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('DRAFT')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              statusFilter === 'DRAFT'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Review / Rectify ({draftCount})
          </button>
          <button
            onClick={() => setStatusFilter('CONFIRMED')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              statusFilter === 'CONFIRMED'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Confirmed ({confirmedCount})
          </button>
          <button
            onClick={() => setStatusFilter('CANCELLED')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              statusFilter === 'CANCELLED'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancelled
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search order #, customer, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-forest-600 focus:outline-none"
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
        emptyMessage="No booked orders found in your desk."
        exportConfig={{
          fileName: 'Melayurveda_My_Booked_Orders',
          sheetName: 'Booked Orders',
          columns: ordersExportColumns,
        }}
      />

      {/* Order Details Drawer */}
      <Drawer
        isOpen={!!selectedOrderId}
        onClose={() => {
          setSelectedOrderId(null);
          setOrderDetail(null);
        }}
        title="Formulation Order Dossier"
        width="lg"
      >
        {loadingDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading order dossier...</div>
        ) : !orderDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Order not found</div>
        ) : (
          <div className="space-y-6 text-xs text-slate-700">
            {/* Header */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500 uppercase">
                    Order Ref: {orderDetail.orderNumber}
                  </span>
                  <h4 className="mt-1 text-base font-bold text-slate-900">
                    {orderDetail.customer?.fullName}
                  </h4>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>Phone: {orderDetail.customer?.phoneNumber}</span>
                    <span>City: {orderDetail.customer?.city || 'N/A'}</span>
                    <span>State: {orderDetail.customer?.state || 'N/A'}</span>
                  </div>
                </div>
                <Badge
                  variant={
                    orderDetail.status === 'CONFIRMED'
                      ? 'success'
                      : orderDetail.status === 'CANCELLED'
                      ? 'danger'
                      : 'gold'
                  }
                >
                  {orderDetail.status}
                </Badge>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-slate-600">Delivery Destination:</span>
                  <p className="mt-0.5 text-slate-900">{orderDetail.customer?.address || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Payment Terms:</span>
                  <p className="mt-0.5 font-semibold text-slate-900">{orderDetail.paymentMode}</p>
                </div>
              </div>
            </div>

            {/* Approver Directives & Timeline */}
            <div>
              <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Approval Authority Directives & Notes History
              </h5>
              {!orderDetail.notes ? (
                <div className="rounded border border-dashed border-slate-200 p-3 text-center text-slate-400">
                  No approval remarks attached to this order.
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 font-mono whitespace-pre-line">
                  {orderDetail.notes}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-forest-700" />
                Prescribed Line Items ({orderDetail.items?.length || 0})
              </h5>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 font-bold text-slate-700 uppercase">
                    <tr>
                      <th className="px-3 py-2">Product Name</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Negotiated Unit Price</th>
                      <th className="px-3 py-2">Dosage Instructions</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {orderDetail.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {item.product?.name}
                          <span className="block font-mono text-[10px] text-slate-400">
                            {item.product?.sku}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">₹{item.unitPrice}</td>
                        <td className="px-3 py-2 text-slate-600 italic">
                          {item.dosageInstructions || 'As directed by physician'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          ₹{item.totalPrice}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-right space-y-1">
                <div className="text-[11px] text-slate-500">
                  Subtotal: <span className="font-mono">₹{orderDetail.subtotal}</span> | GST (12%):{' '}
                  <span className="font-mono">₹{orderDetail.taxAmount}</span> | Discount:{' '}
                  <span className="font-mono">₹{orderDetail.discountAmount}</span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Final Payable:{' '}
                  <span className="text-forest-800 font-black font-mono text-base">
                    ₹{orderDetail.totalAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions inside Drawer */}
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
                    setEditingOrder(orderDetail);
                    setSelectedOrderId(null);
                  }}
                  icon={<Edit3 className="h-3.5 w-3.5" />}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Fix & Re-submit Order
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Fix & Re-submit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          isOpen={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          order={editingOrder}
          onOrderUpdated={(updated) => {
            setSuccessMsg(`Order ${updated.orderNumber} successfully updated and re-submitted.`);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}
