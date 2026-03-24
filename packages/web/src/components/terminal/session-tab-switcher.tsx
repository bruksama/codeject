'use client';

export type SessionTab = 'chat' | 'terminal';

interface SessionTabSwitcherProps {
  activeTab: SessionTab;
  onTabChange: (tab: SessionTab) => void;
  terminalBadge?: boolean;
}

export function SessionTabSwitcher({
  activeTab,
  onTabChange,
  terminalBadge = false,
}: SessionTabSwitcherProps) {
  return (
    <div className="flex w-full gap-1 rounded-2xl border border-white/8 bg-white/[0.03] p-1">
      <button
        className={`interactive-focus-ring mobile-touch-target flex-1 rounded-[14px] px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/70'
        }`}
        onClick={() => onTabChange('chat')}
        type="button"
      >
        Chat
      </button>
      <button
        className={`interactive-focus-ring mobile-touch-target relative flex-1 rounded-[14px] px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'terminal' ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/70'
        }`}
        onClick={() => onTabChange('terminal')}
        type="button"
      >
        Terminal
        {terminalBadge && activeTab !== 'terminal' ? (
          <span className="absolute right-3 top-2.5 h-2.5 w-2.5 rounded-full bg-amber-400" />
        ) : null}
      </button>
    </div>
  );
}
