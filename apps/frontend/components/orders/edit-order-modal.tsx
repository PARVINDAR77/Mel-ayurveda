'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/button';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Package,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldAlert,
  Edit3,
  Clock,
  User,
  MapPin,
  Phone,
} from 'lucide-react';

interface OrderItemLine {
  productId: string;
  sku: string;
  name: string;
  mrpPrice: number;
  unitPrice: number;
  quantity: number;
  dosageInstructions?: string;
}

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onOrderUpdated?: (updatedOrder: any) => void;
}

export function EditOrderModal({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
}: EditOrderModalProps) {
  const { user } = useAuth();

  // Customer & Shipping
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Gujarat');
  const [pincode, setPincode] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH_ON_DELIVERY');
  const [orderStatus, setOrderStatus] = useState('CONFIRMED');

  // Items
  const [orderItems, setOrderItems] = useState<OrderItemLine[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Remarks
  const [approverRemarks, setApproverRemarks] = useState('');

  // Product Selection catalog
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isSalesperson = user?.role === 'SALESPERSON';
  const isApprovalOfficer = user?.role === 'APPROVAL_OFFICER';

  useEffect(() => {
    if (order) {
      setCustomerName(order.customer?.fullName || '');
      setPhoneNumber(order.customer?.phoneNumber || '');
      setAlternatePhone(order.customer?.alternatePhone || '');
      setShippingAddress(order.customer?.address || '');
      setCity(order.customer?.city || '');
      setState(order.customer?.state || 'Gujarat');
      setPincode(order.customer?.pincode || '');
      setPaymentMode(order.paymentMode || 'CASH_ON_DELIVERY');
      setOrderStatus(order.status || 'CONFIRMED');
      setDiscountAmount(Number(order.discountAmount) || 0);
      setApproverRemarks('');
      setError(null);
      setSuccessMsg(null);

      if (order.items && order.items.length > 0) {
        setOrderItems(
          order.items.map((it: any) => ({
            productId: it.productId || it.product?.id,
            sku: it.product?.sku || 'SKU',
            name: it.product?.name || 'Ayurvedic Product',
            mrpPrice: Number(it.product?.mrpPrice) || Number(it.unitPrice) * 1.3,
            unitPrice: Number(it.unitPrice),
            quantity: Number(it.quantity) || 1,
            dosageInstructions: it.dosageInstructions || 'As directed by physician',
          }))
        );
      } else {
        setOrderItems([]);
      }
    }
  }, [order, isOpen]);

  useEffect(() => {
    if (isOpen) {
      apiClient
        .get('/products?limit=100')
        .then((res) => {
          setAllProducts(res.data?.data || []);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  // Item modifications
  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setOrderItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: newQty } : item))
    );
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setOrderItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, unitPrice: newPrice } : item))
    );
  };

  const handleDosageChange = (index: number, newDosage: string) => {
    setOrderItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, dosageInstructions: newDosage } : item))
    );
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length <= 1) {
      setError('An order must contain at least one Ayurvedic formulation product.');
      return;
    }
    setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddSelectedProduct = () => {
    if (!selectedProductId) return;
    const prod = allProducts.find((p) => p.id === selectedProductId);
    if (!prod) return;

    // Check if already in order
    const exists = orderItems.some((it) => it.productId === prod.id);
    if (exists) {
      setOrderItems((prev) =>
        prev.map((it) => (it.productId === prod.id ? { ...it, quantity: it.quantity + 1 } : it))
      );
    } else {
      setOrderItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          mrpPrice: Number(prod.mrpPrice) || 2400,
          unitPrice: Number(prod.sellingPrice) || 1850,
          quantity: 1,
          dosageInstructions: prod.dosageInstructions || 'As directed by physician',
        },
      ]);
    }
    setSelectedProductId('');
    setIsAddingProduct(false);
  };

  // Calculations
  const calculatedSubtotal = orderItems.reduce(
    (acc, it) => acc + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1),
    0
  );
  const calculatedTax = Number((calculatedSubtotal * 0.12).toFixed(2));
  const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedTax - Number(discountAmount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (orderItems.length === 0) {
      setError('Please prescribe at least one formulation product.');
      return;
    }

    if (!approverRemarks.trim()) {
      setError(
        isSalesperson
          ? 'Please enter resolution notes explaining what you fixed before re-submitting to the approval desk.'
          : 'Please enter amendment remarks explaining the edits made to this order.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        customerName: customerName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        shippingAddress: shippingAddress.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        paymentMode,
        status: !isSalesperson ? orderStatus : undefined,
        discountAmount: Number(discountAmount) || 0,
        items: orderItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          dosageInstructions: it.dosageInstructions,
        })),
        approverRemarks: approverRemarks.trim(),
      };

      const res = await apiClient.patch(`/orders/${order.id}`, payload);
      setSuccessMsg('Order updated successfully. Reflecting changes in real-time.');
      setTimeout(() => {
        if (onOrderUpdated) onOrderUpdated(res.data);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-800 text-amber-300 font-bold">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {isSalesperson ? 'Fix & Re-submit Formulation Order' : 'Edit Formulation Order & Pricing'}
                </h3>
                <span className="font-mono text-xs bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Booked by Consultant: <span className="font-mono font-bold text-white">{order.createdBy?.employeeCode || 'Consultant'}</span> | Status: <span className="font-semibold text-amber-400">{order.status}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Existing Directives / Notes Banner */}
        {order.notes && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 max-h-24 overflow-y-auto">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                  Approval Desk Remarks & Chronological History:
                </span>
                <p className="font-mono whitespace-pre-line text-[11px] text-amber-900 mt-0.5">
                  {order.notes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Alerts */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-800">
          {/* Customer & Shipping Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <User className="h-3.5 w-3.5 text-forest-700" />
              Customer Details & Delivery Destination
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Primary Phone *</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono focus:border-forest-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Alternate Phone</label>
                <input
                  type="text"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono focus:border-forest-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">Delivery Address *</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">City / Town</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Postal Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono focus:border-forest-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Formulations & Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Package className="h-3.5 w-3.5 text-forest-700" />
                Prescribed Formulations & Negotiated Line Items ({orderItems.length})
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingProduct(true)}
                className="flex items-center gap-1 rounded bg-forest-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-forest-900 transition shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Product
              </button>
            </div>

            {/* Add Product Dropdown Bar */}
            {isAddingProduct && (
              <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                >
                  <option value="">-- Choose Formulation Product to Add --</option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Standard Price: ₹{p.sellingPrice}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleAddSelectedProduct}
                  disabled={!selectedProductId}
                >
                  Add to Prescription
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingProduct(false)}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Formulations Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2">Formulation</th>
                    <th className="px-3 py-2 w-24">Qty</th>
                    <th className="px-3 py-2 w-32">Unit Price (₹)</th>
                    <th className="px-3 py-2">Dosage Instructions</th>
                    <th className="px-3 py-2 w-28 text-right">Line Total</th>
                    <th className="px-2 py-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {orderItems.map((item, idx) => (
                    <tr key={`${item.productId}-${idx}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value, 10) || 1)}
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-center font-mono text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-400">₹</span>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-24 rounded border border-slate-300 pl-5 pr-1 py-1 font-mono text-xs text-slate-900 font-semibold focus:border-forest-600 focus:outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.dosageInstructions || ''}
                          onChange={(e) => handleDosageChange(idx, e.target.value)}
                          placeholder="e.g. 2 tabs before meals with warm water"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                        ₹{(Number(item.unitPrice || 0) * Number(item.quantity || 1)).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price Breakdown Footer */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 font-semibold"
                  >
                    <option value="CASH_ON_DELIVERY">Cash on Delivery (COD)</option>
                    <option value="UPI">UPI Pre-paid</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="ONLINE_GATEWAY">Online Payment Gateway</option>
                  </select>
                </div>
                {!isSalesperson && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Lifecycle Status</label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 font-semibold"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="CONFIRMED">CONFIRMED (Reserved)</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="SHIPPED">SHIPPED (In Transit)</option>
                      <option value="DELIVERED">DELIVERED (Fulfilled)</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Special Discount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="text-[11px] text-slate-500">
                  Subtotal: <span className="font-mono">₹{calculatedSubtotal.toFixed(2)}</span> | GST (12%): <span className="font-mono">₹{calculatedTax.toFixed(2)}</span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Grand Payable Total: <span className="text-base text-forest-800 font-black font-mono">₹{calculatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mandatory Remarks Section */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2">
            <label className="block font-bold text-indigo-950 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-indigo-700" />
              {isSalesperson
                ? 'Resolution & Rectification Clarification for Approver *'
                : 'Approval Authority Amendment Remarks *'}
            </label>
            <textarea
              rows={3}
              value={approverRemarks}
              onChange={(e) => setApproverRemarks(e.target.value)}
              placeholder={
                isSalesperson
                  ? 'Explain what changes were made in response to the approver directives (e.g. "Updated customer delivery address to house #42 and increased dosage to 2 tablets as instructed").'
                  : 'Specify reason for modifications (e.g. "Adjusted selling price to authorized tier; altered dosage instruction for Joint Pain regimen").'
              }
              className="w-full rounded-md border border-indigo-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              required
            />
            <p className="text-[11px] text-indigo-800">
              * This note is appended chronologically to the order timeline and immediately dispatched as a push alert.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="bg-forest-800 hover:bg-forest-900 text-white font-bold px-5"
            >
              {isSalesperson ? 'Save & Re-submit Order' : 'Save Order Amendments'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
