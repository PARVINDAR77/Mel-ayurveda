import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={twMerge(
            clsx(
              'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-forest-700 focus:border-forest-700 disabled:bg-slate-50 disabled:text-slate-500',
              leftIcon ? 'pl-9' : 'pl-3',
              error ? 'border-red-500 focus:ring-red-400' : 'border-slate-300',
              className,
            ),
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
