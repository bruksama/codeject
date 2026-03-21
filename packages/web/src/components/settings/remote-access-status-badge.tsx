'use client';

import type { TunnelLifecycleState } from '@/types';

interface RemoteAccessStatusBadgeProps {
  status: TunnelLifecycleState;
}

const statusConfig: Record<TunnelLifecycleState, { className: string; label: string }> = {
  active: {
    className: 'border-green-500/25 bg-green-500/15 text-green-300',
    label: 'Active',
  },
  error: {
    className: 'border-red-500/25 bg-red-500/15 text-red-300',
    label: 'Error',
  },
  inactive: {
    className: 'border-white/10 bg-white/5 text-white/55',
    label: 'Inactive',
  },
  starting: {
    className: 'border-amber-500/25 bg-amber-500/15 text-amber-200',
    label: 'Starting',
  },
  stopping: {
    className: 'border-orange-500/25 bg-orange-500/15 text-orange-200',
    label: 'Stopping',
  },
};

export function RemoteAccessStatusBadge({ status }: RemoteAccessStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
