'use client';

import type { TerminalKey } from '@/types';

interface TerminalVirtualKeyboardProps {
  disabled?: boolean;
  onKey: (key: TerminalKey) => void;
}

const KEY_ROWS: Array<Array<{ key: TerminalKey; label: string }>> = [
  [
    { key: 'Enter', label: 'Enter' },
    { key: 'Tab', label: 'Tab' },
    { key: 'Escape', label: 'Esc' },
    { key: 'Up', label: '↑' },
    { key: 'Down', label: '↓' },
    { key: 'Left', label: '←' },
    { key: 'Right', label: '→' },
  ],
  [
    { key: 'C-c', label: 'Ctrl+C' },
    { key: 'C-d', label: 'Ctrl+D' },
    { key: 'C-z', label: 'Ctrl+Z' },
    { key: 'C-l', label: 'Ctrl+L' },
    { key: 'BSpace', label: '⌫' },
    { key: 'DC', label: 'Del' },
  ],
];

const ROW_CLASS_NAMES = ['grid-cols-7', 'grid-cols-6'] as const;

export function TerminalVirtualKeyboard({ disabled = false, onKey }: TerminalVirtualKeyboardProps) {
  return (
    <div className="flex flex-col gap-2">
      {KEY_ROWS.map((row, index) => (
        <div key={ROW_CLASS_NAMES[index]} className={`grid gap-2 ${ROW_CLASS_NAMES[index]}`}>
          {row.map(({ key, label }) => (
            <button
              key={key}
              className="interactive-focus-ring mobile-touch-target min-h-11 rounded-2xl border border-white/8 bg-white/[0.04] px-1.5 text-xs font-medium text-white/72 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={disabled}
              onClick={() => onKey(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
