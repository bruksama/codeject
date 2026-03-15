'use client';

import React from 'react';

interface StreamingIndicatorProps {
  programIcon?: string;
  programName?: string;
}

export default function StreamingIndicator({
  programIcon = '🤖',
  programName = 'Claude',
}: StreamingIndicatorProps) {
  return (
    <div className="flex items-start gap-3 fade-in" aria-label={`${programName} is responding`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
        style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}
      >
        <span>{programIcon}</span>
      </div>
      <div className="bubble-assistant px-4 py-3 flex items-center gap-1" aria-hidden="true">
        <span className="streaming-dot w-2 h-2 rounded-full bg-purple-400 inline-block" />
        <span className="streaming-dot w-2 h-2 rounded-full bg-purple-400 inline-block" />
        <span className="streaming-dot w-2 h-2 rounded-full bg-purple-400 inline-block" />
      </div>
    </div>
  );
}
