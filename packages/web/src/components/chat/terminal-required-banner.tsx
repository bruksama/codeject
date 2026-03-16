'use client';

import { AlertTriangle } from 'lucide-react';

interface TerminalRequiredBannerProps {
  onOpenTerminal: () => void;
  reason?: string;
}

export function TerminalRequiredBanner({ onOpenTerminal, reason }: TerminalRequiredBannerProps) {
  return (
    <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0" size={18} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Terminal attention required</p>
          <p className="mt-1 text-xs leading-5 text-amber-50/80">
            {reason || 'The runtime likely needs an approval, selection, or direct terminal input.'}
          </p>
        </div>
        <button
          className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-[#3a2b00]"
          onClick={onOpenTerminal}
          type="button"
        >
          Open Terminal
        </button>
      </div>
    </div>
  );
}
