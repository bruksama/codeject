'use client';

import { MessageSquare, SquareTerminal } from 'lucide-react';

export type SessionTab = 'chat' | 'terminal';

interface SessionTabSwitcherProps {
  activeTab: SessionTab;
  className?: string;
  compact?: boolean;
  onTabChange: (tab: SessionTab) => void;
  terminalBadge?: boolean;
}

export function SessionTabSwitcher({
  activeTab,
  className = '',
  compact = false,
  onTabChange,
  terminalBadge = false,
}: SessionTabSwitcherProps) {
  const containerClassName = compact
    ? 'inline-flex shrink-0 items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1'
    : 'flex w-full items-center gap-1 rounded-2xl border border-white/8 bg-white/[0.03] p-1';
  const buttonBaseClassName = compact
    ? 'interactive-focus-ring mobile-touch-target relative inline-flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition-all duration-150'
    : 'interactive-focus-ring mobile-touch-target relative flex-1 rounded-[14px] px-4 py-2 text-sm font-medium transition-colors';

  return (
    <div
      aria-label="Session surface switcher"
      className={`${containerClassName} ${className}`.trim()}
      role="group"
    >
      <button
        className={`${buttonBaseClassName} ${
          activeTab === 'chat'
            ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
            : 'text-white/45 hover:bg-white/[0.04] hover:text-white/72'
        }`}
        aria-label="Chat"
        aria-pressed={activeTab === 'chat'}
        onClick={() => onTabChange('chat')}
        title="Chat"
        type="button"
      >
        {compact ? <MessageSquare aria-hidden="true" size={15} strokeWidth={2.1} /> : 'Chat'}
      </button>
      <button
        className={`${buttonBaseClassName} ${
          activeTab === 'terminal'
            ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
            : 'text-white/45 hover:bg-white/[0.04] hover:text-white/72'
        }`}
        aria-label="Terminal"
        aria-pressed={activeTab === 'terminal'}
        onClick={() => onTabChange('terminal')}
        title="Terminal"
        type="button"
      >
        {compact ? <SquareTerminal aria-hidden="true" size={15} strokeWidth={2.1} /> : 'Terminal'}
        {terminalBadge && activeTab !== 'terminal' ? (
          <span
            aria-hidden="true"
            className={`absolute h-2.5 w-2.5 rounded-full bg-amber-400 ${
              compact ? 'right-1.5 top-1.5 ring-2 ring-[#08080f]' : 'right-3 top-2.5'
            }`}
            data-terminal-badge="true"
          />
        ) : null}
      </button>
    </div>
  );
}
