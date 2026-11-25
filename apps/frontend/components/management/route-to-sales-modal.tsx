'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { Button } from '../ui/button';
import {
  RotateCcw,
  X,
  AlertCircle,
  User,
  Package,
  CheckCircle2,
  Phone,
  Send,
  Sparkles,
} from 'lucide-react';

interface RouteToSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any | null;
  onSuccess: (data: any) => void;
}

export function RouteToSalesModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: RouteToSalesModalProps) {
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('');
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [shouldCancelOrder, setShouldCancelOrder] = useState(true);
  const [cancellationReason, setCancellationReason] = useState(
    'Client requested order cancellation (Price / Budget negotiation)',
  );
  const [directiveMessage, setDirectiveMessage] = useState('');
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active salespersons & customer's recent orders when opened
  useEffect(() => {
    if (isOpen && customer) {
      setError(null);
      setDirectiveMessage(
        `Customer called regarding order cancellation. Please call immediately to review dosage, address concerns, and offer a custom deal to retain the patient.`,
      );

      // 1. Fetch salespersons
      const fetchSales = async () => {
        try {
          setIsLoadingAgents(true);
          const res = await apiClient.get('/customers/salespersons/list');
          const agents = res.data?.data || res.data || [];
          setSalespersons(agents);

          // Find original salesperson from converted lead or order
          const originalCloserId =
            customer.convertedFrom?.assignedToId ||
            customer.orders?.[0]?.createdById ||
            (agents.length > 0 ? agents[0].id : '');

          if (originalCloserId) {
            setSelectedSalespersonId(originalCloserId);
          }
        } catch {
          // fallback
        } finally {
          setIsLoadingAgents(false);
        }
      };

      // 2. Fetch customer detailed orders to identify active order
      const fetchCustomerOrders = async () => {
        try {
          const res = await apiClient.get(`/customers/${customer.id}`);
          const detailedCust = res.data || customer;
          const orders = detailedCust.orders || [];
          const active = orders.find(
            (o: any) => o.status === 'CONFIRMED' || o.status === 'DRAFT' || o.status === 'PROCESSING',
          ) || orders[0] || null;
          setActiveOrder(active);
        } catch {
          setActiveOrder(customer.orders?.[0] || null);
        }
      };

      fetchSales();
      fetchCustomerOrders();
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalespersonId) {
      setError('Please select a sales consultant to receive this customer lead.');
      return;
    }
    if (!directiveMessage.trim()) {
      setError('Please write a particular directive message for the salesperson.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        orderId: shouldCancelOrder && activeOrder ? activeOrder.id : undefined,
        assignedSalespersonId: selectedSalespersonId,
        directiveMessage: directiveMessage.trim(),
        cancellationReason: shouldCancelOrder ? cancellationReason : undefined,
      };

      const res = await apiClient.post(`/customers/${customer.id}/route-to-sales`, payload);

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white p-5 flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 font-bold flex items-center justify-center text-lg shadow-sm">
              <RotateCcw className="w-5 h-5 text-emerald-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Route Customer Back to Sales Desk</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Panel: Management Recovery
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">Cancel active order, release inventory & re-assign to closer with direct instructions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-800 hover:bg-emerald-700 text-emerald-200 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient & Active Order Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Patient / Client Profile
                </span>
                <span className="font-extrabold text-slate-900 text-sm block">
                  {customer.fullName}
                </span>
                <span className="font-mono text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" /> +91 {customer.phoneNumber}
                  {customer.city && ` • ${customer.city}, ${customer.state || 'Gujarat'}`}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
                {customer.customerCode}
              </span>
            </div>

            {activeOrder ? (
              <div className="border-t border-slate-200/80 pt-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="font-bold text-slate-800 font-mono">{activeOrder.orderNumber}</span>
                    <span className="text-[10px] text-slate-500 block">
                      Status: <strong className="text-emerald-700 uppercase">{activeOrder.status}</strong> • ₹{Number(activeOrder.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  Target for Cancellation
                </span>
              </div>
            ) : (
              <div className="border-t border-slate-200/80 pt-2 text-[11px] text-slate-500 italic">
                No active orders currently pending. Customer will be routed as an urgent re-engagement lead.
              </div>
            )}
          </div>

          {/* 1. Order Cancellation & Stock Handling */}
          {activeOrder && (
            <div className="space-y-2 pt-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                1. Order Cancellation & Inventory Reversal
              </label>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-300">
                <input
                  type="checkbox"
                  id="cancelOrder"
                  checked={shouldCancelOrder}
                  onChange={(e) => setShouldCancelOrder(e.target.checked)}
                  className="w-4 h-4 text-emerald-800 rounded border-slate-300 focus:ring-emerald-700 cursor-pointer"
                />
                <label htmlFor="cancelOrder" className="font-bold text-slate-800 text-xs cursor-pointer">
                  Cancel Order <span className="font-mono text-amber-950 font-extrabold">{activeOrder.orderNumber}</span> and release reserved medicine batches back to Available Warehouse Inventory
                </label>
              </div>

              {shouldCancelOrder && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Cancellation Reason
                  </label>
                  <select
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl p-2 font-semibold text-xs focus:ring-2 focus:ring-emerald-700 shadow-sm"
                  >
                    <option value="Client requested order cancellation (Price / Budget negotiation)">
                      Client requested cancellation (Price / Budget negotiation)
                    </option>
                    <option value="Client wants to modify disease formulation or dosage">
                      Client wants to modify disease formulation or dosage
                    </option>
                    <option value="Client requested delayed dispatch / Follow-up required">
                      Client requested delayed dispatch / Follow-up required
                    </option>
                    <option value="Address or phone clarification needed before dispatch">
                      Address or phone clarification needed before dispatch
                    </option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 2. Assign to Specific Salesperson */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              2. Assign to Specific Sales Consultant <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedSalespersonId}
              onChange={(e) => setSelectedSalespersonId(e.target.value)}
              disabled={isLoadingAgents}
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 font-bold text-xs focus:ring-2 focus:ring-emerald-700 shadow-sm disabled:opacity-50"
            >
              {salespersons.length === 0 ? (
                <option value="">Loading sales consultants...</option>
              ) : (
                salespersons.map((agent) => (
                  <option
                    key={agent.id}
                    value={agent.id}
                    style={{ color: '#0f172a', backgroundColor: '#ffffff', fontWeight: 600 }}
                  >
                    {agent.firstName} {agent.lastName} ({agent.employeeCode}) {agent.isAcceptingLeads ? '• Active' : '• Off-duty'}
                  </option>
                ))
              )}
            </select>
            <p className="text-[10px] text-slate-500">
              Lead will be routed into this consultant&apos;s personal Calling Desk with <strong className="text-amber-800">URGENT</strong> recovery priority.
            </p>
          </div>

          {/* 3. Particular Management Message / Directive */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block flex items-center justify-between">
              <span>3. Particular Directive Message for Salesperson *</span>
              <span className="text-[10px] font-normal text-slate-400">Appears on Agent Calling Screen</span>
            </label>
            <textarea
              required
              rows={3}
              value={directiveMessage}
              onChange={(e) => setDirectiveMessage(e.target.value)}
              placeholder="e.g. Customer called stating ₹2,072 for 2 kits is above their monthly budget. They want to buy only 1 kit for now. Please call immediately and offer the single kit deal at ₹1,100 to retain the customer..."
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-emerald-700 shadow-sm"
            />
            <p className="text-[10px] text-slate-500">
              💡 This exact note will flash in an <strong className="text-amber-700">amber directive banner</strong> on the salesperson&apos;s calling dialer so they have full context before dialing.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>

            <Button
              type="submit"
              variant="gold"
              isLoading={isSubmitting}
              icon={<Send className="w-3.5 h-3.5" />}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 font-black text-xs px-4 py-2 rounded-xl shadow-md transition-all active:scale-95"
            >
              Confirm & Dispatch to Sales Desk →
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
