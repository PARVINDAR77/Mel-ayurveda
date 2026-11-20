'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Sparkles, ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

const SEEDED_PERSONAS = [
  {
    role: 'SUPER_ADMIN',
    name: 'Super Admin',
    code: 'MEL-ADM-001',
    email: 'admin@melayurveda.com',
    pass: 'Melayurveda@Admin2026!',
    color: 'border-forest-300 bg-forest-50/50 hover:bg-forest-100/60',
  },
  {
    role: 'SALESPERSON',
    name: 'Ramesh Patel',
    code: 'MEL-SAL-001',
    email: 'ramesh.patel@melayurveda.com',
    pass: 'BrandNewRameshPassword2026!',
    color: 'border-sky-300 bg-sky-50/50 hover:bg-sky-100/60',
  },
  {
    role: 'PENDING_REVIEWER',
    name: 'Priya Sharma',
    code: 'MEL-PND-001',
    email: 'priya.sharma@melayurveda.com',
    pass: 'PendingPassword2026!',
    color: 'border-amber-300 bg-amber-50/50 hover:bg-amber-100/60',
  },
  {
    role: 'APPROVAL_OFFICER',
    name: 'Amit Desai',
    code: 'MEL-APR-001',
    email: 'amit.desai@melayurveda.com',
    pass: 'ApprovalPassword2026!',
    color: 'border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100/60',
  },
  {
    role: 'MANAGEMENT',
    name: 'Neha Mehta',
    code: 'MEL-MGT-001',
    email: 'neha.mehta@melayurveda.com',
    pass: 'MgmtPassword2026!',
    color: 'border-teal-300 bg-teal-50/50 hover:bg-teal-100/60',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@melayurveda.com');
  const [password, setPassword] = useState('Melayurveda@Admin2026!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Authentication failed. Please verify credentials.');
      setIsLoading(false);
    }
  };

  const handleSelectPersona = (persona: typeof SEEDED_PERSONAS[0]) => {
    setEmail(persona.email);
    setPassword(persona.pass);
    setError(null);
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-50">
      {/* Brand Hero Side */}
      <div className="flex flex-col justify-between bg-slate-900 p-8 lg:p-12 text-white lg:w-1/2">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-700 text-amber-400 shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black tracking-wider text-white">MELAYURVEDA</span>
              <span className="block text-xs font-bold tracking-widest text-amber-400 uppercase">
                Enterprise Clinical Healthcare
              </span>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-100">
              5-Panel Precision Ayurvedic Product & Medicine Sales Operations CRM
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
              A high-security, multi-source product inquiry & order fulfillment platform with strict lead source data isolation,
              append-only calling compliance, multi-stage product review, GST invoicing, and warehouse dispatch.
            </p>
          </div>
        </div>

        {/* 5-Panel Architecture Badges */}
        <div className="mt-12 space-y-2.5 pt-8 border-t border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Dedicated Security Panels
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-forest-400" />
              <span>Panel 01: Super Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-400" />
              <span>Panel 02: Salesperson</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Panel 03: Pending Review</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span>Panel 04: Approval Officer</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
              <span>Panel 05: Management & Operations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Side */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your panel</h3>
            <p className="mt-1 text-xs text-slate-500">
              Enter your enterprise credentials or quick-select a persona below.
            </p>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Corporate Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@melayurveda.com"
              leftIcon={<Mail className="h-4 w-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In to Panel
            </Button>
          </form>

          {/* Quick Persona Switcher for Development & QA */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Quick Switch Persona (Dev / QA Mode)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SEEDED_PERSONAS.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => handleSelectPersona(p)}
                  className={`flex flex-col text-left rounded-lg border p-2.5 transition ${p.color}`}
                >
                  <span className="text-[10px] font-mono font-bold text-slate-600">{p.code}</span>
                  <span className="text-xs font-semibold text-slate-900">{p.name}</span>
                  <span className="text-[10px] text-slate-500">{p.role.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
