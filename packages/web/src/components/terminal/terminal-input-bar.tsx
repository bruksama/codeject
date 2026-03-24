'use client';

import { useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import MobileActionButton from '@/components/ui/mobile-action-button';

interface TerminalInputBarProps {
  disabled?: boolean;
  onSend: (value: string) => boolean;
}

export function TerminalInputBar({ disabled = false, onSend }: TerminalInputBarProps) {
  const [draft, setDraft] = useState('');

  const handleSubmit = () => {
    if (disabled) {
      return;
    }

    const didSend = onSend(draft);
    if (didSend) {
      setDraft('');
    }
  };

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <input
        aria-label="Terminal input"
        className="interactive-focus-ring mobile-touch-target h-11 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 text-sm text-white/88 placeholder:text-white/28 focus:outline-none"
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Type input for the CLI"
        type="text"
        value={draft}
      />
      <MobileActionButton
        disabled={disabled}
        label="Send terminal input"
        type="submit"
        variant="accent"
      >
        <CornerDownLeft size={16} />
        <span className="text-xs font-semibold">Send</span>
      </MobileActionButton>
    </form>
  );
}
