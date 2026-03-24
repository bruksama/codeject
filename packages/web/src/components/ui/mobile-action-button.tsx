'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface MobileActionButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> {
  children: ReactNode;
  className?: string;
  label: string;
  size?: 'md' | 'sm';
  variant?: 'ghost' | 'accent' | 'danger';
}

const variantClassName = {
  accent:
    'accent-gradient text-white shadow-[0_12px_24px_rgba(0,0,0,0.24)] hover:brightness-110 disabled:opacity-45',
  danger:
    'border border-red-500/25 bg-red-500/12 text-red-100 hover:bg-red-500/18 disabled:opacity-45',
  ghost:
    'border border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/[0.1] disabled:opacity-45',
} as const;

const sizeClassName = {
  md: 'h-11 min-w-11 rounded-2xl px-3',
  sm: 'h-10 min-w-10 rounded-xl px-2.5',
} as const;

export default function MobileActionButton({
  children,
  className = '',
  label,
  size = 'md',
  type = 'button',
  variant = 'ghost',
  ...props
}: MobileActionButtonProps) {
  return (
    <button
      aria-label={label}
      className={`interactive-focus-ring mobile-touch-target inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-150 active:scale-[0.97] [&>span]:truncate [&>svg]:shrink-0 ${sizeClassName[size]} ${variantClassName[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
