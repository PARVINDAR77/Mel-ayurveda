import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number | string;
    isPositive?: boolean;
    label?: string;
  };
  colorTheme?: 'forest' | 'gold' | 'blue' | 'purple' | 'emerald' | 'amber';
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorTheme = 'forest',
  className,
}: StatCardProps) {
  const iconThemeStyles = {
    forest: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    gold: 'bg-amber-50 text-amber-700 border-amber-200/80',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
    emerald: 'bg-teal-50 text-teal-700 border-teal-200/80',
    amber: 'bg-orange-50 text-orange-700 border-orange-200/80',
  };

  const accentTopBorders = {
    forest: 'border-t-emerald-600',
    gold: 'border-t-amber-500',
    blue: 'border-t-blue-500',
    purple: 'border-t-purple-500',
    emerald: 'border-t-teal-500',
    amber: 'border-t-orange-500',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'relative overflow-hidden rounded-2xl border border-slate-200/80 border-t-3 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300',
          accentTopBorders[colorTheme],
          className,
        ),
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">{title}</p>
          <h4 className="mt-1 text-2xl font-black tracking-tight text-slate-900 truncate">{value}</h4>
        </div>
        <div
          className={twMerge(
            clsx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-xs',
              iconThemeStyles[colorTheme],
            ),
          )}
        >
          <Icon className="h-5 w-5 stroke-[2]" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100 text-xs">
          {trend && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 font-bold rounded-md px-1.5 py-0.5 text-[11px]',
                trend.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
              )}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
              {trend.label && <span className="font-normal text-slate-600">({trend.label})</span>}
            </span>
          )}
          {subtitle && <span className="text-slate-500 text-[11px] font-medium">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
