'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { NotificationPopover } from './notification-popover';
import { LogOut, Menu, Clock } from 'lucide-react';

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#071912] px-4 sm:px-6 backdrop-blur-md shadow-md text-slate-100">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden transition"
            title="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm border border-amber-400/50 overflow-hidden">
            <img
              src="/images/melayurveda-emblem.png"
              alt="Mel Ayurveda Emblem"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {title || 'Mel Ayurveda Enterprise Operations'}
              </h1>
            </div>
            <p className="hidden lg:block text-[10px] italic text-amber-300/80 font-serif leading-none mt-0.5">
              Nature Se Nirog, Ayurveda Se Swasth
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-amber-300 font-mono bg-black/40 border border-slate-800 px-2.5 py-1 rounded-lg shadow-inner">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span>{currentTime || '12:00:00'} IST</span>
        </div>

        {/* Notifications Popover */}
        <NotificationPopover />

        {/* User Card & Logout */}
        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-white leading-tight">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-semibold leading-tight">
                {user.employeeCode}
              </span>
            </div>

            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-amber-300 border border-amber-400/30 shadow-xs">
              {user.role.replace('_', ' ')}
            </span>

            <button
              onClick={logout}
              className="rounded-xl p-2 text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition"
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
