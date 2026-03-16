'use client';

import { type ChatActionRequest } from '@/types';

interface ChatActionCardProps {
  actionRequest: ChatActionRequest;
  isSubmitting?: boolean;
  onOpenTerminal: () => void;
  onSubmit: (submit: string) => void;
}

export function ChatActionCard({
  actionRequest,
  isSubmitting = false,
  onOpenTerminal,
  onSubmit,
}: ChatActionCardProps) {
  return (
    <div className="mt-4 rounded-[24px] border border-amber-400/20 bg-amber-400/[0.06] p-4 text-white/90">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">
            Quick action
          </p>
          <p className="mt-2 text-sm leading-6 text-white/85">{actionRequest.prompt}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/40">
          {actionRequest.source}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {actionRequest.options.map((option) => (
          <button
            key={`${actionRequest.id}-${option.value}`}
            className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => onSubmit(option.submit)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        className="mt-4 text-xs font-medium text-amber-100/80 underline decoration-white/20 underline-offset-4"
        disabled={isSubmitting}
        onClick={onOpenTerminal}
        type="button"
      >
        Open Terminal
      </button>
    </div>
  );
}
