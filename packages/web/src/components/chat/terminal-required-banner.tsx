'use client';

import { AlertTriangle } from 'lucide-react';

interface TerminalRequiredBannerProps {
  reason?: string;
}

export function TerminalRequiredBanner({ reason }: TerminalRequiredBannerProps) {
  return (
    <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0" size={18} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">CLI needs input</p>
          {reason ? (
            <>
              <p className="mt-1 text-xs leading-5 text-amber-50/80">{reason}</p>
              <p className="text-xs leading-5 text-amber-50/70">Use the action card below.</p>
            </>
          ) : (
            <p className="mt-1 text-xs leading-5 text-amber-50/80">
              Reply in the card below to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
