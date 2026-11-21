'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Leaf,
  CheckCircle2,
  PhoneCall,
  ClipboardCheck,
  FileCheck2,
  Boxes,
  KeyRound,
  Clock,
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
  badgeBorder: string;
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
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />,
  },
  {
    role: 'SALESPERSON',
    panelLabel: 'Panel 02',
    roleDisplayName: 'Sales Rep',
    name: 'Ramesh Patel',
    code: 'MEL-SAL-001',
    email: 'ramesh.patel@melayurveda.com',
    pass: 'BrandNewRameshPassword2026!',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    icon: <PhoneCall className="h-4 w-4 text-blue-600" />,
  },
  {
    role: 'PENDING_REVIEWER',
    panelLabel: 'Panel 03',
    roleDisplayName: 'Pending Reviewer',
    name: 'Priya Sharma',
    code: 'MEL-PND-001',
    email: 'priya.sharma@melayurveda.com',
    pass: 'PendingPassword2026!',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    icon: <ClipboardCheck className="h-4 w-4 text-amber-600" />,
  },
  {
    role: 'APPROVAL_OFFICER',
    panelLabel: 'Panel 04',
    roleDisplayName: 'Approval Officer',
    name: 'Amit Desai',
    code: 'MEL-APR-001',
    email: 'amit.desai@melayurveda.com',
    pass: 'ApprovalPassword2026!',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    icon: <FileCheck2 className="h-4 w-4 text-purple-600" />,
  },
  {
    role: 'MANAGEMENT',
    panelLabel: 'Panel 05',
    roleDisplayName: 'Management',
    name: 'Neha Mehta',
    code: 'MEL-MGT-001',
    email: 'neha.mehta@melayurveda.com',
    pass: 'MgmtPassword2026!',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    badgeBorder: 'border-teal-200',
    icon: <Boxes className="h-4 w-4 text-teal-600" />,
  },
];

function LoginContent() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get('expired') === 'true';

  const [email, setEmail] = useState('admin@melayurveda.com');
  const [password, setPassword] = useState('Melayurveda@Admin2026!');
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
    <div className="flex min-h-screen lg:h-screen w-full flex-col lg:flex-row bg-[#081711] overflow-x-hidden lg:overflow-hidden select-none">
      {/* Brand Hero Side (Left 50% - Elegant Deep Forest Botanical Aesthetic) */}
      <div className="relative flex flex-col justify-between p-6 sm:p-10 lg:p-12 text-white lg:w-1/2 bg-gradient-to-br from-[#06150e] via-[#092217] to-[#04100b] border-b lg:border-b-0 lg:border-r border-emerald-950/60">
        {/* Soft Ambient Radial Lights */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Brand Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-forest-800 text-amber-300 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/30">
              <Leaf className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-xl sm:text-2xl font-black tracking-widest text-white leading-tight">
                MELAYURVEDA
              </span>
              <span className="block text-[11px] font-bold tracking-widest text-amber-400 uppercase">
                Enterprise Ayurvedic CRM
              </span>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/50 px-3 py-1 text-xs font-medium text-emerald-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Ayurvedic Medicine & Formulations Tele-Sales CRM</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
              5-Panel Precision Ayurvedic Product & Medicine Sales Platform
            </h1>

            <p className="max-w-lg text-xs sm:text-sm leading-relaxed text-slate-300">
              Direct-to-consumer Ayurvedic medicine sales operations. Complete multi-panel pipeline:
              lead qualification, prescription safety audits, commercial clearance, Gujarat GST tax
              invoicing, and real-time warehouse fulfillment.
            </p>
          </div>

          {/* Connected 5-Panel Architecture Workflow (Compact & Elegant) */}
          <div className="mt-7 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
              Operational 5-Panel Security Architecture
            </p>

            <div className="space-y-1.5 max-w-lg">
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07]">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  01
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 01: Super Admin</span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">Lead Allocation & Ingestion</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07]">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                  02
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 02: Salesperson</span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">Medicine Calling (0% Source Leak)</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07]">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                  03
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 03: Pending Review</span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">Dosage Verification & Triage Queue</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07]">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                  04
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 04: Approval Officer</span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">Cross-Verification & Order Clearance</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs backdrop-blur-xs transition hover:bg-white/[0.07]">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-500/20 text-teal-300 font-bold text-[10px]">
                  05
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="font-semibold text-white truncate">Panel 05: Management & Operations</span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">Customer CRM, GST & Dispatch</span>
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
              <span>100% Zero Source Privacy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Ayush Regimen Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Gujarat GST Billing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Immutable Audit Trail</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Side (Right 50% - Pristine Elevated Canvas) */}
      <div className="flex flex-1 flex-col justify-center bg-[#f7faf8] px-4 py-6 sm:px-8 lg:px-12 overflow-y-auto">
        <div className="mx-auto w-full max-w-[480px]">
          {/* Main Elevated Card Container */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xl shadow-slate-200/50">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Sign In to Panel
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Enter your credentials or click a quick-switch test persona below.
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <KeyRound className="h-4 w-4" />
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
              <Input
                label="Corporate Email Address"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedCode('');
                }}
                placeholder="employee@melayurveda.com"
                leftIcon={<Mail className="h-4 w-4" />}
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedCode('');
                }}
                placeholder="••••••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 transition active:scale-[0.99]"
                isLoading={isLoading}
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Sign In to Panel
              </Button>
            </form>

            {/* Quick Switch Persona (No Text Wrapping, Balanced Grid) */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Quick Switch Persona (Dev / QA Mode)
                </span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  One Click Login
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SEEDED_PERSONAS.map((p, idx) => {
                  const isSelected = selectedCode === p.code;
                  const isFullWidth = idx === SEEDED_PERSONAS.length - 1;

                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => handleSelectPersona(p)}
                      className={`relative flex items-center gap-2.5 text-left rounded-xl border p-2 transition-all cursor-pointer ${isSelected
                          ? 'border-emerald-600 bg-emerald-50/90 ring-1.5 ring-emerald-500 shadow-xs'
                          : 'border-slate-200/90 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300'
                        } ${isFullWidth ? 'sm:col-span-2' : ''}`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200/90 shadow-2xs">
                        {p.icon}
                      </div>

                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase tracking-wider shrink-0 whitespace-nowrap ${p.badgeBg} ${p.badgeText} ${p.badgeBorder}`}
                          >
                            {p.panelLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 truncate whitespace-nowrap">
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

                      {isSelected && (
                        <div className="shrink-0 flex items-center justify-center h-4 w-4 rounded-full bg-emerald-700 text-white">
                          <CheckCircle2 className="h-3 w-3" />
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
        <div className="flex min-h-screen items-center justify-center bg-[#081711] text-white">
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
