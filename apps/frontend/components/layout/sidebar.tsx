'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useNotifications } from '../../context/notification-context';
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
  Leaf,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCountByPath, hasUnreadForPath, markPathAsRead } = useNotifications();

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'SUPER_ADMIN':
        return [
          { href: '/admin', label: 'Master Dashboard', icon: LayoutDashboard },
          { href: '/admin/orders', label: 'Order Management', icon: Package },
          { href: '/admin/products', label: 'Products & Formulations', icon: Leaf },
          { href: '/admin/assignments', label: 'Lead Distribution', icon: UserCheck },
          { href: '/sales/leads', label: 'Sales Leads', icon: PhoneCall },
          { href: '/pending/queue', label: 'Pending Review Queue', icon: FileCheck2 },
          { href: '/approval/queue', label: 'Final Approval Queue', icon: CheckCircle2 },
          { href: '/management/customers', label: 'Customer CRM', icon: Users },
          { href: '/admin/employees', label: 'Employees & Roles', icon: Users },
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
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'SA';

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-[#071912] text-slate-100 shadow-xl select-none">
      {/* Melayurveda Brand Header */}
      <div className="flex h-20 items-center gap-3 border-b border-slate-800/80 px-4 bg-[#05140e]">
        <div className="relative h-11 w-11 shrink-0 rounded-xl bg-white p-1 shadow-md ring-1 ring-amber-400/40 flex items-center justify-center overflow-hidden">
          <img
            src="/images/melayurveda-logo.png"
            alt="Mel Ayurveda"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="block font-bold tracking-tight text-white text-sm leading-tight">
              Mel Ayurveda
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-600/40">
              HQ
            </span>
          </div>
          <span className="block text-[9px] font-medium text-amber-300/90 italic truncate mt-0.5">
            Nature Se Nirog, Swasth
          </span>
          <div className="h-[1px] w-full bg-gradient-to-r from-amber-500/60 via-amber-300/30 to-transparent mt-1" />
        </div>
      </div>

      {/* User Persona Profile Card */}
      {user && (
        <div className="border-b border-slate-800/80 bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-slate-900 border border-emerald-500/30 text-amber-300 font-bold text-xs shadow-inner">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                  {user.employeeCode}
                </span>
                <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="font-bold text-xs text-white truncate leading-snug">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-[10px] text-slate-400 truncate capitalize">
                {user.role.toLowerCase().replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(`${item.href}/`));
          const Icon = item.icon;
          const hasUnread = hasUnreadForPath(item.href);
          const unreadCount = unreadCountByPath[item.href] || 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (hasUnread) {
                  markPathAsRead(item.href);
                }
                if (onClose) onClose();
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#0f3822] to-emerald-900 text-white shadow-md shadow-emerald-950/70 border border-emerald-500/40 ring-1 ring-amber-400/30'
                  : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>

              {/* Blinking Red Radar Dot & Count for Unread Section Alerts */}
              {hasUnread ? (
                <div className="ml-auto flex items-center gap-1.5 shrink-0" title="New unread alert in this section">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-sm shadow-red-500/90" />
                  </span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[9px] font-bold text-white shadow-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              ) : (
                isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                )
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-800/80 p-4 text-[10px] text-slate-500 bg-[#05140e]">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-0.5">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          <span>MELAYURVEDA INDIA PVT. LTD.</span>
        </div>
        <p className="text-slate-500 leading-tight">Ayurvedic Formulations & Tele-Sales Operations</p>
      </div>
    </aside>
  );
}
