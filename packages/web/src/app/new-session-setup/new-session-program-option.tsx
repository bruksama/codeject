'use client';

import { Check } from 'lucide-react';
import ProgramIcon from '@/components/ui/program-icon';
import type { CliProgram } from '@/types';

interface NewSessionProgramOptionProps {
  onSelect: () => void;
  program: CliProgram;
  selected: boolean;
}

export function NewSessionProgramOption({
  onSelect,
  program,
  selected,
}: NewSessionProgramOptionProps) {
  return (
    <button
      aria-pressed={selected}
      className={`interactive-focus-ring mobile-touch-target flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all duration-150 active:scale-[0.98] ${
        selected
          ? 'border-purple-500/50 bg-purple-500/10'
          : 'border-white/8 bg-white/3 hover:bg-white/6'
      }`}
      onClick={onSelect}
      style={{
        border: `1px solid ${selected ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
      }}
      type="button"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{
          background: selected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${selected ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        <ProgramIcon alt={program.name} icon={program.icon} size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white/92">{program.name}</p>
        <p className="mt-1 text-xs font-mono leading-5 text-white/45">{program.command}</p>
      </div>
      {selected ? (
        <div className="accent-gradient flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
          <Check size={13} className="text-white" strokeWidth={3} />
        </div>
      ) : null}
    </button>
  );
}
