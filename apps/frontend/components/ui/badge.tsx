import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'blue'
    | 'purple'
    | 'gold'
    | 'slate'
    | 'leadStatus'
    | 'priority'
    | 'role';
  status?: string;
  className?: string;
}

export function Badge({ children, variant = 'default', status, className }: BadgeProps) {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (variant === 'success') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (variant === 'warning') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (variant === 'danger') {
    colorClasses = 'bg-red-50 text-red-800 border-red-200';
  } else if (variant === 'info' || variant === 'blue') {
    colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
  } else if (variant === 'purple') {
    colorClasses = 'bg-purple-50 text-purple-800 border-purple-200';
  } else if (variant === 'gold') {
    colorClasses = 'bg-amber-100 text-amber-900 border-amber-300';
  } else if (variant === 'slate') {
    colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';
  }

  // Automatic styling based on LeadStatus or OrderStatus or Priority
  const upperStatus = (status || (typeof children === 'string' ? children : '')).toUpperCase();

  let displayText: React.ReactNode = children;
  if (typeof children === 'string') {
    if (upperStatus === 'APPROVAL_REQUESTED') {
      displayText = 'APPROVED (IN APPROVAL)';
    } else if (upperStatus === 'APPROVED') {
      displayText = 'APPROVED & CLEARED';
    } else if (upperStatus === 'PENDING_REVIEW') {
      displayText = 'PENDING REVIEW';
    } else if (upperStatus === 'FOLLOW_UP_REQUIRED') {
      displayText = 'FOLLOW-UP REQUIRED';
    } else if (upperStatus === 'UNDER_REVIEW') {
      displayText = 'UNDER REVIEW';
    }
  }

  if (['APPROVED', 'CONVERTED', 'DELIVERED', 'COMPLETED', 'ACTIVE', 'PAID'].includes(upperStatus)) {
    colorClasses = 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold';
  } else if (['APPROVAL_REQUESTED'].includes(upperStatus)) {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
  } else if (['NEW', 'ASSIGNED', 'CONTACTED'].includes(upperStatus)) {
    colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
  } else if (['PENDING_REVIEW', 'UNDER_REVIEW', 'FOLLOW_UP_REQUIRED', 'PROCESSING', 'SCHEDULED', 'HOLD', 'ON_HOLD'].includes(upperStatus)) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (['REJECTED', 'CANCELLED', 'INVALID_NUMBER', 'FAILED', 'OVERDUE', 'URGENT'].includes(upperStatus)) {
    colorClasses = 'bg-red-50 text-red-800 border-red-200';
  } else if (['HIGH'].includes(upperStatus)) {
    colorClasses = 'bg-orange-50 text-orange-800 border-orange-200';
  } else if (['INTERESTED', 'SHIPPED', 'MANIFESTED'].includes(upperStatus)) {
    colorClasses = 'bg-purple-50 text-purple-800 border-purple-200';
  } else if (['SUPER_ADMIN'].includes(upperStatus)) {
    colorClasses = 'bg-forest-100 text-forest-900 border-forest-300 font-semibold';
  } else if (['SALESPERSON'].includes(upperStatus)) {
    colorClasses = 'bg-sky-50 text-sky-800 border-sky-200 font-semibold';
  } else if (['PENDING_REVIEWER'].includes(upperStatus)) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
  } else if (['APPROVAL_OFFICER'].includes(upperStatus)) {
    colorClasses = 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold';
  } else if (['MANAGEMENT'].includes(upperStatus)) {
    colorClasses = 'bg-teal-50 text-teal-800 border-teal-200 font-semibold';
  } else if (['FOLLOWUP_EXECUTIVE'].includes(upperStatus)) {
    colorClasses = 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold';
  }

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-wide uppercase',
          colorClasses,
          className,
        ),
      )}
    >
      {displayText}
    </span>
  );
}
