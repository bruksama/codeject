'use client';

import { useState } from 'react';
import { type ChatActionRequest } from '@/types';

interface ChatActionCardProps {
  actionRequest: ChatActionRequest;
  isSubmitting?: boolean;
  onSubmit: (submit: string) => boolean | Promise<boolean>;
}

export function ChatActionCard({
  actionRequest,
  isSubmitting = false,
  onSubmit,
}: ChatActionCardProps) {
  const isFreeInput = actionRequest.kind === 'free-input';

  return (
    <div className="mt-4 rounded-[24px] border border-amber-400/20 bg-amber-400/[0.06] p-4 text-white/90">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-amber-200/70">
            {isFreeInput ? 'Input needed' : 'Quick action'}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/85">{actionRequest.prompt}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.16em] text-white/40">
          {actionRequest.source}
        </span>
      </div>

      {isFreeInput ? (
        <FreeInputActionForm
          key={`${actionRequest.id}:${actionRequest.prompt}:${actionRequest.context}`}
          actionRequest={actionRequest}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
        />
      ) : (
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
      )}
    </div>
  );
}

function FreeInputActionForm({
  actionRequest,
  isSubmitting,
  onSubmit,
}: {
  actionRequest: Extract<ChatActionRequest, { kind: 'free-input' }>;
  isSubmitting: boolean;
  onSubmit: (submit: string) => boolean | Promise<boolean>;
}) {
  const [isAwaitingResult, setIsAwaitingResult] = useState(false);
  const [freeInput, setFreeInput] = useState('');
  const isDisabled = isSubmitting || isAwaitingResult;

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (isDisabled) return;
        const nextValue = freeInput;
        setIsAwaitingResult(true);
        try {
          const didSubmit = await onSubmit(nextValue);
          if (didSubmit) {
            setFreeInput('');
          }
        } finally {
          setIsAwaitingResult(false);
        }
      }}
    >
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/45">
        Recent CLI output
      </p>
      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs leading-5 text-white/70">
        {actionRequest.context}
      </pre>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          autoFocus
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/90 outline-none placeholder:text-white/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDisabled}
          onChange={(event) => setFreeInput(event.target.value)}
          placeholder="Type a reply for the CLI"
          value={freeInput}
        />
        <button
          className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-medium text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[120px]"
          disabled={isDisabled}
          type="submit"
        >
          {freeInput.length > 0 ? 'Submit' : 'Send Enter'}
        </button>
      </div>
    </form>
  );
}
