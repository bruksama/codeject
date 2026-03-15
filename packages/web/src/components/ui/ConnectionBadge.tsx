'use client';

import React from 'react';
import { ConnectionStatus } from '@/types';

interface ConnectionBadgeProps {
  status: ConnectionStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<
  ConnectionStatus,
  { label: string; dotClass: string; badgeClass: string; pulse: boolean }
> = {
  connected: {
    label: 'Connected',
    dotClass: 'bg-green-400',
    badgeClass: 'bg-green-500/15 text-green-400 border-green-500/25',
    pulse: true,
  },
  connecting: {
    label: 'Connecting',
    dotClass: 'bg-yellow-400',
    badgeClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    pulse: true,
  },
  idle: {
    label: 'Idle',
    dotClass: 'bg-blue-400',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    pulse: false,
  },
  disconnected: {
    label: 'Disconnected',
    dotClass: 'bg-gray-500',
    badgeClass: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
    pulse: false,
  },
  error: {
    label: 'Error',
    dotClass: 'bg-red-400',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/25',
    pulse: true,
  },
};

export default function ConnectionBadge({
  status,
  showLabel = false,
  size = 'sm',
  className = '',
}: ConnectionBadgeProps) {
  const config = statusConfig[status];

  if (showLabel) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${config.badgeClass} ${className}`}
      >
        <span
          className={`rounded-full ${config.dotClass} ${config.pulse ? 'status-pulse' : ''} ${
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
          }`}
        />
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-block rounded-full ${config.dotClass} ${config.pulse ? 'status-pulse' : ''} ${
        size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
      } ${className}`}
      title={config.label}
      aria-label={`Status: ${config.label}`}
    />
  );
}
