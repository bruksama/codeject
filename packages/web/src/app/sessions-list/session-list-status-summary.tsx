'use client';

import { Zap } from 'lucide-react';
import type { SessionGroups } from './session-list-groups';

interface SessionListStatusSummaryProps {
  groupedSessions: SessionGroups;
}

export function SessionListStatusSummary({ groupedSessions }: SessionListStatusSummaryProps) {
  const totalSessions =
    groupedSessions.active.length +
    groupedSessions.idle.length +
    groupedSessions.error.length +
    groupedSessions.disconnected.length;

  if (totalSessions === 0) {
    return null;
  }

  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {groupedSessions.active.length > 0 ? (
        <div className="flex items-center gap-1.5">
          <span className="status-pulse h-2 w-2 rounded-full bg-green-400" />
          <span className="text-xs font-medium text-green-300">
            {groupedSessions.active.length} active
          </span>
        </div>
      ) : null}
      {groupedSessions.idle.length > 0 ? (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          <span className="text-xs font-medium text-blue-300">
            {groupedSessions.idle.length} idle
          </span>
        </div>
      ) : null}
      {groupedSessions.error.length > 0 ? (
        <div className="flex items-center gap-1.5">
          <span className="status-pulse h-2 w-2 rounded-full bg-red-400" />
          <span className="text-xs font-medium text-red-300">
            {groupedSessions.error.length} needs attention
          </span>
        </div>
      ) : null}
      <div className="ml-auto flex items-center gap-1.5 text-white/35">
        <Zap className="text-white/35" size={12} />
        <span className="text-[0.6875rem]">{totalSessions} sessions</span>
      </div>
    </div>
  );
}
