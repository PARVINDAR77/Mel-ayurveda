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
    forest: 'bg-forest-50 text-forest-800 border-forest-200',
    gold: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md/50',
          className,
        ),
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h4 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</h4>
        </div>
        <div
          className={twMerge(
            clsx(
              'flex h-12 w-12 items-center justify-center rounded-xl border',
              iconThemeStyles[colorTheme],
            ),
          )}
        >
          <Icon className="h-6 w-6 stroke-[1.75]" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          {trend && (
            <span
              className={clsx(
                'inline-flex items-center font-semibold rounded px-1.5 py-0.5',
                trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
          {trend?.label && <span className="text-slate-400">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
