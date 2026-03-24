'use client';

import { RefreshCcw, Search, X } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import MobileActionButton from '@/components/ui/mobile-action-button';

interface SessionListHeaderProps {
  isRefreshing: boolean;
  onClearSearch: () => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
}

export function SessionListHeader({
  isRefreshing,
  onClearSearch,
  onRefresh,
  onSearchChange,
  searchQuery,
}: SessionListHeaderProps) {
  return (
    <header
      className="shrink-0 px-4 pb-2.5"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
    >
      <div className="mb-3 flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex items-center gap-3">
          <AppLogo size={30} />
          <div>
            <h1 className="text-[1.05rem] font-semibold tracking-tight text-white/92">Codeject</h1>
            <p className="max-w-[15rem] text-[0.78rem] leading-5 text-white/45">
              Sessions, activity, and quick recovery.
            </p>
          </div>
        </div>
        <MobileActionButton
          className="max-w-[6.5rem]"
          disabled={isRefreshing}
          label="Refresh sessions"
          onClick={onRefresh}
          size="sm"
        >
          <RefreshCcw className={isRefreshing ? 'animate-spin shrink-0' : 'shrink-0'} size={16} />
          <span className="text-xs font-semibold">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
        </MobileActionButton>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
          size={16}
        />
        <input
          aria-label="Search sessions"
          className="input-focus w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-12 text-[0.95rem] text-white/86 placeholder:text-white/28"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search sessions, programs, or paths"
          type="search"
          value={searchQuery}
        />
        {searchQuery ? (
          <button
            aria-label="Clear search"
            className="interactive-focus-ring mobile-touch-target absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10"
            onClick={onClearSearch}
            type="button"
          >
            <X className="text-white/65" size={14} />
          </button>
        ) : null}
      </div>
    </header>
  );
}
