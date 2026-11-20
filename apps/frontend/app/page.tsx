'use client';

import React, { useEffect, useState } from 'react';
import { checkBackendHealth } from '../lib/api-client';
import { 
  ShieldCheck, 
  Activity, 
  Database, 
  Lock, 
  Users, 
  PhoneCall, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  Server
} from 'lucide-react';

export default function HomePage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHealth() {
      const res = await checkBackendHealth();
      setHealth(res);
      setLoading(false);
    }
    loadHealth();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col items-center justify-start p-6 md:p-12">
      {/* Header & Brand */}
      <header className="w-full max-w-6xl flex items-center justify-between py-4 border-b border-slate-200 mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-forest-900 text-ayurGold-400 flex items-center justify-center font-bold text-xl shadow-md border border-ayurGold-500/30">
            M
          </div>
          <div>
            <h1 className="text-xl font-bold text-forest-900 tracking-tight">MELAYURVEDA</h1>
            <p className="text-xs text-slate-500 font-medium">Health • Wellness • Life | Enterprise CRM</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            Phase 02 Foundation
          </span>
        </div>
      </header>

      {/* Main Showcase Hero */}
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 mb-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-forest-50 text-forest-800 border border-forest-200 mb-4">
            <ShieldCheck className="w-4 h-4 text-forest-700" />
            MELAYURVEDA INDIA PVT. LTD. – System Architecture Active
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mb-4">
            Ayurvedic Enterprise CRM System
          </h2>
          <p className="text-slate-600 text-base leading-relaxed mb-6">
            Connecting Next.js 15, NestJS 11 Core REST API, and PostgreSQL via Prisma ORM.
            Engineered with strict Lead Source Privacy, manual lead creation, calling logs, 
            and dual-tier verification across five role-tailored operational workspaces.
          </p>
        </div>

        {/* Backend & Database Connectivity Probe Status */}
        <div className="mt-6 p-6 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-forest-800" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Full-Stack Connectivity Diagnostics
              </h3>
            </div>
            <button 
              onClick={async () => {
                setLoading(true);
                const res = await checkBackendHealth();
                setHealth(res);
                setLoading(false);
              }}
              className="text-xs font-medium text-forest-700 hover:text-forest-900 underline"
            >
              Re-probe API
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Frontend State */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-md bg-forest-100 text-forest-800 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Frontend Client</p>
                <p className="text-sm font-semibold text-slate-900">Next.js 15 (Active)</p>
              </div>
            </div>

            {/* Backend API State */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-md flex items-center justify-center ${health?.success ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Core API Service</p>
                <p className="text-sm font-semibold text-slate-900">
                  {loading ? 'Probing...' : health?.success ? 'Connected (/api/v1)' : 'Standby / Offline'}
                </p>
              </div>
            </div>

            {/* PostgreSQL Database State */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-md flex items-center justify-center ${health?.data?.database?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">PostgreSQL Database</p>
                <p className="text-sm font-semibold text-slate-900">
                  {loading ? 'Probing...' : health?.data?.database?.connected ? `Connected (${health?.data?.database?.latencyMs ?? 0}ms)` : 'Prisma Local Ready'}
                </p>
              </div>
            </div>
          </div>

          {health?.error && (
            <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <span>Backend server is currently in initialization standby (run: <code>npm run dev:backend</code>).</span>
              <span className="font-mono text-slate-500 text-[11px]">{health.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Five Dedicated Panels Architectural Grid */}
      <div className="w-full max-w-6xl">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-forest-800" />
          The Five Enterprise CRM Workspaces
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {/* Panel 1 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-forest-500 transition-colors">
            <div>
              <span className="text-[11px] font-bold text-forest-700 uppercase tracking-wider block mb-1">Panel 01</span>
              <h4 className="font-bold text-slate-900 text-base mb-2">Super Admin</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Full organizational control, employee accounts, lead assignment engine, source analytics.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded w-fit">MEL-ADM-XXX</span>
          </div>

          {/* Panel 2 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-forest-500 transition-colors">
            <div>
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Panel 02</span>
              <h4 className="font-bold text-slate-900 text-base mb-2">Salesperson</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Assigned leads, calling outcomes, follow-ups. <strong>100% Lead Source Privacy</strong> enforced.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded w-fit">MEL-SAL-XXX</span>
          </div>

          {/* Panel 3 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-forest-500 transition-colors">
            <div>
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Panel 03</span>
              <h4 className="font-bold text-slate-900 text-base mb-2">Pending Review</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Clinical quality triage, patient re-contact, and 4-way decision resolution engine.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded w-fit">MEL-PND-XXX</span>
          </div>

          {/* Panel 4 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-forest-500 transition-colors">
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Panel 04</span>
              <h4 className="font-bold text-slate-900 text-base mb-2">Approval Authority</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Final commercial and medical sign-off gatekeeper before customer conversion.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded w-fit">MEL-APR-XXX</span>
          </div>

          {/* Panel 5 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-forest-500 transition-colors">
            <div>
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block mb-1">Panel 05</span>
              <h4 className="font-bold text-slate-900 text-base mb-2">Management</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Customer CRM, product catalog, sales drafts, GST billing, and courier dispatch.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded w-fit">MEL-MGT-XXX</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 MELAYURVEDA INDIA PVT. LTD. All rights reserved.</p>
        <p className="font-mono text-slate-400">Phase 02 Architecture Checkpoint: 50dd18d</p>
      </footer>
    </main>
  );
}
