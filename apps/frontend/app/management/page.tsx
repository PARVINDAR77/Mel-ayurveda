'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { StatCard } from '../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Users,
  Package,
  Boxes,
  Truck,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  RotateCcw,
} from 'lucide-react';

export default function ManagementDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get('/analytics/dashboard/management');
      setData(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-forest-800 uppercase tracking-widest">
              MEL-MGT-001
            </span>
            <Badge variant="role">Panel 05: Management & Operations</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Commercial, Inventory & Logistics Operations
          </h2>
          <p className="text-xs text-slate-500">
            Fulfill customer conversions, manage formulation inventories, execute GST tax invoicing, and track courier logistics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Link href="/management/orders">
            <Button
              variant="primary"
              size="sm"
              icon={<Package className="h-3.5 w-3.5" />}
            >
              Manage Orders
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Top KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={data?.customers?.totalCustomers ?? 0}
          subtitle={`+${data?.customers?.newCustomersThisMonth ?? 0} this month`}
          icon={Users}
          colorTheme="forest"
        />

        <StatCard
          title="Total Orders"
          value={data?.orders?.totalOrders ?? 0}
          subtitle={`${data?.orders?.deliverySuccessRate ?? 100}% delivery success`}
          icon={Package}
          colorTheme="blue"
        />

        <StatCard
          title="Realized Revenue"
          value={`₹${(data?.commercial?.totalRealizedRevenue ?? 0).toLocaleString('en-IN')}`}
          subtitle={`₹${(data?.commercial?.totalGrossBookings ?? 0).toLocaleString('en-IN')} gross bookings`}
          icon={TrendingUp}
          colorTheme="emerald"
        />

        <StatCard
          title="GST Tax Collected"
          value={`₹${(data?.commercial?.taxLiability?.totalTaxCollected ?? 0).toLocaleString('en-IN')}`}
          subtitle={`₹${(data?.commercial?.taxLiability?.invoiceGrandTotal ?? 0).toLocaleString('en-IN')} invoiced`}
          icon={DollarSign}
          colorTheme="gold"
        />
      </div>

      {/* Low Stock Alerts Banner (If any) */}
      {data?.inventory?.lowStockAlertCount > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-900">
                Low Stock Warning: {data.inventory.lowStockAlertCount} Ayurvedic SKU(s) Below Threshold
              </h4>
              <p className="mt-0.5 text-xs text-amber-700">
                Warehouse replenishment recommended immediately to prevent order fulfillment bottlenecks.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {data.inventory.lowStockAlerts.map((alert: any) => (
                  <span
                    key={alert.productId}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 shadow-sm"
                  >
                    <span className="font-mono text-[11px] font-bold text-amber-700">{alert.sku}:</span>
                    <span>{alert.productName}</span>
                    <Badge variant="danger" className="text-[10px] py-0 px-1">
                      {alert.availableQuantity} left (Min {alert.lowStockThreshold})
                    </Badge>
                  </span>
                ))}
              </div>
            </div>
            <Link href="/management/inventory">
              <Button variant="gold" size="sm">
                Restock Warehouse
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Operational Modules Quick Links Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Link href="/management/customers" className="group">
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-center shadow-sm hover:border-forest-600 hover:shadow-md transition">
            <Users className="mx-auto h-5 w-5 text-forest-700 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-900">Customer CRM</span>
            <span className="text-[10px] text-slate-500">Profiles & Conversion</span>
          </div>
        </Link>

        <Link href="/management/products" className="group">
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-center shadow-sm hover:border-forest-600 hover:shadow-md transition">
            <Layers className="mx-auto h-5 w-5 text-forest-700 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-900">Ayurvedic Catalog</span>
            <span className="text-[10px] text-slate-500">SKU & Pricing</span>
          </div>
        </Link>

        <Link href="/management/orders" className="group">
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-center shadow-sm hover:border-forest-600 hover:shadow-md transition">
            <Package className="mx-auto h-5 w-5 text-forest-700 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-900">Formulation Orders</span>
            <span className="text-[10px] text-slate-500">Draft & Confirm</span>
          </div>
        </Link>

        <Link href="/management/invoices" className="group">
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-center shadow-sm hover:border-forest-600 hover:shadow-md transition">
            <FileText className="mx-auto h-5 w-5 text-forest-700 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-900">GST Billing</span>
            <span className="text-[10px] text-slate-500">CGST/SGST/IGST</span>
          </div>
        </Link>

        <Link href="/management/inventory" className="group">
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-center shadow-sm hover:border-forest-600 hover:shadow-md transition">
            <Boxes className="mx-auto h-5 w-5 text-forest-700 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-900">Warehouse Stock</span>
            <span className="text-[10px] text-slate-500">Ledger & Restock</span>
          </div>
        </Link>

        <Link href="/management/dispatch" className="group">
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-center shadow-sm hover:border-forest-600 hover:shadow-md transition">
            <Truck className="mx-auto h-5 w-5 text-forest-700 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-900">Courier Dispatch</span>
            <span className="text-[10px] text-slate-500">AWB Logistics</span>
          </div>
        </Link>

        <Link href="/management/returns" className="group">
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-center shadow-sm hover:border-forest-600 hover:shadow-md transition">
            <RotateCcw className="mx-auto h-5 w-5 text-forest-700 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-900">Return & RTO</span>
            <span className="text-[10px] text-slate-500">Call & Restock</span>
          </div>
        </Link>
      </div>

      {/* Main Grid: Orders Lifecycle & Commercial GST Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Orders Lifecycle Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Order Fulfillment Pipeline</CardTitle>
                <CardDescription>
                  Live lifecycle distribution of all medicine & product orders
                </CardDescription>
              </div>
              <Link href="/management/orders">
                <Button variant="outline" size="sm" icon={<ArrowRight className="h-3 w-3" />}>
                  View All Orders
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <span className="block text-xs font-medium text-slate-500">Draft Orders</span>
                <span className="mt-1 block text-xl font-black text-slate-800">
                  {data?.orders?.draftOrders ?? 0}
                </span>
                <span className="text-[10px] text-slate-400">Awaiting confirmation</span>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-center">
                <span className="block text-xs font-medium text-blue-700">Confirmed / Processing</span>
                <span className="mt-1 block text-xl font-black text-blue-900">
                  {(data?.orders?.confirmedOrders ?? 0) + (data?.orders?.processingOrders ?? 0)}
                </span>
                <span className="text-[10px] text-blue-600 font-medium">Stock reserved</span>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-center">
                <span className="block text-xs font-medium text-amber-700">Shipped Consignments</span>
                <span className="mt-1 block text-xl font-black text-amber-900">
                  {data?.orders?.shippedOrders ?? 0}
                </span>
                <span className="text-[10px] text-amber-600 font-medium">In transit via courier</span>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-center">
                <span className="block text-xs font-medium text-emerald-700">Delivered & Closed</span>
                <span className="mt-1 block text-xl font-black text-emerald-900">
                  {data?.orders?.deliveredOrders ?? 0}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">Payment fulfilled</span>
              </div>

              <Link href="/management/returns">
                <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-center hover:bg-red-50 hover:border-red-300 transition cursor-pointer">
                  <span className="block text-xs font-medium text-red-700">Returned / RTO</span>
                  <span className="mt-1 block text-xl font-black text-red-900">
                    {data?.orders?.returnedOrders ?? 0}
                  </span>
                  <span className="text-[10px] text-red-600 font-medium">Investigate & restock</span>
                </div>
              </Link>
            </div>

            {/* Top Selling Ayurvedic Formulations */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Top Revenue-Generating Ayurvedic Formulations
              </h4>
              {!data?.topSellingProducts || data.topSellingProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No sales volume data available yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.topSellingProducts.map((p: any, idx: number) => (
                    <div
                      key={p.productId}
                      className="flex items-center justify-between py-2 border-b border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 font-mono text-[10px] font-bold text-slate-600">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900">{p.productName}</span>
                          <span className="block font-mono text-[10px] text-slate-400">{p.sku}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">
                          ₹{Number(p.totalRevenue || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[10px] text-slate-500 font-mono">
                          {p.quantitySold} units sold
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Commercial & GST Tax Summary */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>GST Liability Breakdown</CardTitle>
            <CardDescription>
              State of Gujarat vs Inter-state supply
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span>Total Tax Invoices:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{(data?.commercial?.taxLiability?.invoiceGrandTotal ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Realized Cashflow:</span>
                <span className="font-mono font-bold text-emerald-700">
                  ₹{(data?.commercial?.totalRealizedRevenue ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Statutory Tax Allocation
              </h5>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Intra-State CGST (50%):</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{(data?.commercial?.taxLiability?.cgstCollected ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Intra-State SGST (50%):</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{(data?.commercial?.taxLiability?.sgstCollected ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Inter-State IGST (100%):</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{(data?.commercial?.taxLiability?.igstCollected ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-forest-800">
                <span>Total GST Collected:</span>
                <span className="font-mono text-sm">
                  ₹{(data?.commercial?.taxLiability?.totalTaxCollected ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-[11px] text-indigo-900">
              <span className="font-bold block mb-0.5">Corporate GST Compliance</span>
              MELAYURVEDA INDIA PVT. LTD. registered under Gujarat GSTIN 24AABCM1234F1Z5. Intra-state consignments bifurcated into equal CGST and SGST.
            </div>

            <Link href="/management/invoices" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full">
                Audit All Invoices
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
