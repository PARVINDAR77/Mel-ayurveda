'use client';

import React, { useState } from 'react';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  X,
  User,
  Calendar,
  Phone,
  HelpCircle,
  Share2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: (newLead: any) => void;
}

const LEAD_SOURCES = [
  { id: 'FACEBOOK_ADS', label: 'Facebook Ads', icon: '📘', color: 'border-blue-500 bg-blue-50/50 text-blue-900' },
  { id: 'INSTAGRAM_ADS', label: 'Instagram Ads', icon: '📸', color: 'border-pink-500 bg-pink-50/50 text-pink-900' },
  { id: 'GOOGLE_ADS', label: 'Google Ads', icon: '🔍', color: 'border-amber-500 bg-amber-50/50 text-amber-900' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: '💬', color: 'border-emerald-500 bg-emerald-50/50 text-emerald-900' },
  { id: 'WEBSITE', label: 'Website Inquiry', icon: '🌐', color: 'border-purple-500 bg-purple-50/50 text-purple-900' },
  { id: 'MANUAL', label: 'Referral / Direct', icon: '👥', color: 'border-slate-400 bg-slate-50 text-slate-800' },
];

export function CreateLeadModal({ isOpen, onClose, onLeadCreated }: CreateLeadModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [inquiryDate, setInquiryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [reason, setReason] = useState('');
  const [sourceType, setSourceType] = useState('FACEBOOK_ADS');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Gujarat');
  const [address, setAddress] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate 10-digit primary phone
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit primary mobile number.');
      return;
    }

    let cleanAlt: string | undefined = undefined;
    if (alternatePhone.trim()) {
      cleanAlt = alternatePhone.replace(/\D/g, '').slice(-10);
      if (cleanAlt.length !== 10) {
        setError('Alternative mobile must be a valid 10-digit number.');
        return;
      }
    }

    try {
      setIsLoading(true);
      const payload = {
        customerName: customerName.trim(),
        phoneNumber: cleanPhone,
        alternatePhone: cleanAlt,
        notes: reason.trim(),
        customerRequirements: reason.trim(),
        sourceType,
        inquiryDate,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        address: address.trim() || undefined,
      };

      const res = await apiClient.post('/leads/manual', payload);
      onLeadCreated(res.data);
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white p-5 flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 font-bold flex items-center justify-center text-lg shadow-sm">
              📋
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Register New Customer Lead</h3>
              <p className="text-xs text-emerald-200/80">Inbound sales triage • Auto-assigned to your tele-sales desk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-800 hover:bg-emerald-700 text-emerald-200 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Candidate Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Candidate / Patient Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rameshwar Patidar"
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 font-bold shadow-sm"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            {/* 2. Today's Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Inquiry Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={inquiryDate}
                  onChange={(e) => setInquiryDate(e.target.value)}
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 font-bold shadow-sm"
                />
              </div>
            </div>

            {/* 3. Primary Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Primary Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">+91</span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit number"
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full pl-11 pr-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 font-bold tracking-wide shadow-sm"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            {/* 4. Alternative Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Alternative Mobile Number (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Secondary / Family contact"
                  style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  className="w-full pl-11 pr-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 font-bold tracking-wide shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* 5. Why this came (Reason for inquiry / Chief Concern) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Why this lead came / Chief Health Concern <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why patient contacted us, symptoms, condition duration (e.g. Joint pain in knees for 6 months, looking for Ayurvedic oil & tablets)..."
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full px-3 py-2 text-xs bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 font-medium shadow-sm"
            />
            <p className="text-[11px] text-slate-500 mt-0.5">Captures the clinical reason to assist doctors and closing agents during consultation.</p>
          </div>

          {/* 6. Source of Lead (Selectable Chips) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Source of Lead <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LEAD_SOURCES.map((src) => {
                const isSelected = sourceType === src.id;
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setSourceType(src.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all text-left ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">{src.icon}</span>
                    <span className="truncate">{src.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location fields */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Ahmedabad"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Gujarat"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
            >
              Save Lead & Start Call →
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
