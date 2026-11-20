'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppLayoutProps {
  title?: string;
  children: React.ReactNode;
}

export function AppLayout({ title, children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64">
            <Sidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
