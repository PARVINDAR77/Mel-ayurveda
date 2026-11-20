'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, RoleType, getPanelRoute } from '../../context/auth-context';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: RoleType[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-forest-800" />
          <p className="text-sm font-medium text-slate-600">Verifying security credentials...</p>
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
              className="w-full rounded-lg bg-forest-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-900 shadow-sm"
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
