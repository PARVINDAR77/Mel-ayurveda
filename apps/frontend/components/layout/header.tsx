'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { checkBackendHealth } from '../../lib/api-client';
import { NotificationPopover } from './notification-popover';
import { LogOut, Menu, Sparkles, Shield, Clock } from 'lucide-react';
import { Badge } from '../ui/badge';

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    checkBackendHealth().then((res) => setBackendHealthy(res.success));
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 sm:px-6 backdrop-blur-md shadow-2xs">
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
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {title || 'Melayurveda Enterprise Operations'}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{currentTime || '12:00:00'} IST</span>
        </div>

        {/* API Backend Health Indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 font-medium shadow-2xs"
          title={backendHealthy ? 'Connected to NestJS API (Port 4100)' : 'API Backend Disconnected'}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              backendHealthy === true
                ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                : backendHealthy === false
                  ? 'bg-red-500 shadow-xs shadow-red-500/50'
                  : 'bg-amber-400'
            }`}
          />
          <span className="font-mono">API 4100</span>
        </div>

        {/* Notifications Popover */}
        <NotificationPopover />

        {/* User Card & Logout */}
        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-semibold leading-tight">
                {user.employeeCode}
              </span>
            </div>

            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              {user.role.replace('_', ' ')}
            </span>

            <button
              onClick={logout}
              className="rounded-xl p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 transition"
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
