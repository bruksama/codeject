'use client';

import { useEffect, useRef } from 'react';
import { CornerDownLeft, Delete, SendHorizontal } from 'lucide-react';

interface TerminalInputBarProps {
  disabled?: boolean;
  onBackspace: () => void;
  onEnter: () => void;
  onSubmit: (value: string) => void;
  value: string;
  onValueChange: (value: string) => void;
}

export function TerminalInputBar({
  disabled = false,
  onBackspace,
  onEnter,
  onSubmit,
  onValueChange,
  value,
}: TerminalInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }, [value]);

  return (
    <div className="glass-card rounded-[24px] border border-white/10 p-3">
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          className="auto-grow-textarea input-focus min-h-[44px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 placeholder:text-white/25"
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="Type terminal input"
          value={value}
        />
        <button
          className="glass-elevated flex h-11 w-11 items-center justify-center rounded-2xl text-white/75 active:scale-[0.98]"
          disabled={disabled}
          onClick={onBackspace}
          type="button"
        >
          <Delete size={17} />
        </button>
        <button
          className="glass-elevated flex h-11 w-11 items-center justify-center rounded-2xl text-white/75 active:scale-[0.98]"
          disabled={disabled}
          onClick={onEnter}
          type="button"
        >
          <CornerDownLeft size={17} />
        </button>
        <button
          className="accent-gradient flex h-11 w-11 items-center justify-center rounded-2xl text-white active:scale-[0.98]"
          disabled={disabled}
          onClick={() => onSubmit(value)}
          type="button"
        >
          <SendHorizontal size={17} />
        </button>
      </div>
    </div>
  );
}
