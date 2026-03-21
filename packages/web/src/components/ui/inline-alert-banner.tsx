'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';

interface InlineAlertBannerProps {
  actions?: ReactNode;
  message: string;
  title: string;
  tone?: 'danger' | 'info' | 'success' | 'warning';
}

const toneConfig = {
  danger: {
    className: 'border-red-500/20 bg-red-500/[0.08] text-red-50',
    icon: OctagonAlert,
    iconClassName: 'text-red-300',
    role: 'alert',
  },
  info: {
    className: 'border-white/10 bg-white/[0.05] text-white',
    icon: Info,
    iconClassName: 'text-white/70',
    role: 'status',
  },
  success: {
    className: 'border-green-500/20 bg-green-500/[0.08] text-green-50',
    icon: CheckCircle2,
    iconClassName: 'text-green-300',
    role: 'status',
  },
  warning: {
    className: 'border-amber-400/20 bg-amber-400/[0.08] text-amber-50',
    icon: AlertTriangle,
    iconClassName: 'text-amber-200',
    role: 'alert',
  },
} as const;

export default function InlineAlertBanner({
  actions,
  message,
  title,
  tone = 'info',
}: InlineAlertBannerProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <div
      aria-live={config.role === 'alert' ? 'assertive' : 'polite'}
      className={`rounded-[24px] border p-4 ${config.className}`}
      role={config.role}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 shrink-0 ${config.iconClassName}`} size={18} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-inherit/80">{message}</p>
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
