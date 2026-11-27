'use client';

import React from 'react';
import {
  X,
  Award,
  Sparkles,
  TrendingUp,
  PhoneCall,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  FileCheck2,
  HeartHandshake,
} from 'lucide-react';

interface IncentiveRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IncentiveRulesModal({ isOpen, onClose }: IncentiveRulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#071912] to-[#0f2e22] text-white p-5 border-b border-emerald-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Melayurveda Incentive & Commission Rules</h3>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                Executive formula specification for staff productivity payouts & quota targets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto bg-slate-50">
          {/* Salesperson Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Ayurvedic Sales Consultants (Tele-Sales)
              </h4>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200">
                <div>
                  <span className="font-bold text-slate-900">Base Sales Commission</span>
                  <p className="text-[11px] text-slate-500">Calculated directly on total realized order value</p>
                </div>
                <span className="font-mono font-extrabold text-sm text-emerald-800 bg-white px-2.5 py-1 rounded border border-emerald-300">
                  3.0% of Revenue
                </span>
              </div>

              <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200">
                <span className="font-bold text-slate-900 block mb-1.5">Monthly Milestone Sales Targets</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white p-2 rounded border border-amber-200 text-center">
                    <span className="text-[10px] text-slate-500 block">≥ ₹50,000 MTD</span>
                    <span className="font-bold text-amber-800 text-xs">+₹1,500 Bonus</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-amber-200 text-center">
                    <span className="text-[10px] text-slate-500 block">≥ ₹1,00,000 MTD</span>
                    <span className="font-bold text-amber-800 text-xs">+₹4,000 Bonus</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-amber-200 text-center">
                    <span className="text-[10px] text-slate-500 block">≥ ₹2,00,000 MTD</span>
                    <span className="font-bold text-amber-800 text-xs">+₹10,000 Bonus</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900">Calling Volume Productivity</span>
                  <p className="text-[11px] text-slate-500">≥ 35 calls in a single day OR ≥ 600 calls / month</p>
                </div>
                <span className="font-mono font-bold text-xs text-slate-800 bg-white px-2 py-1 rounded border border-slate-300">
                  +₹150 / day OR +₹2,500 / mo
                </span>
              </div>
            </div>
          </div>

          {/* Clinical & Support Operations */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <FileCheck2 className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. Clinical Approval Doctors & Operations Support
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">APPROVAL DOCTORS</span>
                <span className="font-extrabold text-sm text-emerald-800 block">₹25 / Case</span>
                <span className="text-[10px] text-slate-400">Clinical sign-off completed</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">CARE FOLLOW-UP</span>
                <span className="font-extrabold text-sm text-amber-800 block">₹40 / Client</span>
                <span className="text-[10px] text-slate-400">Completed care consultation</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">BILLING SPECIALISTS</span>
                <span className="font-extrabold text-sm text-blue-800 block">₹15 / Bill</span>
                <span className="text-[10px] text-slate-400">GST Invoice released to dispatch</span>
              </div>
            </div>
          </div>

          {/* Compliance Banner */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Automated Mathematical Accuracy</span>
              <p className="text-[11px] text-emerald-800/90 mt-0.5">
                All metrics are computed in real time directly from immutable PostgreSQL CallLogs, Orders, and LeadAssignments. No manual spreadsheets or tampering.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Close Rules Summary
          </button>
        </div>
      </div>
    </div>
  );
}
