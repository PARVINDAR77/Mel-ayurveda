'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { StatCard } from '../../../components/ui/stat-card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import {
  Layers,
  Leaf,
  PlusCircle,
  FolderPlus,
  RefreshCw,
  Search,
  Package,
  AlertCircle,
  CheckCircle2,
  Tag,
  Boxes,
  UploadCloud,
  Link2,
  Eye,
  EyeOff,
  Pencil,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
  Check,
  X,
  Image as ImageIcon,
  HeartPulse,
  Activity,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  description?: string;
  targetDisease?: string;
  dosageInstructions?: string;
  ingredients?: string;
  dosageForm?: string;
  imageUrl?: string;
  mrpPrice: number | string;
  sellingPrice: number | string;
  gstRate: number | string;
  isActive: boolean;
  category?: Category;
  inventory?: {
    availableQuantity: number;
    reservedQuantity: number;
    lowStockThreshold: number;
  };
  createdAt: string;
}

export default function SuperAdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Guided 3-Step Product Creation Modal State
  // -------------------------------------------------------------
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Disease first
  const [step1Category, setStep1Category] = useState<string>('');
  const [step1TargetDisease, setStep1TargetDisease] = useState<string>('');
  const [isQuickAddingDisease, setIsQuickAddingDisease] = useState(false);
  const [quickDiseaseName, setQuickDiseaseName] = useState('');
  const [quickDiseaseDesc, setQuickDiseaseDesc] = useState('');
  const [isSavingQuickDisease, setIsSavingQuickDisease] = useState(false);

  // Step 2: Formulation details
  const [step2Name, setStep2Name] = useState('');
  const [step2Sku, setStep2Sku] = useState('');
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  const [step2DosageForm, setStep2DosageForm] = useState('Tablets');
  const [step2Ingredients, setStep2Ingredients] = useState('');
  const [step2DosageInstructions, setStep2DosageInstructions] = useState('');
  const [step2Mrp, setStep2Mrp] = useState('');
  const [step2SellingPrice, setStep2SellingPrice] = useState('');
  const [step2GstRate, setStep2GstRate] = useState('12');
  const [step2InitialStock, setStep2InitialStock] = useState('100');
  const [step2Description, setStep2Description] = useState('');

  // Step 3: Optional Image ("in thier mine add image or not")
  const [imageMode, setImageMode] = useState<'SKIP' | 'UPLOAD' | 'URL'>('SKIP');
  const [step3ImageUrl, setStep3ImageUrl] = useState('');
  const [step3ImagePreview, setStep3ImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // -------------------------------------------------------------
  // Standalone Add Disease Category Modal State
  // -------------------------------------------------------------
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // -------------------------------------------------------------
  // Edit Product Modal State
  // -------------------------------------------------------------
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editTargetDisease, setEditTargetDisease] = useState('');
  const [editDosageForm, setEditDosageForm] = useState('Tablets');
  const [editIngredients, setEditIngredients] = useState('');
  const [editDosageInstructions, setEditDosageInstructions] = useState('');
  const [editMrp, setEditMrp] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editGstRate, setEditGstRate] = useState('12');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Common dosage forms in Ayurveda
  const DOSAGE_FORMS = [
    'Tablets',
    'Taila / Healing Oil',
    'Kwath / Herbal Syrup',
    'Churna / Herbal Powder',
    'Capsules',
    'Vati / Guggulu',
    'Avleha / Herbal Paste',
    'Asava / Arishta',
  ];

  // Common disease suggestions for quick click
  const COMMON_DISEASES = [
    'Osteoarthritis & Knee Pain',
    'Cervical Spondylosis & Sciatica',
    'Type 2 Diabetes (Madhumeha)',
    'Acid Reflux & GERD (Amlapitta)',
    'Psoriasis & Chronic Eczema',
    'High Blood Pressure (Raktachapa)',
    'Fatty Liver & Jaundice (Yakrit)',
    'Respiratory & Bronchitis (Kasa)',
    'General Debility & Low Immunity',
    'Men\'s Vitality (Vajikarana)',
  ];

  // -------------------------------------------------------------
  // Fetch products and categories
  // -------------------------------------------------------------
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedCategoryId && selectedCategoryId !== 'ALL') {
        params.append('categoryId', selectedCategoryId);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }
      if (statusFilter === 'ACTIVE') {
        params.append('isActive', 'true');
      } else if (statusFilter === 'INACTIVE') {
        params.append('isActive', 'false');
      }

      const [prodsRes, catsRes] = await Promise.all([
        apiClient.get(`/products?${params.toString()}`),
        apiClient.get('/products/categories'),
      ]);

      const fetchedProds = prodsRes.data?.data || prodsRes.data || [];
      const fetchedCats = catsRes.data || [];

      setProducts(fetchedProds);
      setCategories(fetchedCats);

      if (fetchedCats.length > 0 && !step1Category) {
        setStep1Category(fetchedCats[0].id);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategoryId, statusFilter]);

  // Handle Search input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // Generate SKU helper
  const handleGenerateSku = async () => {
    try {
      setIsGeneratingSku(true);
      const res = await apiClient.get('/products/generate-sku');
      if (res.data?.sku) {
        setStep2Sku(res.data.sku);
      }
    } catch (err) {
      // Fallback local generator if endpoint fails
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setStep2Sku(`MEL-AYUR-${randomSuffix}`);
    } finally {
      setIsGeneratingSku(false);
    }
  };

  // Open Create Product Wizard
  const handleOpenCreateModal = async () => {
    setCurrentStep(1);
    setStep1TargetDisease('');
    if (categories.length > 0) {
      setStep1Category(categories[0].id);
    }
    setStep2Name('');
    setStep2DosageForm('Tablets');
    setStep2Ingredients('');
    setStep2DosageInstructions('1 tablet twice daily after meals with lukewarm water');
    setStep2Mrp('');
    setStep2SellingPrice('');
    setStep2GstRate('12');
    setStep2InitialStock('100');
    setStep2Description('');
    setImageMode('SKIP');
    setStep3ImageUrl('');
    setStep3ImagePreview(null);
    setIsQuickAddingDisease(false);
    setError(null);
    setIsCreateModalOpen(true);

    // Pre-generate SKU for Step 2
    await handleGenerateSku();
  };

  // Handle image file selection (Optimizes and converts to Base64)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const optimized = canvas.toDataURL('image/jpeg', 0.85);
        setStep3ImageUrl(optimized);
        setStep3ImagePreview(optimized);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Save Quick Disease Category inside Step 1
  const handleSaveQuickDisease = async () => {
    if (!quickDiseaseName.trim()) {
      setError('Disease category name is required');
      return;
    }
    try {
      setIsSavingQuickDisease(true);
      setError(null);
      const res = await apiClient.post('/products/categories', {
        name: quickDiseaseName.trim(),
        description: quickDiseaseDesc.trim() || undefined,
      });

      const newCategory = res.data;
      setCategories((prev) => [...prev, newCategory]);
      setStep1Category(newCategory.id);
      setIsQuickAddingDisease(false);
      setQuickDiseaseName('');
      setQuickDiseaseDesc('');
      setSuccessMsg(`New disease category "${newCategory.name}" added and selected!`);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSavingQuickDisease(false);
    }
  };

  // Submit Product Creation
  const handleCreateProductSubmit = async () => {
    if (!step1Category) {
      setCurrentStep(1);
      setError('Please select a disease category first.');
      return;
    }
    if (!step2Name.trim() || !step2Sku.trim() || !step2SellingPrice) {
      setCurrentStep(2);
      setError('Please provide formulation name, SKU, and selling price.');
      return;
    }

    try {
      setIsSubmittingProduct(true);
      setError(null);

      const finalMrp = step2Mrp ? parseFloat(step2Mrp) : parseFloat(step2SellingPrice);
      const finalSelling = parseFloat(step2SellingPrice);

      const payload = {
        name: step2Name.trim(),
        sku: step2Sku.trim().toUpperCase(),
        categoryId: step1Category,
        targetDisease: step1TargetDisease.trim() || undefined,
        dosageForm: step2DosageForm,
        ingredients: step2Ingredients.trim() || undefined,
        dosageInstructions: step2DosageInstructions.trim() || undefined,
        description: step2Description.trim() || undefined,
        mrpPrice: finalMrp,
        mrp: finalMrp,
        sellingPrice: finalSelling,
        gstRate: parseFloat(step2GstRate) || 12,
        initialStock: parseInt(step2InitialStock, 10) || 0,
        imageUrl: imageMode !== 'SKIP' && step3ImageUrl.trim() ? step3ImageUrl.trim() : undefined,
      };

      await apiClient.post('/products', payload);

      setSuccessMsg(`Ayurvedic formulation "${step2Name}" registered successfully with ${step2InitialStock} units in stock!`);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Submit Standalone Disease Category
  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setIsSubmittingCat(true);
      setError(null);
      await apiClient.post('/products/categories', {
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });

      setSuccessMsg(`Therapeutic disease category "${newCatName}" added.`);
      setIsCatModalOpen(false);
      setNewCatName('');
      setNewCatDesc('');
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingCat(false);
    }
  };

  // Open Edit Product Modal
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategoryId(p.categoryId);
    setEditTargetDisease(p.targetDisease || '');
    setEditDosageForm(p.dosageForm || 'Tablets');
    setEditIngredients(p.ingredients || '');
    setEditDosageInstructions(p.dosageInstructions || '');
    setEditMrp(p.mrpPrice ? String(p.mrpPrice) : '');
    setEditSellingPrice(String(p.sellingPrice));
    setEditGstRate(String(p.gstRate || 12));
    setEditDescription(p.description || '');
    setEditImageUrl(p.imageUrl || '');
    setEditIsActive(p.isActive);
    setError(null);
  };

  // Submit Product Edit
  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      setIsSubmittingEdit(true);
      setError(null);

      await apiClient.patch(`/products/${editingProduct.id}`, {
        name: editName.trim(),
        targetDisease: editTargetDisease.trim() || undefined,
        dosageForm: editDosageForm,
        ingredients: editIngredients.trim() || undefined,
        dosageInstructions: editDosageInstructions.trim() || undefined,
        description: editDescription.trim() || undefined,
        mrpPrice: editMrp ? parseFloat(editMrp) : undefined,
        sellingPrice: parseFloat(editSellingPrice),
        gstRate: parseFloat(editGstRate),
        imageUrl: editImageUrl.trim() || undefined,
        isActive: editIsActive,
      });

      setSuccessMsg(`Formulation "${editName}" updated successfully.`);
      setEditingProduct(null);
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Toggle Active/Inactive status directly
  const handleToggleProductStatus = async (product: Product) => {
    try {
      setError(null);
      const newStatus = !product.isActive;
      await apiClient.patch(`/products/${product.id}`, {
        isActive: newStatus,
      });
      setSuccessMsg(`Product "${product.name}" is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: newStatus } : p))
      );
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  // -------------------------------------------------------------
  // Metrics Calculation
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    const total = products.length;
    const activeCount = products.filter((p) => p.isActive).length;
    const totalCategories = categories.length;
    let totalStock = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      const stock = p.inventory?.availableQuantity || 0;
      totalStock += stock;
      if (stock <= (p.inventory?.lowStockThreshold || 20)) {
        lowStockCount++;
      }
    });

    return { total, activeCount, totalCategories, totalStock, lowStockCount };
  }, [products, categories]);

  // Selected Category details for Step 1
  const activeSelectedCategory = categories.find((c) => c.id === step1Category);

  return (
    <div className="space-y-6 pb-12">
      {/* --------------------------------------------------------- */}
      {/* 1. Header & Controls Bar                                  */}
      {/* --------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
            <Leaf className="w-4 h-4 text-emerald-700" />
            <span>Ayurvedic Pharmacy & Formulations</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-500 font-medium">Super Admin Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-3">
            Products & Disease Formulations
            <Badge variant="success" className="text-xs font-semibold px-2 py-0.5">
              Live Catalog
            </Badge>
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Disease-first formulation management: configure therapeutic Ayurvedic categories, manage SKU pricing, assign clinical indications, and control warehouse inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            isLoading={isLoading}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCatModalOpen(true)}
            className="border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100/80 font-medium"
          >
            <FolderPlus className="w-4 h-4 mr-1.5 text-amber-700" />
            + New Disease Category
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            + Create Formulation
          </Button>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* Alerts                                                    */}
      {/* --------------------------------------------------------- */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* 2. Executive Stat Cards                                   */}
      {/* --------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL FORMULATIONS"
          value={metrics.total}
          subtitle={`${metrics.activeCount} active in sales prescriptions`}
          icon={Leaf}
          colorTheme="forest"
        />
        <StatCard
          title="DISEASE CATEGORIES"
          value={metrics.totalCategories}
          subtitle="Therapeutic health domains"
          icon={Layers}
          colorTheme="gold"
        />
        <StatCard
          title="WAREHOUSE STOCK"
          value={`${metrics.totalStock.toLocaleString()} Units`}
          subtitle="Total units across catalog"
          icon={Boxes}
          colorTheme="blue"
        />
        <StatCard
          title="LOW STOCK ALERTS"
          value={metrics.lowStockCount}
          subtitle="Formulations below threshold (<20)"
          icon={AlertTriangle}
          colorTheme={metrics.lowStockCount > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* --------------------------------------------------------- */}
      {/* 3. Disease Category Filter Pills                          */}
      {/* --------------------------------------------------------- */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-700" />
            Filter by Disease Category:
          </span>
          <span className="text-xs text-slate-400">
            Showing {products.length} of {metrics.total} products
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedCategoryId('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategoryId === 'ALL'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Diseases</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                selectedCategoryId === 'ALL' ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {metrics.total}
            </span>
          </button>

          {categories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 4. Search and View Controls Bar                          */}
      {/* --------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search formulations by name, SKU, disease, ingredients, or dosage form..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="text-slate-700">
            Search
          </Button>
          {search && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                fetchData();
              }}
              className="text-slate-500"
            >
              Clear
            </Button>
          )}
        </form>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('GRID')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'GRID' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grid Cards
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'TABLE' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 5. Products Catalog Display (Grid vs Table)              */}
      {/* --------------------------------------------------------- */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading Ayurvedic formulations catalog...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <Leaf className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Formulations Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {search || selectedCategoryId !== 'ALL'
              ? 'No products matched your search or category filter. Try clearing filters.'
              : 'No products have been registered yet. Start by creating your first disease formulation.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              <PlusCircle className="w-4 h-4 mr-1.5" />
              + Create Product Formulation
            </Button>
          </div>
        </div>
      ) : viewMode === 'GRID' ? (
        /* GRID CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => {
            const stock = p.inventory?.availableQuantity || 0;
            const threshold = p.inventory?.lowStockThreshold || 20;
            const isLowStock = stock <= threshold;
            const mrp = Number(p.mrpPrice);
            const selling = Number(p.sellingPrice);
            const discountPercent = mrp > selling ? Math.round(((mrp - selling) / mrp) * 100) : 0;

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Top Header Card */}
                  <div className="p-4 pb-3 flex items-start gap-3.5 border-b border-slate-100">
                    {/* Image / Ayurvedic Avatar */}
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-emerald-800">
                          <Leaf className="w-6 h-6 text-emerald-700" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 mt-0.5">
                            {p.dosageForm?.split(' ')[0] || 'Ayur'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.sku}
                        </span>
                        {p.dosageForm && (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            {p.dosageForm}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm mt-1 line-clamp-1 leading-tight">
                        {p.name}
                      </h3>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-medium text-slate-500">
                          {p.category?.name || 'General Category'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Specs */}
                  <div className="p-4 space-y-2.5 text-xs">
                    {/* Disease Target */}
                    {p.targetDisease && (
                      <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-2 text-amber-900">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-amber-700 block mb-0.5">
                          Target Indication / Disease
                        </span>
                        <p className="line-clamp-1 font-medium">{p.targetDisease}</p>
                      </div>
                    )}

                    {/* Ingredients */}
                    {p.ingredients && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Classical Composition:</span>
                        <p className="text-slate-700 line-clamp-1 font-medium mt-0.5">{p.ingredients}</p>
                      </div>
                    )}

                    {/* Dosage Regimen */}
                    {p.dosageInstructions && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Dosage Regimen:</span>
                        <p className="text-slate-600 line-clamp-1 mt-0.5">{p.dosageInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Pricing & Stock */}
                <div className="p-4 pt-3 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-emerald-900">
                          ₹{selling.toLocaleString()}
                        </span>
                        {mrp > selling && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{mrp.toLocaleString()}
                          </span>
                        )}
                        {discountPercent > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">GST: {p.gstRate}% included</span>
                    </div>

                    {/* Warehouse Stock */}
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isLowStock
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        <Boxes className="w-3 h-3" />
                        {stock} Units
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {isLowStock ? 'Low Stock Warning' : 'Available in Warehouse'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => handleToggleProductStatus(p)}
                      className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                        p.isActive
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-500 bg-slate-200/80 hover:bg-slate-300'
                      }`}
                    >
                      {p.isActive ? 'Active Listing' : 'Inactive'}
                    </button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(p)}
                      className="text-xs py-1 px-2.5 h-auto text-slate-700 border-slate-300 hover:bg-slate-100"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit Details
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Formulation & SKU</th>
                  <th className="px-4 py-3">Disease Category</th>
                  <th className="px-4 py-3">Target Indication</th>
                  <th className="px-4 py-3">Dosage Form</th>
                  <th className="px-4 py-3">Selling Price</th>
                  <th className="px-4 py-3">Warehouse Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map((p) => {
                  const stock = p.inventory?.availableQuantity || 0;
                  const isLowStock = stock <= (p.inventory?.lowStockThreshold || 20);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Leaf className="w-4 h-4 text-emerald-700" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{p.name}</span>
                            <span className="font-mono text-[10px] text-slate-400 font-semibold">{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="slate" className="font-semibold text-slate-700 border-slate-300">
                          {p.category?.name || 'General'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <span className="text-slate-800 line-clamp-1">{p.targetDisease || '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[11px]">
                          {p.dosageForm || 'Tablets'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">
                          ₹{Number(p.sellingPrice).toLocaleString()}
                        </div>
                        {Number(p.mrpPrice) > Number(p.sellingPrice) && (
                          <div className="text-[10px] text-slate-400 line-through">
                            ₹{Number(p.mrpPrice).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isLowStock
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {stock} Units
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleProductStatus(p)}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            p.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(p)}
                          className="text-xs py-1 px-2 h-auto text-slate-700"
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* 6. GUIDED 3-STEP PRODUCT CREATION MODAL                   */}
      {/* --------------------------------------------------------- */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        maxWidth="2xl"
      >
        <div className="p-6">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Ayurvedic Formulation Wizard</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                Register New Ayurvedic Product
              </h2>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Indicator */}
          <div className="py-4 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-2">
              {/* Step 1 */}
              <div
                onClick={() => setCurrentStep(1)}
                className={`cursor-pointer p-2.5 rounded-lg border transition-all ${
                  currentStep === 1
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === 1
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    1
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Disease & Health
                    </span>
                    <span className="text-[10px] text-slate-500">Therapeutic Category</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                onClick={() => {
                  if (!step1Category) {
                    setError('Please select a disease category first.');
                    return;
                  }
                  setCurrentStep(2);
                }}
                className={`cursor-pointer p-2.5 rounded-lg border transition-all ${
                  currentStep === 2
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === 2
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    2
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Formulation Details
                    </span>
                    <span className="text-[10px] text-slate-500">Specs, SKU & Price</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div
                onClick={() => {
                  if (!step1Category || !step2Name.trim() || !step2SellingPrice) {
                    setError('Please complete Step 1 & 2 formulation details first.');
                    return;
                  }
                  setCurrentStep(3);
                }}
                className={`cursor-pointer p-2.5 rounded-lg border transition-all ${
                  currentStep === 3
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === 3
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    3
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Image (Optional)
                    </span>
                    <span className="text-[10px] text-slate-500">Upload, URL or Skip</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wizard Content by Step */}
          <div className="py-4 space-y-4">
            {/* =================================================== */}
            {/* STEP 1: DISEASE FIRST                               */}
            {/* =================================================== */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-emerald-800" />
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Step 1: Therapeutic Disease & Indication
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    In Melayurveda clinical protocols, every product is first bound to a primary therapeutic disease category.
                  </p>
                </div>

                {/* Disease Category Dropdown + Quick Add */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Select Disease Category <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddingDisease(!isQuickAddingDisease)}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      {isQuickAddingDisease ? 'Cancel Quick-Add' : '+ Add New Disease / Category'}
                    </button>
                  </div>

                  {/* Quick-Add New Disease Inline Form */}
                  {isQuickAddingDisease ? (
                    <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-3.5 space-y-3 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <FolderPlus className="w-4 h-4 text-amber-700" />
                          Quick-Add New Disease Category
                        </span>
                        <span className="text-[10px] text-amber-700">Creates instantly without leaving</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-amber-950 block mb-1">
                            Disease Category Name <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={quickDiseaseName}
                            onChange={(e) => setQuickDiseaseName(e.target.value)}
                            placeholder="e.g. Twak Roga (Psoriasis & Skin)"
                            className="w-full text-xs border border-amber-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-amber-950 block mb-1">
                            Clinical Indication Notes
                          </label>
                          <input
                            type="text"
                            value={quickDiseaseDesc}
                            onChange={(e) => setQuickDiseaseDesc(e.target.value)}
                            placeholder="e.g. Skin diseases, eczema, dermatitis"
                            className="w-full text-xs border border-amber-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsQuickAddingDisease(false)}
                          className="text-xs h-8"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleSaveQuickDisease}
                          isLoading={isSavingQuickDisease}
                          className="text-xs h-8 bg-amber-700 hover:bg-amber-800 text-white"
                        >
                          Save & Select Disease
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={step1Category}
                      onChange={(e) => setStep1Category(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.description ? `— (${c.description})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Specific Target Disease Indication */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Target Specific Disease Condition(s) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={step1TargetDisease}
                    onChange={(e) => setStep1TargetDisease(e.target.value)}
                    placeholder="e.g. Cervical Spondylosis, Knee Osteoarthritis, Sciatica"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Quick suggestions: click to add to target condition
                  </span>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {COMMON_DISEASES.map((dis) => (
                      <button
                        key={dis}
                        type="button"
                        onClick={() => {
                          if (!step1TargetDisease) {
                            setStep1TargetDisease(dis);
                          } else if (!step1TargetDisease.includes(dis)) {
                            setStep1TargetDisease(`${step1TargetDisease}, ${dis}`);
                          }
                        }}
                        className="text-[10px] font-semibold bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 border border-slate-200 px-2 py-1 rounded-md transition-colors"
                      >
                        + {dis}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Category Summary Card */}
                {activeSelectedCategory && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Active Category Assigned:
                      </span>
                      <span className="font-bold text-emerald-900">{activeSelectedCategory.name}</span>
                    </div>
                    <Badge variant="success" className="text-[10px]">
                      Validated
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* =================================================== */}
            {/* STEP 2: FORMULATION DETAILS                         */}
            {/* =================================================== */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-800" />
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Step 2: Ayurvedic Formulation Specifications
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Enter the classical product formulation name, SKU, dosage form, pricing, and initial stock.
                  </p>
                </div>

                {/* Name & SKU */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Formulation Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={step2Name}
                      onChange={(e) => setStep2Name(e.target.value)}
                      placeholder="e.g. Shallaki Nirgundi Joint Care Tablets"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-semibold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        SKU Code <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateSku}
                        disabled={isGeneratingSku}
                        className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold"
                      >
                        {isGeneratingSku ? '...' : 'Auto-Gen'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={step2Sku}
                      onChange={(e) => setStep2Sku(e.target.value.toUpperCase())}
                      placeholder="MEL-AYUR-008"
                      className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2.5 bg-slate-50 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>
                </div>

                {/* Dosage Form Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Dosage Form <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DOSAGE_FORMS.map((form) => {
                      const isSelected = step2DosageForm === form;
                      return (
                        <button
                          key={form}
                          type="button"
                          onClick={() => setStep2DosageForm(form)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                            isSelected
                              ? 'bg-emerald-800 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {form}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Composition & Dosage Regimen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Classical Herbs & Ingredients
                    </label>
                    <input
                      type="text"
                      value={step2Ingredients}
                      onChange={(e) => setStep2Ingredients(e.target.value)}
                      placeholder="e.g. Shallaki, Nirgundi, Ashwagandha, Shuddha Guggulu"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Dosage Regimen & Anupana
                    </label>
                    <input
                      type="text"
                      value={step2DosageInstructions}
                      onChange={(e) => setStep2DosageInstructions(e.target.value)}
                      placeholder="e.g. 1 tablet twice daily with lukewarm water after meals"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>
                </div>

                {/* Commercial Pricing & Stock */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                    Commercial Pricing & Warehouse Stock
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        MRP Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={step2Mrp}
                        onChange={(e) => setStep2Mrp(e.target.value)}
                        placeholder="1299"
                        className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Selling Price (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={step2SellingPrice}
                        onChange={(e) => setStep2SellingPrice(e.target.value)}
                        placeholder="999"
                        className="w-full text-xs font-bold text-emerald-900 border border-slate-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        GST Rate (%)
                      </label>
                      <select
                        value={step2GstRate}
                        onChange={(e) => setStep2GstRate(e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2 bg-white focus:outline-none"
                      >
                        <option value="5">5% GST</option>
                        <option value="12">12% GST (Ayurvedic)</option>
                        <option value="18">18% GST</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Initial Stock (Units)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={step2InitialStock}
                        onChange={(e) => setStep2InitialStock(e.target.value)}
                        placeholder="100"
                        className="w-full text-xs font-bold text-blue-900 border border-slate-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Therapeutic Description / Clinical Indications <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={step2Description}
                    onChange={(e) => setStep2Description(e.target.value)}
                    placeholder="Key benefits, classical treatise references (Charaka/Sushruta), or pharmacological action..."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>
              </div>
            )}

            {/* =================================================== */}
            {/* STEP 3: OPTIONAL IMAGE ("in thier mine add image or not") */}
            {/* =================================================== */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-800" />
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Step 3: Formulation Image (Optional)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Image is completely optional: upload a bottle/box photo, provide an image URL, or skip to use our Ayurvedic herbal avatar.
                  </p>
                </div>

                {/* 3 Mode Selector */}
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setImageMode('SKIP');
                      setStep3ImageUrl('');
                      setStep3ImagePreview(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      imageMode === 'SKIP'
                        ? 'border-emerald-700 bg-emerald-50/80 ring-2 ring-emerald-700/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                      <Leaf className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        Skip Image
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Use Classical Herbal Avatar
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImageMode('UPLOAD');
                      fileInputRef.current?.click();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      imageMode === 'UPLOAD'
                        ? 'border-emerald-700 bg-emerald-50/80 ring-2 ring-emerald-700/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center mb-2">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        Upload File
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        PNG, JPG, WEBP (Max 5MB)
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageMode('URL')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      imageMode === 'URL'
                        ? 'border-emerald-700 bg-emerald-50/80 ring-2 ring-emerald-700/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center mb-2">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        Image URL
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Direct Web Image Link
                      </span>
                    </div>
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageFileChange}
                />

                {/* Upload Mode UI */}
                {imageMode === 'UPLOAD' && (
                  <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                    >
                      Browse Device Photos
                    </Button>
                    <span className="text-[11px] text-slate-500 block mt-1.5">
                      Accepts PNG, JPG or WEBP. Automatically optimized.
                    </span>
                  </div>
                )}

                {/* URL Mode UI */}
                {imageMode === 'URL' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Direct Image URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={step3ImageUrl}
                        onChange={(e) => {
                          setStep3ImageUrl(e.target.value);
                          setStep3ImagePreview(e.target.value);
                        }}
                        placeholder="https://example.com/images/shallaki-bottle.jpg"
                        className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                      />
                    </div>
                  </div>
                )}

                {/* Live Preview Card */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2.5">
                    Live Formulation Card Preview:
                  </span>

                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex items-start gap-3.5">
                    {/* Preview Thumbnail */}
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden">
                      {step3ImageUrl ? (
                        <img
                          src={step3ImageUrl}
                          alt="Formulation preview"
                          className="w-full h-full object-cover"
                          onError={() => setStep3ImagePreview(null)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-emerald-800">
                          <Leaf className="w-6 h-6 text-emerald-700" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 mt-0.5">
                            {step2DosageForm?.split(' ')[0] || 'Ayur'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {step2Sku || 'MEL-AYUR-XXX'}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                          {step2DosageForm}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mt-1 line-clamp-1">
                        {step2Name || 'Formulation Name Pending'}
                      </h4>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span>{activeSelectedCategory?.name || 'Disease Category'}</span>
                        {step1TargetDisease && (
                          <>
                            <span>•</span>
                            <span className="text-amber-800 font-medium line-clamp-1">
                              {step1TargetDisease}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-black text-emerald-900 text-sm">
                            ₹{step2SellingPrice ? parseFloat(step2SellingPrice).toLocaleString() : '0'}
                          </span>
                          {step2Mrp && parseFloat(step2Mrp) > parseFloat(step2SellingPrice || '0') && (
                            <span className="text-[11px] text-slate-400 line-through">
                              ₹{parseFloat(step2Mrp).toLocaleString()}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {step2InitialStock || 0} Units Initial Stock
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                  className="text-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-600"
              >
                Cancel
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (currentStep === 1) {
                      if (!step1Category) {
                        setError('Please select a disease category.');
                        return;
                      }
                      setCurrentStep(2);
                    } else if (currentStep === 2) {
                      if (!step2Name.trim() || !step2Sku.trim() || !step2SellingPrice) {
                        setError('Please provide formulation name, SKU, and selling price.');
                        return;
                      }
                      setCurrentStep(3);
                    }
                  }}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateProductSubmit}
                  isLoading={isSubmittingProduct}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-sm"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Save & Register Formulation
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* --------------------------------------------------------- */}
      {/* 7. STANDALONE ADD DISEASE CATEGORY MODAL                  */}
      {/* --------------------------------------------------------- */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        maxWidth="md"
      >
        <form onSubmit={handleCreateCategorySubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <FolderPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">New Disease Category</h3>
                <span className="text-[11px] text-slate-500">Therapeutic clinical domain</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCatModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Therapeutic Disease Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Twak Roga (Psoriasis & Skin Disorders)"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Description / Classical Reference <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="e.g. Herbal oils, lepas, and kwaths for chronic eczema, fungal dermatitis, and psoriasis."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCatModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingCat}
              className="bg-amber-700 hover:bg-amber-800 text-white font-semibold"
            >
              Create Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* --------------------------------------------------------- */}
      {/* 8. EDIT FORMULATION MODAL                                 */}
      {/* --------------------------------------------------------- */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        maxWidth="lg"
      >
        {editingProduct && (
          <form onSubmit={handleUpdateProductSubmit} className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Ayurvedic Formulation</h3>
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    SKU: {editingProduct.sku}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Formulation Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Disease Condition</label>
                <input
                  type="text"
                  value={editTargetDisease}
                  onChange={(e) => setEditTargetDisease(e.target.value)}
                  placeholder="e.g. Osteoarthritis, Sciatica"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Dosage Form</label>
                <select
                  value={editDosageForm}
                  onChange={(e) => setEditDosageForm(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white"
                >
                  {DOSAGE_FORMS.map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Classical Herbs & Ingredients</label>
                <input
                  type="text"
                  value={editIngredients}
                  onChange={(e) => setEditIngredients(e.target.value)}
                  placeholder="Shallaki, Nirgundi, Ashwagandha..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Dosage Instructions</label>
                <input
                  type="text"
                  value={editDosageInstructions}
                  onChange={(e) => setEditDosageInstructions(e.target.value)}
                  placeholder="1 tablet twice daily..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">MRP Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editMrp}
                  onChange={(e) => setEditMrp(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editSellingPrice}
                  onChange={(e) => setEditSellingPrice(e.target.value)}
                  className="w-full text-xs font-bold text-emerald-900 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Product Image URL / Data (Optional)</label>
                <input
                  type="text"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://... or skip for herbal avatar"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Therapeutic Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-700"
                />
                <label htmlFor="editIsActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Product is Active & Available for Tele-Sales Prescriptions
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingProduct(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingEdit}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
