'use client';

import type { EngineerKitStableCommand } from '@/lib/engineer-kit-stable-commands';
import type { ProviderCommandPrefix } from '@/lib/provider-command-prefix';

interface ChatComposerCommandSuggestionMenuProps {
  activeIndex: number;
  onSelect: (commandId: string) => void;
  providerPrefix: ProviderCommandPrefix;
  suggestions: readonly EngineerKitStableCommand[];
}

export function ChatComposerCommandSuggestionMenu({
  activeIndex,
  onSelect,
  providerPrefix,
  suggestions,
}: ChatComposerCommandSuggestionMenuProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className="slide-up relative z-10 mb-2 overflow-hidden rounded-[22px] border border-white/12 bg-[rgba(12,12,20,0.9)] shadow-[0_18px_36px_rgba(0,0,0,0.34)]"
      style={{
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div className="border-b border-white/8 px-3 py-2 text-[0.625rem] uppercase tracking-[0.22em] text-white/35">
        ClaudeKit Commands
      </div>
      <div className="max-h-72 overflow-y-auto px-2 py-2">
        {suggestions.map((command, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              className={`flex w-full flex-col rounded-2xl px-3 py-2.5 text-left transition-all duration-150 ${
                isActive ? 'bg-white/10 text-white' : 'text-white/78 hover:bg-white/6'
              }`}
              key={command.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(command.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[0.75rem] font-semibold text-white/92">
                  {providerPrefix}
                  {command.id}
                </span>
                {command.argsHint ? (
                  <span className="max-w-[42%] truncate text-[0.625rem] text-white/32">
                    {command.argsHint}
                  </span>
                ) : null}
              </div>
              <span className="mt-1 text-[0.75rem] font-medium">{command.title}</span>
              <span className="mt-1 line-clamp-2 text-[0.6875rem] leading-5 text-white/48">
                {command.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
