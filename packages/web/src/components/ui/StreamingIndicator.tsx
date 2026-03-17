'use client';

import React from 'react';
import ProgramIcon from '@/components/ui/program-icon';

interface StreamingIndicatorProps {
  programIcon?: string;
  programName?: string;
}

export default function StreamingIndicator({
  programIcon = '/assets/program-icons/claude.png',
  programName = 'Claude',
}: StreamingIndicatorProps) {
  return (
    <div
      className="mb-4 flex items-start gap-3 fade-in"
      aria-label={`${programName} is responding`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent-primary) 26%, transparent)',
        }}
      >
        <ProgramIcon alt={programName} icon={programIcon} size={18} />
      </div>
      <div className="bubble-assistant px-4 py-3 flex items-center gap-1" aria-hidden="true">
        <span className="streaming-dot accent-dot inline-block h-2 w-2 rounded-full" />
        <span className="streaming-dot accent-dot inline-block h-2 w-2 rounded-full" />
        <span className="streaming-dot accent-dot inline-block h-2 w-2 rounded-full" />
      </div>
    </div>
  );
}
