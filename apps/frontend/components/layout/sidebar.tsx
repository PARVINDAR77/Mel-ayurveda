'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  PhoneCall,
  CalendarClock,
  Send,
  FileCheck2,
  CheckCircle2,
  Package,
  Layers,
  FileText,
  Boxes,
  Truck,
  TrendingUp,
  History,
  Radio,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'SUPER_ADMIN':
        return [
          { href: '/admin', label: 'Master Dashboard', icon: LayoutDashboard },
          { href: '/admin/employees', label: 'Employees & Roles', icon: Users },
          { href: '/admin/assignments', label: 'Lead Distribution', icon: UserCheck },
          { href: '/admin/sources', label: 'Lead Sources & Ads', icon: Radio },
          { href: '/admin/analytics', label: 'Executive Analytics', icon: TrendingUp },
          { href: '/admin/audit', label: 'Enterprise Audit Logs', icon: History },
        ];

      case 'SALESPERSON':
        // STRICT INVARIANT: ZERO LEAD SOURCE NAVIGATION
        return [
          { href: '/sales', label: 'Sales Dashboard', icon: LayoutDashboard },
          { href: '/sales/leads', label: 'My Assigned Leads', icon: Users },
          { href: '/sales/calling', label: 'Calling Workspace', icon: PhoneCall },
          { href: '/sales/follow-ups', label: 'Follow-up Agenda', icon: CalendarClock },
          { href: '/sales/pending', label: 'Pending Submissions', icon: Send },
        ];

      case 'PENDING_REVIEWER':
        return [
          { href: '/pending', label: 'Review Dashboard', icon: LayoutDashboard },
          { href: '/pending/queue', label: 'Triage Queue', icon: FileCheck2 },
          { href: '/pending/history', label: 'Decision History', icon: History },
        ];

      case 'APPROVAL_OFFICER':
        return [
          { href: '/approval', label: 'Approval Dashboard', icon: LayoutDashboard },
          { href: '/approval/queue', label: 'Verification Queue', icon: CheckCircle2 },
          { href: '/approval/history', label: 'Sign-off History', icon: History },
        ];

      case 'MANAGEMENT':
        return [
          { href: '/management', label: 'Operations Dashboard', icon: LayoutDashboard },
          { href: '/management/customers', label: 'Customer CRM', icon: Users },
          { href: '/management/products', label: 'Ayurvedic Products', icon: Layers },
          { href: '/management/orders', label: 'Formulation Orders', icon: Package },
          { href: '/management/invoices', label: 'GST Tax Invoicing', icon: FileText },
          { href: '/management/inventory', label: 'Warehouse Inventory', icon: Boxes },
          { href: '/management/dispatch', label: 'Courier Dispatch', icon: Truck },
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200/80 bg-slate-900 text-slate-100 shadow-lg">
      {/* Melayurveda Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-700 text-amber-400 shadow-md">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <span className="block font-black tracking-wider text-white text-base">
            MELAYURVEDA
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-amber-400">
            Enterprise CRM
          </span>
        </div>
      </div>

      {/* User Persona Card */}
      {user && (
        <div className="border-b border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
              {user.employeeCode}
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Active Session" />
          </div>
          <div className="mt-1 font-semibold text-sm text-white truncate">
            {user.firstName} {user.lastName}
          </div>
          <div className="mt-0.5 text-xs text-slate-400 capitalize">
            {user.role.toLowerCase().replace('_', ' ')}
          </div>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-forest-800 text-white font-semibold shadow-sm shadow-forest-900/50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-800 p-4 text-[10px] text-slate-500">
        <p className="font-semibold text-slate-400">MELAYURVEDA INDIA PVT. LTD.</p>
        <p className="mt-0.5">Ayurvedic Clinical Healthcare Platform</p>
      </div>
    </aside>
  );
}
