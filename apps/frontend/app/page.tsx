'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getPanelRoute } from '../context/auth-context';
import { checkBackendHealth } from '../lib/api-client';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Server,
  Activity,
  Users,
  PhoneCall,
  FileCheck2,
  CheckCircle2,
  Package,
  FileText,
  HeartHandshake,
} from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    checkBackendHealth().then(setHealth);
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.push(getPanelRoute(user.role));
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <nav className="w-full border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-800 text-amber-400 shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-lg font-black tracking-wider text-slate-900 leading-none">
                MELAYURVEDA
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-600 leading-none mt-1">
                Enterprise CRM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
              title={health?.success ? 'Connected to NestJS API' : 'Checking connection'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  health?.success ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-400'
                }`}
              />
              <span className="hidden sm:inline">Backend API:</span>
              <span className="font-mono text-slate-800 font-semibold">Port 4100</span>
            </div>

            <Link href="/login">
              <Button variant="primary" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                Launch CRM Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-6 py-16 text-center flex-1 flex flex-col items-center justify-center">
        <Badge variant="gold" className="mb-4">
          Enterprise Ayurvedic CRM • 5 Panels Active
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
          Ayurvedic Medicines & Product Order Operations System
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600 leading-relaxed">
          MELAYURVEDA INDIA PVT. LTD. enterprise lead-to-delivery system. Featuring strict lead
          source privacy quarantine, immutable calling audit trails, multi-gate product reviews,
          GST billing, and courier dispatch.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login">
            <Button variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              Sign In with Corporate Account
            </Button>
          </Link>
          <a
            href="http://localhost:4100/api/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="lg" icon={<Server className="h-4 w-4" />}>
              Open Swagger API Docs (Port 4100)
            </Button>
          </a>
        </div>

        {/* 6 Panels Architecture Cards */}
        <div className="mt-16 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 text-left">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-forest-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-forest-800">MEL-ADM-XXX</span>
              <ShieldCheck className="h-4 w-4 text-forest-700" />
            </div>
            <h4 className="mt-2 text-sm font-bold text-slate-900">Panel 01: Super Admin</h4>
            <p className="mt-1 text-xs text-slate-500">Master executive control, staff management, lead distribution, and source ROI.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-sky-800">MEL-SAL-XXX</span>
              <PhoneCall className="h-4 w-4 text-sky-700" />
            </div>
            <h4 className="mt-2 text-sm font-bold text-slate-900">Panel 02: Salesperson</h4>
            <p className="mt-1 text-xs text-slate-500">Calling drawer, follow-ups. Strictly 100% lead source data isolation.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-purple-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-purple-800">MEL-APR-XXX</span>
              <CheckCircle2 className="h-4 w-4 text-purple-700" />
            </div>
            <h4 className="mt-2 text-sm font-bold text-slate-900">Panel 03: Approval Officer</h4>
            <p className="mt-1 text-xs text-slate-500">Doctor clinical audit, order clearance, dosage validation, and conversion.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-indigo-800">MEL-BIL-XXX</span>
              <FileText className="h-4 w-4 text-indigo-700" />
            </div>
            <h4 className="mt-2 text-sm font-bold text-slate-900">Panel 04: Billing Desk</h4>
            <p className="mt-1 text-xs text-slate-500">Gujarat GST tax invoicing, HSN codes, and warehouse stock deduction.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-teal-800">MEL-MGT-XXX</span>
              <Package className="h-4 w-4 text-teal-700" />
            </div>
            <h4 className="mt-2 text-sm font-bold text-slate-900">Panel 05: Management</h4>
            <p className="mt-1 text-xs text-slate-500">Courier AWB dispatch, logistics fulfillment, and customer return investigations.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-rose-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-800">MEL-FLW-XXX</span>
              <HeartHandshake className="h-4 w-4 text-rose-700" />
            </div>
            <h4 className="mt-2 text-sm font-bold text-slate-900">Panel 06: Follow-Up Care</h4>
            <p className="mt-1 text-xs text-slate-500">Post-purchase patient care, formulation refill scheduling, and wellness outreach.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© 2026 MELAYURVEDA INDIA PVT. LTD. All rights reserved.</p>
          <p>Production Monorepo: NestJS 11 + Next.js 15 + PostgreSQL 16 + Prisma ORM</p>
        </div>
      </footer>
    </main>
  );
}
