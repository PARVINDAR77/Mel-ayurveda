'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, RoleType, getPanelRoute } from '../../context/auth-context';
import { ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: RoleType[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  // Before client hydration mounts, render children so SSR includes page shell and never flashes raw unstyled text
  if (!mounted) {
    return <>{children}</>;
  }

  // If client has mounted and still verifying without cached user, render sleek dark luxury loader
  if (isLoading && !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#071912] text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-xs font-semibold text-amber-300 font-mono tracking-wider">
            Mel Ayurveda Enterprise Security
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const hasAccess = allowedRoles.includes(user.role);

  if (!hasAccess) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your role (<span className="font-semibold text-slate-900">{user.role}</span>) does not have authorization to view this panel.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => router.push(getPanelRoute(user.role))}
              className="w-full rounded-lg bg-[#0f3822] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#154d2f] shadow-sm"
            >
              Return to My Panel ({user.role})
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
