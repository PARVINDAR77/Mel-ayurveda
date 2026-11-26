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
  UserPlus,
  ShoppingBag,
  HeartHandshake,
  ArchiveRestore,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CreateLeadModal } from '../sales/create-lead-modal';
import { CreateOrderModal } from '../sales/create-order-modal';

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCountByPath, hasUnreadForPath, markPathAsRead } = useNotifications();

  // Sidebar Quick Action Modals
  const [isCreateLeadOpen, setIsCreateLeadOpen] = React.useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = React.useState(false);

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'SUPER_ADMIN':
        return [
          { href: '/admin', label: 'Master Dashboard', icon: LayoutDashboard },
          { href: '/admin/orders', label: 'Order Management', icon: Package },
          { href: '/management/returns', label: 'Returns & RTO Desk', icon: RotateCcw },
          { href: '/billing', label: 'Billing & Stock Desk', icon: FileText },
          { href: '/admin/products', label: 'Products & Formulations', icon: Leaf },
          { href: '/admin/assignments', label: 'Lead Distribution', icon: UserCheck },
          { href: '/admin/customer-followups', label: 'Follow-Up Allocation', icon: HeartHandshake },
          { href: '/sales/leads', label: 'Sales Leads', icon: PhoneCall },
          { href: '/approval/queue', label: 'Final Approval Queue', icon: CheckCircle2 },
          { href: '/management/customers', label: 'Customer CRM', icon: Users },
          { href: '/admin/employees', label: 'Employees & Roles', icon: Users },
          { href: '/admin/sources', label: 'Lead Sources & Ads', icon: Radio },
          { href: '/admin/analytics', label: 'Executive Analytics', icon: TrendingUp },
          { href: '/admin/audit', label: 'Enterprise Audit Logs', icon: History },
          { href: '/admin/recycle-bin', label: 'Recycle Bin & Vault', icon: ArchiveRestore },
        ];

      case 'SALESPERSON':
        // STRICT INVARIANT: ZERO LEAD SOURCE NAVIGATION
        return [
          { href: '/sales', label: 'Sales Dashboard', icon: LayoutDashboard },
          { href: '/sales/leads', label: 'My Assigned Leads', icon: Users },
          { href: '/sales/calling', label: 'Calling Workspace', icon: PhoneCall },
          { href: '/sales/orders', label: 'My Booked Orders', icon: Package },
          { href: '/sales/customer-care', label: 'Follow-Up Care Desk', icon: HeartHandshake },
          { href: '/sales/follow-ups', label: 'Follow-up Agenda', icon: CalendarClock },
        ];

      case 'PENDING_REVIEWER':
        return [
          { href: '/approval', label: 'Approval Dashboard', icon: LayoutDashboard },
          { href: '/approval/queue', label: 'Verification Queue', icon: CheckCircle2 },
        ];

      case 'APPROVAL_OFFICER':
        return [
          { href: '/approval', label: 'Approval Dashboard', icon: LayoutDashboard },
          { href: '/approval/queue', label: 'Verification Queue', icon: CheckCircle2 },
          { href: '/approval/orders', label: 'Formulation Orders', icon: Package },
          { href: '/approval/history', label: 'Sign-off History', icon: History },
        ];

      case 'MANAGEMENT':
        return [
          { href: '/management', label: 'Operations Dashboard', icon: LayoutDashboard },
          { href: '/management/customers', label: 'Customer CRM', icon: Users },
          { href: '/admin/customer-followups', label: 'Follow-Up Allocation', icon: HeartHandshake },
          { href: '/management/products', label: 'Ayurvedic Products', icon: Layers },
          { href: '/management/orders', label: 'Formulation Orders', icon: Package },
          { href: '/management/invoices', label: 'GST Tax Invoicing', icon: FileText },
          { href: '/management/inventory', label: 'Warehouse Inventory', icon: Boxes },
          { href: '/management/dispatch', label: 'Courier Dispatch', icon: Truck },
          { href: '/management/returns', label: 'Return & RTO Orders', icon: RotateCcw },
        ];

      case 'FOLLOWUP_EXECUTIVE':
        return [
          { href: '/sales/customer-care', label: 'Follow-Up Care Desk', icon: HeartHandshake },
        ];

      case 'BILLING_EXECUTIVE':
        return [
          { href: '/billing', label: 'Billing Workspace', icon: LayoutDashboard },
          { href: '/billing', label: 'Billing Queue', icon: Clock },
          { href: '/management/inventory', label: 'Warehouse Stock', icon: Boxes },
          { href: '/management/invoices', label: 'Issued GST Invoices', icon: FileText },
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'SA';

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Master Administrator';
      case 'SALESPERSON':
        return 'Ayurvedic Consultant';
      case 'PENDING_REVIEWER':
        return 'Clinical Reviewer';
      case 'APPROVAL_OFFICER':
        return 'Final Sign-off Officer';
      case 'MANAGEMENT':
        return 'Operations Executive';
      case 'FOLLOWUP_EXECUTIVE':
        return 'Follow-Up Executive';
      case 'BILLING_EXECUTIVE':
        return 'Billing & Stock Specialist';
      default:
        return role.replace('_', ' ');
    }
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-[#071912] text-slate-100 shadow-xl select-none">
      {/* Melayurveda Official Brand Header Card */}
      <div className="border-b border-slate-800/80 p-3 bg-[#05140e]">
        <div className="bg-white rounded-xl px-3 py-2.5 shadow-sm border border-amber-400/30 flex items-center justify-center overflow-hidden hover:shadow-md transition">
          <img
            src="/images/melayurveda-logo.png"
            alt="Mel Ayurveda - Nature Se Nirog, Ayurveda Se Swasth"
            className="w-full h-auto max-h-14 object-contain"
          />
        </div>
      </div>

      {/* User Persona Profile Card */}
      {user && (
        <div className="border-b border-slate-800/80 bg-white/[0.02] p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f3822] to-emerald-950 border border-amber-400/50 text-amber-300 font-bold text-xs shadow-md">
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
              <div className="text-[10px] text-slate-400 truncate">
                {getRoleDisplayName(user.role)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Sales Action Buttons in Sidebar (Exclusively for Salesperson role) */}
      {user && user.role === 'SALESPERSON' && (
        <div className="p-3 border-b border-slate-800/80 bg-white/[0.015] space-y-2">
          <button
            type="button"
            onClick={() => setIsCreateLeadOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#0a4e2b] hover:bg-[#083d22] text-white font-bold text-xs shadow-md border border-emerald-600/40 transition-all active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4 text-emerald-200" />
            <span>+ Register New Lead</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOrderOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#e58a00] hover:bg-[#cc7a00] text-emerald-950 font-extrabold text-xs shadow-md border border-amber-300/60 transition-all active:scale-[0.98]"
          >
            <ShoppingBag className="h-4 w-4 text-emerald-950" />
            <span>Create Order</span>
          </button>
        </div>
      )}

      {/* Nav List (Scrollbar Completely Hidden) */}
      <nav className="flex-1 overflow-y-auto px-3 py-2.5 space-y-1 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
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
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400 shadow-xs shadow-amber-400/80" />
                )
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-800/80 p-3 text-[10px] text-slate-400 bg-[#05140e] flex-shrink-0">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-0.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">MELAYURVEDA INDIA PVT. LTD.</span>
        </div>
        <p className="text-slate-500 text-[9px] leading-tight pl-5">Ayurvedic Formulations & Tele-Sales</p>
      </div>

      {/* 6-Field Lead Ingestion Modal */}
      <CreateLeadModal
        isOpen={isCreateLeadOpen}
        onClose={() => setIsCreateLeadOpen(false)}
        onLeadCreated={(newLead) => {
          setIsCreateLeadOpen(false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('lead-created', { detail: newLead }));
          }
          router.refresh();
        }}
      />

      {/* Disease-First Order Creation Modal with Editable Pricing */}
      <CreateOrderModal
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        onOrderCreated={(order) => {
          setIsCreateOrderOpen(false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('order-created', { detail: order }));
          }
          router.refresh();
        }}
      />
    </aside>
  );
}
