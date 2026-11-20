'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { checkBackendHealth } from '../../lib/api-client';
import { NotificationPopover } from './notification-popover';
import { LogOut, User, Menu } from 'lucide-react';
import { Badge } from '../ui/badge';

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackendHealth().then((res) => setBackendHealthy(res.success));
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            title="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {title || 'Melayurveda Enterprise CRM'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* API Backend Health Indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[11px] text-slate-600 font-medium"
          title={backendHealthy ? 'Connected to NestJS API (Port 4100)' : 'API Backend Disconnected'}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              backendHealthy === true
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                : backendHealthy === false
                  ? 'bg-red-500 shadow-sm shadow-red-500/50'
                  : 'bg-amber-400'
            }`}
          />
          <span>API 4100</span>
        </div>

        {/* Notifications Popover */}
        <NotificationPopover />

        {/* User Card & Logout */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-[10px] font-mono text-slate-500 leading-tight">
                {user.employeeCode}
              </span>
            </div>

            <Badge variant="role" status={user.role} className="hidden sm:inline-flex">
              {user.role.replace('_', ' ')}
            </Badge>

            <button
              onClick={logout}
              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 transition"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
