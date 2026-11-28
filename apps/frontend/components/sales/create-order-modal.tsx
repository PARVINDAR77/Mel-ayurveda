'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/button';
import {
  X,
  Plus,
  Trash2,
  Package,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';

interface OrderItemLine {
  productId: string;
  sku: string;
  name: string;
  disease: string;
  mrpPrice: number;
  unitPrice: number; // Negotiated selling price
  quantity: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: any;
  onOrderCreated?: (order: any) => void;
}

const INDIAN_STATES = [
  'Gujarat',
  'Maharashtra',
  'Rajasthan',
  'Madhya Pradesh',
  'Delhi',
  'Uttar Pradesh',
  'Karnataka',
  'Haryana',
  'Punjab',
  'Bihar',
  'West Bengal',
  'Tamil Nadu',
  'Telangana',
  'Andhra Pradesh',
  'Kerala',
  'Odisha',
  'Assam',
  'Jharkhand',
  'Chhattisgarh',
  'Uttarakhand',
  'Goa',
  'Himachal Pradesh',
];

const CORE_DISEASE_CATEGORIES = [
  { id: 'Skin Care', label: 'Skin Care', sub: 'Netex, Sariva, Sorsiz, Darmacare, Ghee', icon: '✨' },
  { id: 'Weight Gain', label: 'Weight Gain', sub: 'Enerjeet Powder, Tablets, Cal-Vcare', icon: '💪' },
  { id: 'Joint Pain', label: 'Joint Pain', sub: 'Arthex Oil, Artho Amrit Tablets', icon: '🦴' },
  { id: 'Men’s Wellness', label: 'Men’s Wellness', sub: 'Amrit Plus, ling Taila, Shilajit, Horse', icon: '⚡' },
  { id: 'Weight Loss', label: 'Weight Loss', sub: 'Fibrolax, Smartlook, Obenew', icon: '⚖️' },
  { id: 'Piles', label: 'Piles / Gas Acidity', sub: 'Suruchi, Arsh Amrit, Jatyadi Malam', icon: '🩹' },
  { id: 'Alcohol Addiction', label: 'Alcohol Addiction', sub: 'No More Granules, Hepcure, Red & White', icon: '🍷' },
];

const FALLBACK_PRODUCTS = [
  // -------------------------------------------------------------
  // 1. Skin Care Products
  // -------------------------------------------------------------
  {
    id: 'prod-skn-01',
    sku: 'MEL-SKN-NETEX-01',
    name: 'Netex Malam',
    targetDisease: 'Skin Care',
    dosageForm: 'Ointment / Malam (50g)',
    mrpPrice: 650,
    sellingPrice: 499,
    description: 'Classical Ayurvedic soothing malam for eczema, psoriasis patches, ringworm and itchy fungal skin lesions.',
  },
  {
    id: 'prod-skn-02',
    sku: 'MEL-SKN-SARIVA-02',
    name: 'Sariva Tablet',
    targetDisease: 'Skin Care',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 850,
    sellingPrice: 650,
    description: 'Potent Ayurvedic Rakta Shodhaka (blood purifier) that pacifies Pitta dosha and clears chronic skin toxins.',
  },
  {
    id: 'prod-skn-03',
    sku: 'MEL-SKN-SORCR-03',
    name: 'Sorsiz Cream',
    targetDisease: 'Skin Care',
    dosageForm: 'Topical Cream (50g)',
    mrpPrice: 750,
    sellingPrice: 580,
    description: 'Therapeutic anti-scaling herbal cream specifically formulated for plaque psoriasis and dry cracked skin.',
  },
  {
    id: 'prod-skn-04',
    sku: 'MEL-SKN-SORTB-04',
    name: 'Sorsiz Tablet',
    targetDisease: 'Skin Care',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 950,
    sellingPrice: 750,
    description: 'Internal cellular detoxifier and immune-modulator that curbs autoimmune skin flare-ups and scaling.',
  },
  {
    id: 'prod-skn-05',
    sku: 'MEL-SKN-DARMA-05',
    name: 'Darmacare Syrup',
    targetDisease: 'Skin Care',
    dosageForm: 'Herbal Syrup (200ml)',
    mrpPrice: 600,
    sellingPrice: 450,
    description: 'Synergistic herbal blood-purifying tonic that clears pimples, allergic dermatitis and imparts a natural glow.',
  },
  {
    id: 'prod-skn-06',
    sku: 'MEL-SKN-PANCH-06',
    name: 'Panchtrit Ghee',
    targetDisease: 'Skin Care',
    dosageForm: 'Medicinal Ghee / Ghrita (100g)',
    mrpPrice: 1100,
    sellingPrice: 850,
    description: 'Panchatikta Ghrita — Classical Ayurvedic medicated cow ghee prepared with five bitter roots for deep tissue detoxification.',
  },

  // -------------------------------------------------------------
  // 2. Weight Gain Product
  // -------------------------------------------------------------
  {
    id: 'prod-wtg-01',
    sku: 'MEL-WTG-ENERP-01',
    name: 'Enerjeet Powder',
    targetDisease: 'Weight Gain',
    dosageForm: 'Powder / Churna (200g)',
    mrpPrice: 1450,
    sellingPrice: 1150,
    description: 'Natural herbal weight and muscle builder rich in adaptogens to increase nutrient absorption and lean mass.',
  },
  {
    id: 'prod-wtg-02',
    sku: 'MEL-WTG-ENERT-02',
    name: 'Enerjeet Tablets',
    targetDisease: 'Weight Gain',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 900,
    sellingPrice: 699,
    description: 'Dhatu-nourishing herbal tablets that stimulate Agni (digestive fire) and accelerate healthy weight gain.',
  },
  {
    id: 'prod-wtg-03',
    sku: 'MEL-WTG-CALVC-03',
    name: 'Cal-Vcare Avaleh',
    targetDisease: 'Weight Gain',
    dosageForm: 'Avaleh / Herbal Paste (250g)',
    mrpPrice: 1250,
    sellingPrice: 950,
    description: 'Nutritive rasayana avaleh enriched with natural calcium and organic minerals for bone density and muscle stamina.',
  },

  // -------------------------------------------------------------
  // 3. Joint Pain Care
  // -------------------------------------------------------------
  {
    id: 'prod-jnt-01',
    sku: 'MEL-JNT-ARTHX-01',
    name: 'Arthex Oil',
    targetDisease: 'Joint Pain',
    dosageForm: 'Therapeutic Oil (100ml)',
    mrpPrice: 850,
    sellingPrice: 650,
    description: 'Deep-penetrating pain-relieving Ayurvedic taila that alleviates joint stiffness, knee inflammation and arthritis pain.',
  },
  {
    id: 'prod-jnt-02',
    sku: 'MEL-JNT-AMRIT-02',
    name: 'Artho Amrit Tablets',
    targetDisease: 'Joint Pain',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 1100,
    sellingPrice: 850,
    description: 'Restores synovial joint fluid, protects cartilage from degeneration, and reduces uric acid buildup in joints.',
  },

  // -------------------------------------------------------------
  // 4. Men’s Wellness & Vitality
  // -------------------------------------------------------------
  {
    id: 'prod-mnw-01',
    sku: 'MEL-MNW-AMRIT-01',
    name: 'Amrit Plus Tablets',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 1650,
    sellingPrice: 1250,
    description: 'Premium Ayurvedic vitality tonic for male energy, reproductive stamina, vigor and physical performance.',
  },
  {
    id: 'prod-mnw-02',
    sku: 'MEL-MNW-LINGT-02',
    name: 'ling Taila',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Therapeutic Taila (50ml)',
    mrpPrice: 1200,
    sellingPrice: 899,
    description: 'Traditional Ayurvedic local vitality massage oil formulated with warming herbs to enhance blood circulation.',
  },
  {
    id: 'prod-mnw-03',
    sku: 'MEL-MNW-SHILA-03',
    name: 'Shilajit',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Pure Resin / Drops (20g)',
    mrpPrice: 1800,
    sellingPrice: 1399,
    description: '100% Himalayan Shuddha Shilajit containing over 80 trace minerals and 75% Fulvic Acid for supreme cellular stamina.',
  },
  {
    id: 'prod-mnw-04',
    sku: 'MEL-MNW-INFOR-04',
    name: 'Inforsiz Tablets',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 1400,
    sellingPrice: 1050,
    description: 'Potent Rasayana formula that boosts free testosterone, balances endocrine health, and combats chronic lethargy.',
  },
  {
    id: 'prod-mnw-05',
    sku: 'MEL-MNW-PRASH-05',
    name: 'Amrit Prash Avaleh',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Avaleh / Paste (250g)',
    mrpPrice: 1350,
    sellingPrice: 999,
    description: 'Ojas-enhancing Ayurvedic Chyawan-style formulation tailored for male physical endurance and rejuvenation.',
  },
  {
    id: 'prod-mnw-06',
    sku: 'MEL-MNW-HORSE-06',
    name: 'H.M Horse Taila',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Therapeutic Taila (50ml)',
    mrpPrice: 1300,
    sellingPrice: 950,
    description: 'High-potency muscular toning herbal oil enriched with classical Vajikaran herbs and neuro-stimulant oils.',
  },

  // -------------------------------------------------------------
  // 5. Weight Loss Products
  // -------------------------------------------------------------
  {
    id: 'prod-wtl-01',
    sku: 'MEL-WTL-FIBRO-01',
    name: 'Fibrolax Pawder',
    targetDisease: 'Weight Loss',
    dosageForm: 'Powder / Churna (100g)',
    mrpPrice: 650,
    sellingPrice: 480,
    description: 'High-fiber digestive detoxifier that flushes visceral fat toxins and curbs midnight overeating.',
  },
  {
    id: 'prod-wtl-02',
    sku: 'MEL-WTL-SMART-02',
    name: 'Smartlook Powder',
    targetDisease: 'Weight Loss',
    dosageForm: 'Slimming Powder (200g)',
    mrpPrice: 1550,
    sellingPrice: 1199,
    description: 'Metabolic accelerator that burns stubborn abdominal adipose tissue and naturally suppresses sugar cravings.',
  },
  {
    id: 'prod-wtl-03',
    sku: 'MEL-WTL-OBENE-03',
    name: 'Obenew Tablet',
    targetDisease: 'Weight Loss',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 1200,
    sellingPrice: 899,
    description: 'Medohar rasayana tablets that break down lipid accumulations, improve sluggish thyroid metabolism and tone the body.',
  },

  // -------------------------------------------------------------
  // 6. Piles / Gas & Acidity Products
  // -------------------------------------------------------------
  {
    id: 'prod-pls-01',
    sku: 'MEL-PLS-SURUC-01',
    name: 'Suruchi Powder',
    targetDisease: 'Piles',
    dosageForm: 'Churna / Powder (100g)',
    mrpPrice: 550,
    sellingPrice: 399,
    description: 'Instant digestive and antacid churna that relieves chronic hyperacidity, gas bloating, constipation and indigestion.',
  },
  {
    id: 'prod-pls-02',
    sku: 'MEL-PLS-ARSHM-02',
    name: 'Arsh Amrit tablet',
    targetDisease: 'Piles',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 950,
    sellingPrice: 720,
    description: 'Potent classical anorectal healer that shrinks internal and external pile masses, stops bleeding and relieves rectal pain.',
  },
  {
    id: 'prod-pls-03',
    sku: 'MEL-PLS-JATYA-03',
    name: 'Jatyadi Malam',
    targetDisease: 'Piles',
    dosageForm: 'Healing Ointment / Malam (50g)',
    mrpPrice: 500,
    sellingPrice: 380,
    description: 'Classical Jatyadi healing ointment that provides rapid soothing relief from burning sensations, fissure tears and wounds.',
  },
  // -------------------------------------------------------------
  // 7. Alcohol Addiction Products
  // -------------------------------------------------------------
  {
    id: 'prod-alc-01',
    sku: 'MEL-ALC-NOMORE-01',
    name: 'No More Granules',
    targetDisease: 'Alcohol Addiction',
    dosageForm: 'Herbal Granules (100g)',
    mrpPrice: 1250,
    sellingPrice: 950,
    description: 'Natural Ayurvedic anti-craving herbal granules formulated to suppress alcoholic urges, detoxify brain neurotransmitters, and establish natural sobriety.',
  },
  {
    id: 'prod-alc-02',
    sku: 'MEL-ALC-HEPCUR-02',
    name: 'Hepcure Tablet',
    targetDisease: 'Alcohol Addiction',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 1100,
    sellingPrice: 850,
    description: 'High-potency hepato-protective Ayurvedic formulation to repair liver damage, cleanse alcohol toxins, stimulate bile secretion, and restore healthy liver function.',
  },
  {
    id: 'prod-alc-03',
    sku: 'MEL-ALC-REDWHT-03',
    name: 'Red & White Tablet',
    targetDisease: 'Alcohol Addiction',
    dosageForm: 'Tablets (60 Tabs / Day-Night Combo)',
    mrpPrice: 1450,
    sellingPrice: 1150,
    description: 'Synergistic dual-tablet Ayurvedic regimen. Red tablet calms daytime withdrawal anxiety and cravings; White tablet soothes the nervous system, prevents nighttime restlessness, and induces restorative sleep.',
  },
];

export function CreateOrderModal({ isOpen, onClose, lead, onOrderCreated }: CreateOrderModalProps) {
  const { user } = useAuth();

  // Booking Dossier State
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [agentName, setAgentName] = useState('');

  // Customer Contact & Delivery State
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Gujarat');
  const [paymentMode, setPaymentMode] = useState('CASH_ON_DELIVERY');
  const [notes, setNotes] = useState('');

  // Items in the current order
  const [orderItems, setOrderItems] = useState<OrderItemLine[]>([]);

  // Disease & Formulation Picker State
  const [selectedDisease, setSelectedDisease] = useState<string>('Skin Care');
  const [allProducts, setAllProducts] = useState<any[]>(FALLBACK_PRODUCTS);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);

  // Sync lead details & user info when opened
  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sales Consultant';
      const code = user.employeeCode || 'MEL-SAL-001';
      setAgentName(`${fullName} (${code})`);
    }

    if (lead) {
      setCustomerName(lead.customerName || '');
      setPhoneNumber(lead.phoneNumber || '');
      setAlternatePhone(lead.alternatePhone || '');
      setShippingAddress(lead.address || '');
      setPincode(lead.pincode || '');
      setCity(lead.city || '');
      setState(lead.state || 'Gujarat');
    }
  }, [lead, user, isOpen]);

  // Fetch products from backend or merge with fallback
  useEffect(() => {
    if (isOpen) {
      const fetchProducts = async () => {
        try {
          const res = await apiClient.get('/products?limit=100');
          const serverProducts = res.data?.data || [];
          if (Array.isArray(serverProducts) && serverProducts.length > 0) {
            // Merge server products with fallback so all categories remain populated
            const merged = [...serverProducts];
            for (const fb of FALLBACK_PRODUCTS) {
              if (!merged.some((p) => p.sku === fb.sku)) {
                merged.push(fb);
              }
            }
            setAllProducts(merged);
          }
        } catch {
          // Keep FALLBACK_PRODUCTS
        }
      };
      fetchProducts();
    }
  }, [isOpen]);

  // Filtered products for selected disease
  const diseaseProducts = useMemo(() => {
    const list = allProducts.filter((p) => {
      const target = (p.targetDisease || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const current = selectedDisease.toLowerCase();
      return target.includes(current) || name.includes(current);
    });
    return list.length > 0 ? list : allProducts.slice(0, 3);
  }, [allProducts, selectedDisease]);

  if (!isOpen) return null;

  // Add formulation to order
  const handleAddProductToOrder = (prod: any) => {
    const mrp = Number(prod.mrpPrice) || 2400;
    const standardSelling = Number(prod.sellingPrice) || 1850;

    const existingIdx = orderItems.findIndex((item) => item.productId === prod.id || item.sku === prod.sku);
    if (existingIdx >= 0) {
      const updated = [...orderItems];
      updated[existingIdx].quantity += 1;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          disease: prod.targetDisease || selectedDisease,
          mrpPrice: mrp,
          unitPrice: standardSelling,
          quantity: 1,
        },
      ]);
    }
  };

  // Update Negotiated Unit Price (Agent Editable Pricing)
  const handlePriceChange = (index: number, newPrice: number) => {
    const updated = [...orderItems];
    updated[index].unitPrice = Math.max(0, newPrice);
    setOrderItems(updated);
  };

  // Update Quantity
  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...orderItems];
    updated[index].quantity = Math.max(1, qty);
    setOrderItems(updated);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Calculations
  const totalCatalogMRP = orderItems.reduce((acc, it) => acc + it.mrpPrice * it.quantity, 0);
  const totalAgreedSelling = orderItems.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  const totalDealDiscount = Math.max(0, totalCatalogMRP - totalAgreedSelling);
  const gstAmount = Number(((totalAgreedSelling * 12) / 112).toFixed(2)); // GST included at 12%

  // Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (orderItems.length === 0) {
      setError('Please prescribe at least one Ayurvedic formulation product before submitting.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('A valid 10-digit customer primary mobile number is required.');
      return;
    }

    if (!shippingAddress.trim()) {
      setError('Complete shipping delivery address is required for courier dispatch.');
      return;
    }

    if (!city.trim()) {
      setError('City / District is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        customerName: customerName.trim(),
        phoneNumber: cleanPhone,
        alternatePhone: alternatePhone.trim() || undefined,
        shippingAddress: shippingAddress.trim(),
        city: city.trim(),
        state: state.trim() || 'Gujarat',
        pincode: pincode.trim() || undefined,
        paymentMode,
        notes: [
          notes.trim(),
          `Booking Date: ${orderDate}`,
          `Booking Agent: ${agentName}`,
        ].filter(Boolean).join(' | '),
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice), // Preserved agent negotiated price!
          dosageInstructions: `Prescribed for ${item.disease}`,
        })),
      };

      if (lead?.id && typeof lead.id === 'string' && lead.id.length > 10) {
        payload.leadId = lead.id;
      }

      const res = await apiClient.post('/orders/draft', payload);
      const resData = res.data?.data || res.data;
      const orderToken = resData?.orderNumber || resData?.orderCode || resData?.id;
      setCreatedOrderNumber(orderToken);

      if (onOrderCreated) {
        onOrderCreated(resData);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('order-created', { detail: resData }));
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // If order was just created successfully, show success receipt modal
  if (createdOrderNumber) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-3xl shadow-sm border border-emerald-300">
            ✓
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Official Order Booking Token Generated
            </span>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-100 text-amber-950 border-2 border-amber-400 shadow-sm">
              <span className="text-base font-mono font-extrabold tracking-wider">{createdOrderNumber}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-3">Order Confirmed Successfully!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Customer: <span className="font-semibold text-slate-800">{customerName}</span> (+91 {phoneNumber})
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-left">
            <div className="flex justify-between text-slate-600">
              <span>Booking Date:</span>
              <span className="font-bold text-slate-900">{orderDate}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Booking Agent:</span>
              <span className="font-bold text-emerald-950">{agentName}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery Destination:</span>
              <span className="font-bold text-slate-800 truncate max-w-[180px]">{city}, {state}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Mode:</span>
              <span className="font-bold text-slate-900">
                {paymentMode === 'CASH_ON_DELIVERY'
                  ? 'Cash on Delivery (COD)'
                  : paymentMode === 'FACE_TO_FACE'
                  ? 'Face to Face'
                  : paymentMode === 'HOLD'
                  ? 'Order on Hold (Pending Confirmation)'
                  : 'Prepaid'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Catalog MRP:</span>
              <span className="line-through font-mono">₹{totalCatalogMRP.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Deal Discount Offered:</span>
              <span className="font-mono">- ₹{totalDealDiscount.toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
              <span>Agreed Payable:</span>
              <span className="text-emerald-800 font-mono text-base">₹{totalAgreedSelling.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setCreatedOrderNumber(null);
              onClose();
            }}
            className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 rounded-xl shadow-md"
          >
            Done & Return to Desk
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Outer Modal Frame */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white p-4.5 sm:p-5 flex items-center justify-between border-b border-emerald-700/50 shadow-sm shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-emerald-950 font-bold flex items-center justify-center text-xl shadow-md border border-amber-300">
              📦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Create Customer Order</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Panel 02 • Negotiated Deal Closing
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200/80">Select disease indication, pick formulations, and adjust agreed selling price</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Agent Badge in Header */}
            <div className="hidden md:flex items-center gap-2 bg-emerald-800/80 px-3 py-1.5 rounded-xl border border-emerald-700 shadow-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-[10px] font-bold flex items-center justify-center text-white ring-1 ring-emerald-400">
                {user?.firstName?.[0] || 'A'}
              </div>
              <div className="text-right">
                <span className="text-[9px] text-emerald-300 block leading-none uppercase font-semibold">Booking Consultant</span>
                <span className="text-xs font-bold text-white leading-tight">{agentName || 'Sales Agent'}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-800 hover:bg-emerald-700 text-emerald-200 hover:text-white flex items-center justify-center transition-colors shadow-xs"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body - CLEAN SCROLLBAR-FREE CONTAINER */}
        <form
          onSubmit={handleSubmitOrder}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="flex-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden p-4 sm:p-6 space-y-5"
        >
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 1: BOOKING DOSSIER & DELIVERY DESTINATION */}
          {/* ======================================================== */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-4.5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs border-b border-slate-200/80 pb-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span> Client Contact Details & Delivery Destination
              </span>
              {lead && (
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-900 bg-emerald-100 font-extrabold px-2.5 py-0.5 rounded-lg text-[11px] border border-emerald-300 shadow-2xs">
                    Linked Lead: {lead.customerName} ({lead.leadCode || `#LEAD-${lead.id?.slice(0, 6)}`})
                  </span>
                </div>
              )}
            </div>

            {/* Row 1: Booking Date, Agent Name, Client Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                  Order Booking Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-emerald-800" />
                  Booking Consultant Agent
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Ramesh Patel (MEL-SAL-001)"
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">👤 Client Full Name <span className="text-red-500">*</span></span>
                  {lead?.customerName && (
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1 rounded border border-emerald-200">
                      Lead: {lead.customerName}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  name="patient_full_name"
                  autoComplete="off"
                  data-lpignore="true"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
              </div>
            </div>

            {/* Row 2: Phone Numbers & Pin Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  📱 Primary Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-xs font-bold text-slate-600 select-none">+91</span>
                  <input
                    type="tel"
                    name="patient_primary_phone"
                    autoComplete="off"
                    data-lpignore="true"
                    required
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full pl-11 pr-3 py-1.5 text-xs font-bold font-mono bg-white text-slate-950 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  📞 Alternative Contact
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-xs font-bold text-slate-600 select-none">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Secondary contact"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full pl-11 pr-3 py-1.5 text-xs font-bold font-mono bg-white text-slate-950 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  📮 Postal Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 380015"
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full px-3 py-1.5 text-xs font-bold font-mono bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
              </div>
            </div>

            {/* Row 3: Street Delivery Address, City, State */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-800" />
                  Shipping Delivery Address (Street / House / Landmark) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="House/Plot no., building, street, landmark..."
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  🏙️ City / District <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Ahmedabad"
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  🗺️ State <span className="text-red-500">*</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 shadow-xs"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: DISEASE-FIRST FORMULATION SELECTOR */}
          {/* ======================================================== */}
          <div className="bg-white border-2 border-emerald-100 rounded-2xl p-4 sm:p-4.5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🌿</span> Step 1: Select Disease Indication → Step 2: Add Formulations
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click a disease category below to reveal formulations one by one and add multiple products to the order.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Multi-Product Selection Active
              </span>
            </div>

            {/* Disease Categories Chips */}
            <div
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
            >
              {CORE_DISEASE_CATEGORIES.map((dis) => {
                const isSelected = selectedDisease === dis.id;
                return (
                  <button
                    key={dis.id}
                    type="button"
                    onClick={() => setSelectedDisease(dis.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 shadow-2xs ${
                      isSelected
                        ? 'border-2 border-emerald-700 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-600/30'
                        : 'border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700 bg-white'
                    }`}
                  >
                    <span className="text-xl p-1 rounded-lg bg-slate-100/80">{dis.icon}</span>
                    <div className="overflow-hidden">
                      <h5 className="text-[11px] font-bold leading-tight truncate">{dis.label}</h5>
                      <span className="text-[9px] text-slate-400 block truncate">{dis.sub}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sequential Products List for Selected Disease */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-800">
                  Formulations for Indication: <span className="text-emerald-800 font-extrabold">{selectedDisease}</span>
                </span>
                <span className="text-[11px] text-slate-500">Add one or multiple products below</span>
              </div>

              <div className="space-y-2">
                {diseaseProducts.map((prod) => {
                  const inCartItem = orderItems.find((it) => it.productId === prod.id || it.sku === prod.sku);
                  const inCartQty = inCartItem?.quantity || 0;

                  return (
                    <div
                      key={prod.id || prod.sku}
                      className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-600 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0 border border-emerald-200">
                          🧪
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{prod.name}</h5>
                          <p className="text-[10px] text-slate-500 font-mono">
                            SKU: {prod.sku} • {prod.dosageForm || 'Ayurvedic Regimen'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs">
                            <span className="line-through text-slate-400 font-mono text-[11px]">
                              MRP: ₹{Number(prod.mrpPrice).toLocaleString('en-IN')}
                            </span>
                            <span className="font-bold text-emerald-800 font-mono text-xs">
                              Standard: ₹{Number(prod.sellingPrice).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Save ₹{(Number(prod.mrpPrice) - Number(prod.sellingPrice)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {inCartQty > 0 ? (
                          <>
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Added (Qty: {inCartQty})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddProductToOrder(prod)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-300 transition-colors"
                            >
                              + Add More
                            </button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleAddProductToOrder(prod)}
                            className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Order</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: PRESCRIBED FORMULATIONS (EDITABLE PRICING KEPT) */}
          {/* ======================================================== */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🛒</span> Prescribed Formulations Cart (Negotiated Deal Pricing)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Adjust quantities and negotiated selling prices per formulation as agreed with the client.
                </p>
              </div>

              {orderItems.length > 0 && (
                <span className="text-[11px] text-amber-900 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  {orderItems.length} Formulation{orderItems.length > 1 ? 's' : ''} Added
                </span>
              )}
            </div>

            {orderItems.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No Formulations Added Yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select a disease indication above and click &quot;Add to Order&quot; on matching medicines.
                </p>
              </div>
            ) : (
              <div
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                className="border border-slate-200 rounded-2xl overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden shadow-xs"
              >
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Disease Indication</th>
                      <th className="p-3">Formulation Product</th>
                      <th className="p-3 text-center">Catalog MRP</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-center bg-amber-50 text-amber-950 border-x border-amber-200">
                        Selling Price (₹) <span className="text-[9px] block text-amber-800 font-semibold">Editable by Agent</span>
                      </th>
                      <th className="p-3 text-right">Line Total</th>
                      <th className="p-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {orderItems.map((item, idx) => {
                      const discount = Math.max(0, item.mrpPrice - item.unitPrice);
                      const lineTotal = item.unitPrice * item.quantity;
                      return (
                        <tr key={item.productId || item.sku} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              {item.disease}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 text-xs block">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-400 line-through">
                            ₹{item.mrpPrice.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={item.quantity}
                              onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                              className="w-12 text-center border border-slate-300 rounded-lg py-1 font-bold text-xs bg-white text-slate-900 shadow-2xs"
                            />
                          </td>
                          <td className="p-3 text-center bg-amber-50/70 border-x border-amber-200">
                            <div className="inline-flex items-center gap-1 justify-center">
                              <span className="text-xs font-bold text-amber-900">₹</span>
                              <input
                                type="number"
                                min={0}
                                value={item.unitPrice}
                                onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                                style={{ color: '#064e3b', backgroundColor: '#ffffff' }}
                                className="w-20 text-center border-2 border-amber-400 rounded-lg py-1 font-extrabold text-emerald-950 bg-white shadow-inner text-xs focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            {discount > 0 && (
                              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                                Deal discount: ₹{discount.toLocaleString('en-IN')} off
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-900 text-xs">
                            ₹{lineTotal.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1"
                              title="Remove Formulation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 4: PAYMENT METHOD & FINANCIAL CLEARANCE */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            
            {/* Logistics & Payment Options */}
            <div className="bg-slate-50/90 rounded-2xl p-4.5 border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🚚</span> Payment Mode & Dispatch
                </h5>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    paymentMode === 'HOLD'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}
                >
                  {paymentMode === 'CASH_ON_DELIVERY'
                    ? 'COD Selected'
                    : paymentMode === 'FACE_TO_FACE'
                    ? 'Face to Face'
                    : paymentMode === 'HOLD'
                    ? 'Hold Order'
                    : 'Prepaid'}
                </span>
              </div>

              {/* 4-Button Payment Method Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH_ON_DELIVERY')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border flex items-center justify-center gap-1.5 shadow-xs ${
                      paymentMode === 'CASH_ON_DELIVERY'
                        ? 'bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-600/40 shadow-emerald-900/20'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-sm">💵</span>
                    <span className="leading-tight">COD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('FACE_TO_FACE')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border flex items-center justify-center gap-1.5 shadow-xs ${
                      paymentMode === 'FACE_TO_FACE'
                        ? 'bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-600/40 shadow-emerald-900/20'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-sm">🤝</span>
                    <span className="leading-tight">Face to Face</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('PREPAID')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border flex items-center justify-center gap-1.5 shadow-xs ${
                      paymentMode === 'PREPAID'
                        ? 'bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-600/40 shadow-emerald-900/20'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-sm">💳</span>
                    <span className="leading-tight">Prepaid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('HOLD')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border flex items-center justify-center gap-1.5 shadow-xs ${
                      paymentMode === 'HOLD'
                        ? 'bg-amber-700 text-white border-amber-800 ring-2 ring-amber-500/40 shadow-amber-900/20'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-sm">⏸️</span>
                    <span className="leading-tight">Hold</span>
                  </button>
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Special Dosage or Delivery Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Call before delivery; take with warm milk..."
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-700 shadow-2xs"
                />
              </div>
            </div>

            {/* Financial Summary & Dispatch Order */}
            <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-2xl p-5 border border-emerald-800 flex flex-col justify-between shadow-md">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-emerald-200">
                  <span>Standard Catalog MRP:</span>
                  <span className="line-through font-mono">₹{totalCatalogMRP.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-300 font-semibold">
                  <span>Negotiated Deal Discount:</span>
                  <span className="font-mono">- ₹{totalDealDiscount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-200">
                  <span>Ayurvedic GST (12% Included):</span>
                  <span className="font-mono">₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-200">
                  <span>Express Courier Shipping:</span>
                  <span className="text-emerald-400 font-bold uppercase text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700">
                    FREE
                  </span>
                </div>

                <div className="border-t border-emerald-800/80 pt-3 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white block uppercase tracking-wider">Final Agreed Payable:</span>
                    <span className="text-[10px] text-amber-300">Locked for Order Dispatch</span>
                  </div>
                  <span className="text-2xl font-extrabold text-amber-400 font-mono">
                    ₹{totalAgreedSelling.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                variant="gold"
                size="lg"
                isLoading={isSubmitting}
                className="mt-4 w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold text-xs py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>Confirm &amp; Dispatch Order</span>
                <span>→</span>
              </Button>
            </div>

          </div>

        </form>
      </div>

    </div>
  );
}
