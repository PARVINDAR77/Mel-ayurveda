'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import {
  PhoneCall,
  Phone,
  CheckCircle2,
  CalendarClock,
  RotateCcw,
  PhoneOff,
  AlertTriangle,
  MapPin,
  Package,
  Boxes,
  DollarSign,
  Truck,
  User,
  Clock,
  Info,
} from 'lucide-react';

interface OFDCallingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: any | null;
  onSuccess: () => void;
}

export function OFDCallingModal({
  isOpen,
  onClose,
  shipment,
  onSuccess,
}: OFDCallingModalProps) {
  const [callOutcome, setCallOutcome] = useState<
    'DELIVERED_CONFIRMED' | 'RE_ATTEMPT_SCHEDULED' | 'DOORSTEP_REFUSED' | 'CUSTOMER_UNREACHABLE'
  >('DELIVERED_CONFIRMED');

  const [codAmountCollected, setCodAmountCollected] = useState<string>('');
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('CUSTOMER_NOT_HOME');
  const [refusalReason, setRefusalReason] = useState<string>('CUSTOMER_REFUSED');
  const [customerRemarks, setCustomerRemarks] = useState<string>('');
  const [callNotes, setCallNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults whenever shipment changes
  useEffect(() => {
    if (shipment) {
      const orderTotal = shipment.order?.invoice?.grandTotal || shipment.order?.totalAmount || 0;
      setCodAmountCollected(String(orderTotal));
      setCallOutcome(
        shipment.ofdCallStatus === 'DOORSTEP_REFUSED'
          ? 'DOORSTEP_REFUSED'
          : shipment.ofdCallStatus === 'RE_ATTEMPT_SCHEDULED'
          ? 'RE_ATTEMPT_SCHEDULED'
          : shipment.ofdCallStatus === 'DELIVERED_CONFIRMED'
          ? 'DELIVERED_CONFIRMED'
          : 'DELIVERED_CONFIRMED'
      );
      setCallNotes(shipment.ofdCallNotes || '');
      setCustomerRemarks(shipment.ofdCustomerReason || '');
      
      // Default reschedule date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setRescheduleDate(tomorrow.toISOString().split('T')[0]);
      setError(null);
    }
  }, [shipment]);

  if (!shipment) return null;

  const order = shipment.order;
  const customer = order?.customer;
  const isCod = order?.paymentMode === 'CASH_ON_DELIVERY';
  const grandTotal = order?.invoice?.grandTotal || order?.totalAmount || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validation
    if (callOutcome === 'DOORSTEP_REFUSED' && !customerRemarks.trim()) {
      setError('Please enter mandatory customer remarks explaining why the parcel was refused.');
      return;
    }

    if (callOutcome === 'RE_ATTEMPT_SCHEDULED' && !rescheduleDate) {
      setError('Please choose a valid re-attempt delivery date.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post(`/dispatch/ofd/${shipment.id}/log-call`, {
        callOutcome,
        callNotes: callNotes.trim() || undefined,
        customerRemarks:
          callOutcome === 'DOORSTEP_REFUSED'
            ? `[Reason: ${refusalReason}] ${customerRemarks.trim()}`
            : callOutcome === 'RE_ATTEMPT_SCHEDULED'
            ? `[Re-attempt Reason: ${rescheduleReason}] ${customerRemarks.trim()}`
            : customerRemarks.trim() || undefined,
        rescheduleDate: callOutcome === 'RE_ATTEMPT_SCHEDULED' ? rescheduleDate : undefined,
        codAmountCollected:
          callOutcome === 'DELIVERED_CONFIRMED' && isCod && codAmountCollected
            ? parseFloat(codAmountCollected)
            : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Doorstep Delivery Call (COF Desk)"
      description={`Order #${order?.orderNumber || 'N/A'} • Consignment AWB: ${shipment.trackingAwb || 'N/A'}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-1">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Customer & Consignment Dossier Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shadow-sm">
                {customer?.fullName ? customer.fullName.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                  {customer?.fullName || 'Valued Patient'}
                  <span className="text-xs font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                    {customer?.customerCode || 'PATIENT'}
                  </span>
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {customer?.city || 'City'}, {customer?.state || 'State'} (PIN: {customer?.pincode || 'N/A'})
                  </span>
                </div>
              </div>
            </div>

            {/* Click to Call Button */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${customer?.phoneNumber}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
              >
                <PhoneCall className="w-4 h-4 animate-pulse" />
                <span>Call {customer?.phoneNumber}</span>
              </a>
              {customer?.alternatePhone && (
                <a
                  href={`tel:${customer?.alternatePhone}`}
                  title="Alternate Phone"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-all"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Alt: {customer?.alternatePhone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block font-medium">Order Value</span>
              <span className="text-slate-900 font-bold text-sm">₹{Number(grandTotal).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block font-medium">Payment Mode</span>
              <Badge variant={isCod ? 'warning' : 'success'} className="mt-0.5 text-[10px]">
                {isCod ? 'CASH ON DELIVERY' : 'PREPAID ONLINE'}
              </Badge>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block font-medium">Courier Partner</span>
              <span className="text-slate-800 font-semibold flex items-center gap-1 truncate">
                <Truck className="w-3.5 h-3.5 text-blue-500" />
                {shipment.courierPartner || 'Delhivery'}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400 block font-medium">Call Attempts</span>
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Attempt #{(shipment.ofdCallAttempts || 0) + 1}
              </span>
            </div>
          </div>

          {/* Medicine Items summary */}
          {order?.items && order.items.length > 0 && (
            <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-xs">
              <span className="text-slate-400 font-medium block mb-1">Prescribed Formulations:</span>
              <div className="flex flex-wrap gap-1.5">
                {order.items.map((item: any, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-medium"
                  >
                    <Boxes className="w-3 h-3 text-emerald-600" />
                    {item.product?.name || 'Ayurvedic Medicine'} × {item.quantity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Call Disposition / Outcome Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Select Customer Call Outcome <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Delivered Confirmed */}
            <div
              onClick={() => setCallOutcome('DELIVERED_CONFIRMED')}
              className={`cursor-pointer rounded-xl border-2 p-3 transition-all flex items-start space-x-3 ${
                callOutcome === 'DELIVERED_CONFIRMED'
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  callOutcome === 'DELIVERED_CONFIRMED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Parcel Picked & Delivered</span>
                  {callOutcome === 'DELIVERED_CONFIRMED' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer confirmed parcel received & payment completed
                </p>
              </div>
            </div>

            {/* Re-Attempt Scheduled */}
            <div
              onClick={() => setCallOutcome('RE_ATTEMPT_SCHEDULED')}
              className={`cursor-pointer rounded-xl border-2 p-3 transition-all flex items-start space-x-3 ${
                callOutcome === 'RE_ATTEMPT_SCHEDULED'
                  ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  callOutcome === 'RE_ATTEMPT_SCHEDULED'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <CalendarClock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Re-Attempt Requested</span>
                  {callOutcome === 'RE_ATTEMPT_SCHEDULED' && (
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client requested delivery tomorrow / next date
                </p>
              </div>
            </div>

            {/* Refused at Doorstep */}
            <div
              onClick={() => setCallOutcome('DOORSTEP_REFUSED')}
              className={`cursor-pointer rounded-xl border-2 p-3 transition-all flex items-start space-x-3 ${
                callOutcome === 'DOORSTEP_REFUSED'
                  ? 'border-red-500 bg-red-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  callOutcome === 'DOORSTEP_REFUSED'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Doorstep Refused (Send RTO)</span>
                  {callOutcome === 'DOORSTEP_REFUSED' && (
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client refused parcel. Auto-routes to Return & RTO Desk
                </p>
              </div>
            </div>

            {/* Customer Unreachable */}
            <div
              onClick={() => setCallOutcome('CUSTOMER_UNREACHABLE')}
              className={`cursor-pointer rounded-xl border-2 p-3 transition-all flex items-start space-x-3 ${
                callOutcome === 'CUSTOMER_UNREACHABLE'
                  ? 'border-slate-500 bg-slate-100 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  callOutcome === 'CUSTOMER_UNREACHABLE'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <PhoneOff className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Phone Unreachable</span>
                  {callOutcome === 'CUSTOMER_UNREACHABLE' && (
                    <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  No answer, ringing, switched off or disconnected
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Context Fields based on Outcome */}

        {/* Case 1: Delivered Confirmed */}
        {callOutcome === 'DELIVERED_CONFIRMED' && (
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
            <h5 className="font-semibold text-emerald-950 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Fulfill Order & Settle COD Collection
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cash Collected at Doorstep (₹) {isCod && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={codAmountCollected}
                    onChange={(e) => setCodAmountCollected(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
                    required={isCod}
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {isCod ? 'Total COD balance expected from courier driver.' : 'Prepaid order: Amount recorded as settled.'}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Recipient Name / Notes
                </label>
                <input
                  type="text"
                  value={customerRemarks}
                  onChange={(e) => setCustomerRemarks(e.target.value)}
                  placeholder="e.g. Received by patient directly / family member"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Case 2: Re-attempt Scheduled */}
        {callOutcome === 'RE_ATTEMPT_SCHEDULED' && (
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
            <h5 className="font-semibold text-amber-950 text-sm flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-amber-600" />
              Coordinate Delivery Re-Attempt with Courier
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reschedule Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reschedule Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="CUSTOMER_NOT_HOME">Customer Not Available at Address</option>
                  <option value="OUT_OF_STATION">Customer Temporarily Out of Town</option>
                  <option value="CASH_NOT_READY">COD Cash Not Arranged Yet</option>
                  <option value="DELIVERY_TIME_REQUEST">Requested Specific Delivery Time Window</option>
                  <option value="COURIER_DELAY">Courier Hub Delayed Delivery</option>
                  <option value="OTHER">Other Custom Reason</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Customer Instructions for Courier Driver
              </label>
              <input
                type="text"
                value={customerRemarks}
                onChange={(e) => setCustomerRemarks(e.target.value)}
                placeholder="e.g. Call before coming after 4 PM, client will have cash ready"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* Case 3: Doorstep Refused */}
        {callOutcome === 'DOORSTEP_REFUSED' && (
          <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="font-semibold text-red-950 text-sm flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                  Doorstep Refusal: Auto-Route to Return & RTO Desk
                </h5>
                <p className="text-xs text-red-700 mt-0.5">
                  This parcel will be marked RTO and sent directly into the Return & RTO Desk for investigation and restocking.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Refusal Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={refusalReason}
                  onChange={(e) => setRefusalReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="CUSTOMER_REFUSED">Customer Outright Refused at Door</option>
                  <option value="FINANCIAL_ISSUE">Financial Emergency / Cannot Afford</option>
                  <option value="PRICE_DISPUTE">Price / Discount Mismatch Dispute</option>
                  <option value="NOT_ORDERED">Denies Placing Ayurvedic Order</option>
                  <option value="DELAYED_DELIVERY">Delivery Delayed / No Longer Needed</option>
                  <option value="BOUGHT_ALTERNATE">Purchased Local Medicine Instead</option>
                  <option value="PACKAGE_DAMAGED">Package Damaged in Transit</option>
                  <option value="OTHER">Other Custom Refusal Reason</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mandatory Customer Remarks <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerRemarks}
                  onChange={(e) => setCustomerRemarks(e.target.value)}
                  placeholder="Record customer exact words / reasoning..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* General Call Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Internal Operations Log / Staff Calling Notes
          </label>
          <textarea
            rows={2}
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="Add operational notes about caller discussion, courier feedback, or next action..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            isLoading={isSubmitting}
            className={`font-semibold shadow-sm ${
              callOutcome === 'DELIVERED_CONFIRMED'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : callOutcome === 'DOORSTEP_REFUSED'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : callOutcome === 'RE_ATTEMPT_SCHEDULED'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            {callOutcome === 'DELIVERED_CONFIRMED' && 'Confirm Delivery & Mark Paid →'}
            {callOutcome === 'RE_ATTEMPT_SCHEDULED' && 'Schedule Courier Re-Attempt →'}
            {callOutcome === 'DOORSTEP_REFUSED' && 'Escalate to Return & RTO Desk →'}
            {callOutcome === 'CUSTOMER_UNREACHABLE' && 'Log Unreachable & Retry Later →'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
