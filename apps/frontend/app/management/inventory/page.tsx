'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import {
  Boxes,
  PlusCircle,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  Calendar,
  Layers,
} from 'lucide-react';

export default function WarehouseInventoryPage() {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LEDGER'>('STOCK');
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Restock Modal state
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [restockQty, setRestockQty] = useState('100');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('2028-12-31');
  const [restockNotes, setRestockNotes] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [invRes, txRes, prodRes] = await Promise.all([
        apiClient.get('/inventory'),
        apiClient.get('/inventory/transactions?limit=50'),
        apiClient.get('/products?limit=100'),
      ]);

      setInventoryList(invRes.data?.data || invRes.data || []);
      setTransactions(txRes.data?.data || txRes.data || []);
      const prods = prodRes.data?.data || prodRes.data || [];
      setProducts(prods);
      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openRestockModal = (productId?: string) => {
    if (productId) setSelectedProductId(productId);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    setBatchNumber(`BATCH-MEL-${dateStr}`);
    setIsRestockModalOpen(true);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    try {
      setIsRestocking(true);
      setError(null);
      await apiClient.post('/inventory/restock', {
        productId: selectedProductId,
        quantity: parseInt(restockQty, 10),
        batchNumber: batchNumber.trim(),
        expiryDate: new Date(expiryDate).toISOString(),
        notes: restockNotes.trim() || undefined,
      });

      setSuccessMsg(`Successfully replenished ${restockQty} units to warehouse.`);
      setIsRestockModalOpen(false);
      setRestockNotes('');
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsRestocking(false);
    }
  };

  const stockColumns: Column<any>[] = [
    {
      key: 'sku',
      header: 'SKU Code',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {item.product?.sku}
        </span>
      ),
    },
    {
      key: 'productName',
      header: 'Ayurvedic Formulation',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.product?.name}</span>
          <span className="block text-[11px] text-slate-400 font-mono">
            HSN: 3004.90 • GST: {item.product?.gstRate || 12}%
          </span>
        </div>
      ),
    },
    {
      key: 'availableQuantity',
      header: 'Available Stock',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          {item.availableQuantity} units
        </span>
      ),
    },
    {
      key: 'reservedQuantity',
      header: 'Reserved for Orders',
      render: (item) => (
        <span className="font-mono text-amber-800 text-xs font-semibold">
          {item.reservedQuantity} units
        </span>
      ),
    },
    {
      key: 'threshold',
      header: 'Low Stock Threshold',
      render: (item) => (
        <span className="font-mono text-slate-500 text-xs">
          Min {item.lowStockThreshold} units
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (item) => {
        let variant: any = 'success';
        let label = 'Healthy Stock';
        if (item.availableQuantity === 0) {
          variant = 'danger';
          label = 'Depleted';
        } else if (item.availableQuantity <= item.lowStockThreshold) {
          variant = 'warning';
          label = 'Low Stock Alert';
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openRestockModal(item.productId)}
          icon={<PlusCircle className="h-3 w-3" />}
        >
          Restock
        </Button>
      ),
    },
  ];

  const ledgerColumns: Column<any>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (item) => (
        <div className="text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
          <span className="text-[10px]">
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product SKU',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900">
          {item.inventory?.product?.sku || item.inventory?.productId?.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Transaction Type',
      render: (item) => {
        let variant: any = 'slate';
        if (item.type === 'RESTOCK' || item.type === 'INITIAL_STOCK') variant = 'success';
        else if (item.type === 'ORDER_RESERVATION') variant = 'warning';
        else if (item.type === 'ORDER_FULFILLED') variant = 'info';
        else if (item.type === 'ORDER_CANCELLED') variant = 'danger';

        return <Badge variant={variant}>{item.type}</Badge>;
      },
    },
    {
      key: 'quantity',
      header: 'Quantity Delta',
      render: (item) => {
        const isPositive =
          item.type === 'RESTOCK' || item.type === 'INITIAL_STOCK' || item.type === 'ORDER_CANCELLED';
        return (
          <span
            className={`font-mono font-bold text-xs ${
              isPositive ? 'text-emerald-700' : 'text-slate-800'
            }`}
          >
            {isPositive ? `+${item.quantity}` : `-${item.quantity}`}
          </span>
        );
      },
    },
    {
      key: 'balanceAfter',
      header: 'Balance After',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          {item.balanceAfter} units
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Ledger Audit Notes',
      render: (item) => (
        <span className="text-xs text-slate-600 line-clamp-1 italic">
          {item.notes || 'Automated stock operation'}
        </span>
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
            <Badge variant="role">Warehouse Stock</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Warehouse Inventory & Immutable Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Real-time stock balance tracking, atomic order reservation governance, and batch manufacturing replenishment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openRestockModal()}
            icon={<PlusCircle className="h-3.5 w-3.5" />}
          >
            Replenish Warehouse
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

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'STOCK'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="h-4 w-4" />
          Live Stock Levels ({inventoryList.length})
        </button>

        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'LEDGER'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="h-4 w-4" />
          Warehouse Transaction Ledger ({transactions.length})
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'STOCK' ? (
        <DataTable
          columns={stockColumns}
          data={inventoryList}
          isLoading={isLoading}
          emptyMessage="No inventory records found in warehouse."
        />
      ) : (
        <DataTable
          columns={ledgerColumns}
          data={transactions}
          isLoading={isLoading}
          emptyMessage="No ledger transactions recorded yet."
        />
      )}

      {/* Restock Inventory Modal */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        title="Replenish Warehouse Inventory"
        description="Record factory batch receipt to increase available stock and update chronological ledger."
        maxWidth="md"
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Ayurvedic Formulation *
            </label>
            <select
              required
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity to Restock *</label>
              <input
                type="number"
                min="1"
                required
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                placeholder="e.g. 100"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="BATCH-MEL-2026-01"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Batch Expiration Date *</label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Manufacturing / Ledger Remarks</label>
            <input
              type="text"
              value={restockNotes}
              onChange={(e) => setRestockNotes(e.target.value)}
              placeholder="e.g. Factory consignment batch receipt from Melayurveda Lab, Vadodara"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRestockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isRestocking}>
              Confirm Replenishment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
