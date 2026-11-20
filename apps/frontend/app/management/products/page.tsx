'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import {
  Layers,
  PlusCircle,
  FolderPlus,
  RefreshCw,
  Search,
  Package,
  AlertCircle,
  CheckCircle2,
  Tag,
  Boxes,
} from 'lucide-react';

export default function ProductCatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add Product Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCatId, setProdCatId] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodDosage, setProdDosage] = useState('');
  const [prodMrp, setProdMrp] = useState('');
  const [prodSelling, setProdSelling] = useState('');
  const [prodGst, setProdGst] = useState('12');
  const [prodStock, setProdStock] = useState('100');
  const [isSubmittingProd, setIsSubmittingProd] = useState(false);

  // Add Category Modal state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'ALL') {
        params.append('categoryId', selectedCategory);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const [prodsRes, catsRes] = await Promise.all([
        apiClient.get(`/products?${params.toString()}`),
        apiClient.get('/products/categories'),
      ]);

      setProducts(prodsRes.data?.data || prodsRes.data || []);
      const fetchedCats = catsRes.data || [];
      setCategories(fetchedCats);
      if (fetchedCats.length > 0 && !prodCatId) {
        setProdCatId(fetchedCats[0].id);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingProd(true);
      setError(null);
      await apiClient.post('/products', {
        name: prodName.trim(),
        sku: prodSku.trim().toUpperCase(),
        categoryId: prodCatId,
        description: prodDesc.trim() || undefined,
        dosageInstructions: prodDosage.trim() || undefined,
        mrp: parseFloat(prodMrp),
        sellingPrice: parseFloat(prodSelling),
        gstRate: parseInt(prodGst, 10),
        initialStock: parseInt(prodStock, 10) || 0,
      });

      setSuccessMsg(`Ayurvedic product "${prodName}" registered with initial stock.`);
      setIsProductModalOpen(false);
      setProdName('');
      setProdSku('');
      setProdDesc('');
      setProdDosage('');
      setProdMrp('');
      setProdSelling('');
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingProd(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingCat(true);
      setError(null);
      await apiClient.post('/products/categories', {
        name: catName.trim(),
        description: catDesc.trim() || undefined,
      });

      setSuccessMsg(`Therapeutic category "${catName}" added.`);
      setIsCatModalOpen(false);
      setCatName('');
      setCatDesc('');
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'sku',
      header: 'SKU Code',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {item.sku}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Formulation Name',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.name}</span>
          {item.dosageInstructions && (
            <span className="block text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">
              Dosage: {item.dosageInstructions}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Disease Category',
      render: (item) => (
        <Badge variant="slate" className="font-medium text-xs">
          {item.category?.name || 'Ayurveda'}
        </Badge>
      ),
    },
    {
      key: 'pricing',
      header: 'Pricing & GST',
      render: (item) => (
        <div className="text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 font-mono">
              ₹{Number(item.sellingPrice).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 line-through font-mono">
              ₹{Number(item.mrp).toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            GST: {item.gstRate}% (HCS 3004)
          </span>
        </div>
      ),
    },
    {
      key: 'inventory',
      header: 'Warehouse Stock',
      render: (item) => {
        const available = item.inventory?.availableQuantity ?? 0;
        const reserved = item.inventory?.reservedQuantity ?? 0;
        const threshold = item.inventory?.lowStockThreshold ?? 20;

        let statusVariant: any = 'success';
        let statusLabel = 'In Stock';
        if (available === 0) {
          statusVariant = 'danger';
          statusLabel = 'Out of Stock';
        } else if (available <= threshold) {
          statusVariant = 'warning';
          statusLabel = 'Low Stock';
        }

        return (
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900">{available} units</span>
              <Badge variant={statusVariant} className="text-[10px] py-0 px-1.5">
                {statusLabel}
              </Badge>
            </div>
            {reserved > 0 && (
              <span className="text-[10px] text-amber-700 block font-mono">
                {reserved} reserved for orders
              </span>
            )}
          </div>
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
            <Badge variant="role">Ayurvedic Catalog</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Disease-Wise Product Catalog & Pricing Governance
          </h2>
          <p className="text-xs text-slate-500">
            Maintain therapeutic formulations, assign HSN codes & GST tax rates, track SKU threshold alerts, and manage retail MRPs.
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
            variant="secondary"
            size="sm"
            onClick={() => setIsCatModalOpen(true)}
            icon={<FolderPlus className="h-3.5 w-3.5" />}
          >
            New Category
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsProductModalOpen(true)}
            icon={<PlusCircle className="h-3.5 w-3.5" />}
          >
            Register Formulation
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

      {/* Category Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              selectedCategory === 'ALL'
                ? 'bg-forest-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Formulations ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full font-semibold transition ${
                selectedCategory === cat.id
                  ? 'bg-forest-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search SKU, product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Products Table */}
      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        emptyMessage="No Ayurvedic products found matching criteria."
      />

      {/* Register Product Modal */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Register New Ayurvedic Formulation SKU"
        description="Add a proprietary product into catalog with HSN tax rules and initial warehouse stock."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Formulation Name *</label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="e.g. Artho-Care Tailam (100ml)"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
              <input
                type="text"
                required
                value={prodSku}
                onChange={(e) => setProdSku(e.target.value)}
                placeholder="e.g. MEL-SKU-001"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Therapeutic Category *</label>
              <select
                required
                value={prodCatId}
                onChange={(e) => setProdCatId(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Warehouse Stock</label>
              <input
                type="number"
                min="0"
                value={prodStock}
                onChange={(e) => setProdStock(e.target.value)}
                placeholder="e.g. 100"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">MRP Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={prodMrp}
                onChange={(e) => setProdMrp(e.target.value)}
                placeholder="e.g. 1299.00"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={prodSelling}
                onChange={(e) => setProdSelling(e.target.value)}
                placeholder="e.g. 999.00"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate *</label>
              <select
                value={prodGst}
                onChange={(e) => setProdGst(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              >
                <option value="5">5% GST (Essential Ayurvedic Formulations)</option>
                <option value="12">12% GST (Classical Ayurvedic Preparations)</option>
                <option value="18">18% GST (Cosmetic & External Elixirs)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clinical Dosage Instructions</label>
            <input
              type="text"
              value={prodDosage}
              onChange={(e) => setProdDosage(e.target.value)}
              placeholder="e.g. 2 tablets twice daily with warm water after meals"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Description</label>
            <textarea
              rows={2}
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
              placeholder="Herbal composition, therapeutic indications, key ingredients..."
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingProd}>
              Register Formulation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Disease Category Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Add Therapeutic Disease Category"
        description="Create an Ayurvedic therapeutic division (e.g. Joint Care, Diabetic Care, Immunity)."
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Joint & Bone Health"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Therapeutic scope, dosha balance focus..."
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCatModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingCat}>
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
