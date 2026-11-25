'use client';

import React from 'react';
import { useNotifications } from '../../context/notification-context';
import {
  BellRing,
  X,
  ExternalLink,
  UserCheck,
  FileCheck2,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  Info,
  Truck,
} from 'lucide-react';

export function LiveNotificationToast() {
  const { activeToast, dismissToast, navigateToNotification } = useNotifications();

  if (!activeToast) return null;

  const getIcon = () => {
    switch (activeToast.type) {
      case 'DISPATCH_UPDATE':
      case 'ORDER_DISPATCHED':
        return <Truck className="h-5 w-5 text-emerald-700" />;
      case 'LEAD_ASSIGNED':
        return <UserCheck className="h-5 w-5 text-emerald-600" />;
      case 'REVIEW_REQUESTED':
        return <FileCheck2 className="h-5 w-5 text-amber-600" />;
      case 'APPROVAL_GRANTED':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case 'ORDER_CONFIRMED':
        return <PackageCheck className="h-5 w-5 text-blue-600" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <BellRing className="h-5 w-5 text-forest-800" />;
    }
  };

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="relative rounded-2xl border-2 border-emerald-500/40 bg-white/95 p-4 shadow-2xl backdrop-blur-md ring-1 ring-black/5">
        {/* Pulsing Alert Indicator */}
        <div className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/90 shadow-inner">
            {getIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {activeToast.type.replace('_', ' ')}
              </span>
              <button
                onClick={dismissToast}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h4 className="mt-1.5 text-xs font-bold text-slate-900 leading-snug truncate">
              {activeToast.title}
            </h4>
            <p className="mt-0.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {activeToast.message}
            </p>

            {activeToast.link && (
              <button
                onClick={() => navigateToNotification(activeToast)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow"
              >
                <span>Open Section</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
