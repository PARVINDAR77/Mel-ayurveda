'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Check,
  PhoneCall,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Boxes,
  KeyRound,
  Clock,
  HeartHandshake,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';

interface SeededPersona {
  role: string;
  name: string;
  panelLabel: string;
  roleDisplayName: string;
  code: string;
  email: string;
  pass: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
  icon: React.ReactNode;
}

const SEEDED_PERSONAS: SeededPersona[] = [
  {
    role: 'SUPER_ADMIN',
    panelLabel: 'Panel 01',
    roleDisplayName: 'Super Admin',
    name: 'Executive Admin',
    code: 'MEL-ADM-001',
    email: 'admin@melayurveda.com',
    pass: 'Melayurveda@Admin2026!',
    badgeBg: 'bg-emerald-100/80',
    badgeText: 'text-emerald-800',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    iconBorder: 'border-emerald-200/80',
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    role: 'SALESPERSON',
    panelLabel: 'Panel 02',
    roleDisplayName: 'Sales Consultant',
    name: 'Ramesh Patel',
    code: 'MEL-SAL-001',
    email: 'ramesh.patel@melayurveda.com',
    pass: 'BrandNewRameshPassword2026!',
    badgeBg: 'bg-blue-100/80',
    badgeText: 'text-blue-800',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-700',
    iconBorder: 'border-blue-200/80',
    icon: <PhoneCall className="h-4 w-4" />,
  },
  {
    role: 'APPROVAL_OFFICER',
    panelLabel: 'Panel 03',
    roleDisplayName: 'Approval Officer',
    name: 'Amit Desai',
    code: 'MEL-APR-001',
    email: 'amit.desai@melayurveda.com',
    pass: 'ApprovalPassword2026!',
    badgeBg: 'bg-purple-100/80',
    badgeText: 'text-purple-800',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-700',
    iconBorder: 'border-purple-200/80',
    icon: <FileCheck2 className="h-4 w-4" />,
  },
  {
    role: 'BILLING_EXECUTIVE',
    panelLabel: 'Panel 04',
    roleDisplayName: 'Billing Desk',
    name: 'Ram Patel',
    code: 'MEL-BIL-001',
    email: 'billing@melayurveda.com',
    pass: 'Melayurveda@Admin2026!',
    badgeBg: 'bg-indigo-100/80',
    badgeText: 'text-indigo-800',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-700',
    iconBorder: 'border-indigo-200/80',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    role: 'MANAGEMENT',
    panelLabel: 'Panel 05',
    roleDisplayName: 'Operations Head',
    name: 'Neha Mehta',
    code: 'MEL-MGT-001',
    email: 'neha.mehta@melayurveda.com',
    pass: 'MgmtPassword2026!',
    badgeBg: 'bg-teal-100/80',
    badgeText: 'text-teal-800',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-700',
    iconBorder: 'border-teal-200/80',
    icon: <Boxes className="h-4 w-4" />,
  },
  {
    role: 'FOLLOWUP_EXECUTIVE',
    panelLabel: 'Panel 06',
    roleDisplayName: 'Follow-Up Care',
    name: 'Divya Patel',
    code: 'MEL-FLW-001',
    email: 'divya.care@melayurveda.com',
    pass: 'Melayurveda@Admin2026!',
    badgeBg: 'bg-rose-100/80',
    badgeText: 'text-rose-800',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-700',
    iconBorder: 'border-rose-200/80',
    icon: <HeartHandshake className="h-4 w-4" />,
  },
];

function LoginContent() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get('expired') === 'true';

  const [email, setEmail] = useState('admin@melayurveda.com');
  const [password, setPassword] = useState('Melayurveda@Admin2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>('MEL-ADM-001');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showExpiredNotice, setShowExpiredNotice] = useState(isExpired);

  useEffect(() => {
    if (isExpired) {
      setShowExpiredNotice(true);
    }
  }, [isExpired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Invalid email or password. Please verify credentials.');
      setIsLoading(false);
    }
  };

  const handleSelectPersona = (persona: SeededPersona) => {
    setEmail(persona.email);
    setPassword(persona.pass);
    setSelectedCode(persona.code);
    setError(null);
  };

  return (
    <div className="flex min-h-screen lg:h-screen w-full flex-col lg:flex-row bg-[#06150f] overflow-x-hidden lg:overflow-hidden select-none">
      {/* Brand Hero Side (Left 50% - Rich Botanical Deep Forest Canvas) */}
      <div className="relative flex flex-col justify-between p-6 sm:p-10 lg:p-12 text-white lg:w-1/2 bg-gradient-to-br from-[#04120b] via-[#072015] to-[#030e08] border-b lg:border-b-0 lg:border-r border-emerald-900/40 overflow-hidden">
        {/* Soft Ambient Radial Glows */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-500/15 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />

        {/* Brand Top Header with Official Logo Card */}
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Official Melayurveda Logo Card Presentation */}
            <div className="bg-white rounded-2xl px-5 py-3 shadow-xl border border-amber-400/40 inline-flex items-center justify-center overflow-hidden hover:shadow-2xl transition-all duration-300 max-w-[280px] sm:max-w-[320px] group">
              <img
                src="/images/melayurveda-logo.png"
                alt="Mel Ayurveda - Nature Se Nirog, Ayurveda Se Swasth"
                className="w-full h-auto max-h-12 object-contain group-hover:scale-[1.02] transition-transform duration-300"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-emerald-950/80 text-amber-300 border border-amber-400/30 backdrop-blur-sm shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Enterprise CRM Core
              </span>
            </div>
          </div>

          <div className="mt-7 sm:mt-9 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/70 px-3.5 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>Ayurvedic Medicine & Formulations Tele-Sales Engine</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black tracking-tight text-white leading-tight">
              6-Panel Precision Ayurvedic Product & Medicine Sales Platform
            </h1>

            <p className="max-w-lg text-xs sm:text-sm leading-relaxed text-slate-300">
              Direct-to-consumer Ayurvedic medicine sales operations. Complete 6-panel pipeline:
              lead qualification, prescription safety audits, commercial clearance, Gujarat GST tax
              invoicing, real-time warehouse fulfillment, and post-purchase patient refill care.
            </p>
          </div>

          {/* Operational 6-Panel Security Architecture */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between max-w-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-amber-400" />
                Operational 6-Panel Security Architecture
              </p>
              <span className="text-[10px] text-emerald-400/80 font-mono">100% Role-Isolated</span>
            </div>

            <div className="space-y-1.5 max-w-lg">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07] hover:border-emerald-500/30">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                  01
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 01: Super Admin</span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">Executive Control & Ingestion</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07] hover:border-blue-500/30">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-500/30">
                  02
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 02: Salesperson</span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">Medicine Calling (0% Source Leak)</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07] hover:border-purple-500/30">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                  03
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 03: Approval Officer</span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">Doctor Clinical Review & Clearance</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07] hover:border-indigo-500/30">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-[10px] border border-indigo-500/30">
                  04
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 04: Billing Desk</span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">Gujarat GST Tax Invoicing & Stock</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07] hover:border-teal-500/30">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300 font-bold text-[10px] border border-teal-500/30">
                  05
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 05: Management & Operations</span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">Dispatch Logistics & Return Orders</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07] hover:border-rose-500/30">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-500/30">
                  06
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 06: Follow-Up Care Desk</span>
                  <span className="text-[11px] text-rose-300 font-medium truncate ml-2">Patient Refills, Wellness & Care</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Regulatory Badges */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>100% Zero Source Leak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Ayush Regimen Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Gujarat GST Invoicing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Immutable Audit Trail</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Side (Right 50% - Elegant Elevated Canvas) */}
      <div className="flex flex-1 flex-col justify-center bg-gradient-to-br from-[#f8faf9] via-[#f1f6f3] to-[#eaf2ee] px-4 py-8 sm:px-8 lg:px-12 overflow-y-auto">
        <div className="mx-auto w-full max-w-[480px]">
          {/* Main Elevated Card Container */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xl shadow-emerald-950/5">
            {/* Header with Melayurveda Emblem & Title */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50/50 to-white p-1.5 shadow-2xs border border-amber-300/80">
                  <img
                    src="/images/melayurveda-emblem.png"
                    alt="Mel Ayurveda Emblem"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Sign In to Panel
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Enter your credentials or click a quick-switch test persona below.
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-200/80">
                <KeyRound className="h-3 w-3 text-emerald-600" />
                <span>Secure Gate</span>
              </div>
            </div>

            {/* Session Timeout Banner */}
            {showExpiredNotice && (
              <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                <Clock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block">Session Timeout</span>
                  <span>Your secure session has expired. Please authenticate to continue.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExpiredNotice(false)}
                  className="text-amber-600 hover:text-amber-800 font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Error Notice */}
            {error && (
              <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Credentials Inputs */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSelectedCode('');
                    }}
                    placeholder="employee@melayurveda.com"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-700/20 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setSelectedCode('');
                    }}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-10 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-700/20 transition font-mono tracking-wider"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2 bg-gradient-to-r from-[#0d4a2d] via-[#0f5434] to-[#0a3a23] hover:from-[#0b3e26] hover:to-[#082e1c] text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-950/15 flex items-center justify-center gap-2 transition active:scale-[0.99]"
                isLoading={isLoading}
                icon={<ArrowRight className="h-4 w-4 text-amber-300" />}
              >
                Sign In to Panel
              </Button>
            </form>

            {/* Quick Switch Persona (Balanced 2-Column x 3-Row Grid) */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Quick Switch Persona (Dev / QA Mode)
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  One-Click Auto Login
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SEEDED_PERSONAS.map((p) => {
                  const isSelected = selectedCode === p.code;

                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => handleSelectPersona(p)}
                      className={`relative flex items-center gap-2.5 text-left rounded-xl border p-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/90 ring-1.5 ring-emerald-500 shadow-xs'
                          : 'border-slate-200/90 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {/* Left icon with custom role colors */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : `${p.iconBg} ${p.iconColor} ${p.iconBorder}`
                        }`}
                      >
                        {p.icon}
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap ${p.badgeBg} ${p.badgeText}`}
                          >
                            {p.panelLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 truncate whitespace-nowrap">
                            {p.code}
                          </span>
                        </div>
                        <div className="font-semibold text-xs text-slate-900 truncate leading-snug">
                          {p.roleDisplayName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate leading-tight">
                          {p.name}
                        </div>
                      </div>

                      {/* Top-Right Absolute Check Badge - never pushes or squeezes text */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Security Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Melayurveda India Pvt. Ltd.</span>
              <span className="font-mono">v0.1.0 • AES-256 / Argon2id</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#06150f] text-white">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span className="text-sm font-medium">Loading Melayurveda Portal...</span>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
