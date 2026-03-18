'use client';

import { type TerminalKey } from '@/types';

const TERMINAL_KEYS: Array<{ key: TerminalKey; label: string }> = [
  { key: 'Escape', label: 'Esc' },
  { key: 'Tab', label: 'Tab' },
  { key: 'Ctrl+C', label: 'Ctrl+C' },
  { key: 'Ctrl+D', label: 'Ctrl+D' },
  { key: 'Ctrl+L', label: 'Ctrl+L' },
  { key: 'ArrowUp', label: 'Up' },
  { key: 'ArrowLeft', label: 'Left' },
  { key: 'ArrowDown', label: 'Down' },
  { key: 'ArrowRight', label: 'Right' },
];

interface TerminalKeyStripProps {
  disabled?: boolean;
  onKeyPress: (key: TerminalKey) => void;
}

export function TerminalKeyStrip({ disabled = false, onKeyPress }: TerminalKeyStripProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {TERMINAL_KEYS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onKeyPress(key)}
            className="glass-elevated rounded-2xl px-3 py-2 text-xs font-semibold text-white/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
