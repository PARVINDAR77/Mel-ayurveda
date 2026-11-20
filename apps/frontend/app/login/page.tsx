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
    badgeBg: 'bg-emerald-100 border-emerald-300',
    badgeText: 'text-emerald-800',
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
    badgeBg: 'bg-blue-100 border-blue-300',
    badgeText: 'text-blue-800',
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
    badgeBg: 'bg-amber-100 border-amber-300',
    badgeText: 'text-amber-800',
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
    badgeBg: 'bg-purple-100 border-purple-300',
    badgeText: 'text-purple-800',
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
    badgeBg: 'bg-teal-100 border-teal-300',
    badgeText: 'text-teal-800',
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
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-900">
      {/* Brand Hero Side (Ayurvedic Medicine & Enterprise CRM Aesthetic) */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-forest-950 to-slate-900 p-8 lg:p-14 text-white lg:w-1/2">
        {/* Ambient Decorative Glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-forest-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-12 right-6 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-600 to-forest-800 text-amber-300 shadow-xl shadow-forest-900/50 ring-1 ring-forest-400/30">
              <Leaf className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black tracking-widest text-white">
                MELAYURVEDA
              </span>
              <span className="block text-xs font-bold tracking-widest text-amber-400 uppercase">
                Enterprise Ayurvedic CRM
              </span>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-forest-500/30 bg-forest-900/40 px-3 py-1 text-xs font-medium text-forest-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Ayurvedic Medicine & Formulations Tele-Sales CRM</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:leading-tight">
              5-Panel Precision Ayurvedic Product & Medicine Sales Platform
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-300">
              Direct-to-consumer Ayurvedic medicine tele-sales operations. Complete multi-panel pipeline:
              lead qualification, prescription safety audits, commercial clearance, Gujarat GST tax
              invoicing, and real-time warehouse fulfillment.
            </p>
          </div>

          {/* 5-Panel Architecture Overview Cards */}
          <div className="mt-8 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90">
              Operational 5-Panel Security Architecture
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white block">Panel 01: Super Admin</span>
                  <span className="text-[11px] text-slate-400">Lead Allocation & Ingestion Control</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white block">Panel 02: Salesperson</span>
                  <span className="text-[11px] text-slate-400">Medicine Regimen Calling (0% Source Leak)</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white block">Panel 03: Pending Review</span>
                  <span className="text-[11px] text-slate-400">Dosage Audit & Regimen Triage Queue</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white block">Panel 04: Approval Officer</span>
                  <span className="text-[11px] text-slate-400">Cross-Verification & Order Clearance</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-sm sm:col-span-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
                  <Boxes className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white block">Panel 05: Management & Operations</span>
                  <span className="text-[11px] text-slate-400">Customer CRM, Gujarat GST Invoicing, Stock Ledger & BlueDart Dispatch</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Compliance Badges */}
        <div className="relative z-10 mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-forest-400" />
              <span>100% Zero Source Privacy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-forest-400" />
              <span>Ayush Regimen Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-forest-400" />
              <span>Statutory GST Billing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-forest-400" />
              <span>Immutable Audit Trail</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Side (Modern Elevated Card Container) */}
      <div className="flex flex-1 flex-col justify-center bg-gradient-to-br from-slate-50 via-forest-50/20 to-slate-100 px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-lg">
          {/* Elevated Login Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-10 shadow-2xl shadow-slate-300/40">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-150">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Sign In to Panel
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter your enterprise credentials or click a test persona below.
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700 border border-forest-200">
                <KeyRound className="h-5 w-5" />
              </div>
            </div>

            {/* Session Expired Banner */}
            {showExpiredNotice && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <Clock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block">Session Timeout</span>
                  <span>Your secure session has expired. Please authenticate to resume your active workspace.</span>
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

            {/* Authentication Error Banner */}
            {error && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                size="lg"
                className="w-full mt-3 bg-forest-800 hover:bg-forest-900 text-white font-semibold py-3 rounded-xl shadow-lg shadow-forest-900/20 flex items-center justify-center gap-2 transition active:scale-[0.99]"
                isLoading={isLoading}
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Sign In to Panel
              </Button>
            </form>

            {/* Quick Switch Persona (Balanced Grid with Active State) */}
            <div className="mt-8 pt-6 border-t border-slate-150">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Quick Switch Persona (Dev / QA Mode)
                </span>
                <span className="text-[10px] font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full border border-forest-200">
                  One-Click Login
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SEEDED_PERSONAS.map((p, idx) => {
                  const isSelected = selectedCode === p.code;
                  const isFullWidth = idx === SEEDED_PERSONAS.length - 1;

                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => handleSelectPersona(p)}
                      className={`relative flex items-center gap-3 text-left rounded-xl border p-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-forest-600 bg-forest-50/90 shadow-sm ring-2 ring-forest-500/40'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                      } ${isFullWidth ? 'sm:col-span-2' : ''}`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-xs">
                        {p.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase tracking-wider ${p.badgeBg} ${p.badgeText}`}
                          >
                            {p.panelLabel}
                          </span>
                          <span className="text-[10px] font-mono font-medium text-slate-500">
                            {p.code}
                          </span>
                        </div>
                        <div className="font-semibold text-xs text-slate-900 truncate">
                          {p.roleDisplayName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {p.name}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-forest-700 text-white">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Security Notice */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
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
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-forest-400 border-t-transparent" />
            <span className="text-sm font-medium">Loading Melayurveda Portal...</span>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
