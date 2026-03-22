'use client';

import { Terminal } from 'lucide-react';
import ProgramIcon from '@/components/ui/program-icon';
import type { CliProgram } from '@/types';
import { generateSessionName } from './new-session-form-types';

interface NewSessionPreviewCardProps {
  customCommand: string;
  isCustom: boolean;
  selectedProgram: CliProgram;
  sessionName: string;
  workspacePath: string;
}

export function NewSessionPreviewCard({
  customCommand,
  isCustom,
  selectedProgram,
  sessionName,
  workspacePath,
}: NewSessionPreviewCardProps) {
  return (
    <div
      className="fade-in rounded-2xl p-4"
      style={{
        background: 'rgba(124,58,237,0.06)',
        border: '1px solid rgba(124,58,237,0.2)',
      }}
    >
      <p className="mb-3 text-[0.625rem] font-semibold uppercase tracking-widest text-purple-400/60">
        Session Preview
      </p>
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
          style={{
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(124,58,237,0.25)',
          }}
        >
          <ProgramIcon alt={selectedProgram.name} icon={selectedProgram.icon} size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white/92">
            {sessionName || generateSessionName(workspacePath) || 'new-session'}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-white/40">{workspacePath}</p>
        </div>
        <div className="status-pulse h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-400" />
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-white/6 pt-3">
        <Terminal size={12} className="text-white/28" />
        <code className="text-xs text-white/48">
          {isCustom ? customCommand || 'command…' : selectedProgram.command}
        </code>
      </div>
    </div>
  );
}
