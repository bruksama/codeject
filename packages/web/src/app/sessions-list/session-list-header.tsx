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
    <header className="px-4 pb-3 pt-3">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AppLogo size={34} />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white/92">Codeject</h1>
            <p className="text-sm leading-6 text-white/45">
              Sessions, activity, and quick recovery.
            </p>
          </div>
        </div>
        <MobileActionButton
          disabled={isRefreshing}
          label="Refresh sessions"
          onClick={onRefresh}
          size="sm"
        >
          <RefreshCcw className={isRefreshing ? 'animate-spin' : ''} size={16} />
          <span className="ml-2 text-xs font-semibold">
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </span>
        </MobileActionButton>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
          size={16}
        />
        <input
          aria-label="Search sessions"
          className="input-focus w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-12 text-base text-white/86 placeholder:text-white/28"
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
