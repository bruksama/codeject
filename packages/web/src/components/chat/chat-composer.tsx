'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';

interface ChatComposerProps {
  disabled?: boolean;
  errorMessage?: string | null;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
  value: string;
}

const IDLE_HEIGHT = 40;
const EXPANDED_HEIGHT = 112;

export function ChatComposer({
  disabled = false,
  errorMessage,
  onSubmit,
  onValueChange,
  value,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = '0px';
    const nextHeight = Math.min(
      Math.max(element.scrollHeight, IDLE_HEIGHT),
      isFocused ? EXPANDED_HEIGHT : IDLE_HEIGHT
    );
    element.style.height = `${nextHeight}px`;
  }, [isFocused, value]);

  const canSubmit = !disabled && value.trim().length > 0;
  const isExpanded = isFocused || value.includes('\n');

  return (
    <div className="glass-card rounded-[20px] border border-white/10 px-3 pb-3 pt-2.5">
      <div
        className={`flex items-end gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-2.5 py-2 transition-all duration-200 ${
          isExpanded ? 'border-white/14 bg-white/[0.06]' : ''
        }`}
      >
        <textarea
          ref={textareaRef}
          className="auto-grow-textarea w-full flex-1 bg-transparent px-1.5 py-1 text-sm leading-6 text-white/90 placeholder:text-white/25 focus:outline-none"
          disabled={disabled}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (canSubmit) {
                onSubmit();
              }
            }
          }}
          placeholder="Message your CLI session"
          rows={1}
          value={value}
        />
        <button
          className={`accent-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white transition-all duration-200 active:scale-[0.98] ${
            canSubmit ? 'opacity-100' : 'pointer-events-none opacity-45'
          } ${isExpanded ? 'h-11 w-11' : ''}`}
          onClick={onSubmit}
          type="button"
        >
          <SendHorizontal size={17} />
        </button>
      </div>
      {errorMessage ? <p className="px-1 pt-2 text-xs text-red-400/85">{errorMessage}</p> : null}
    </div>
  );
}
