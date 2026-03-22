'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCcw, Search, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import InlineAlertBanner from '@/components/ui/inline-alert-banner';
import AppLogo from '@/components/ui/AppLogo';
import BottomTabBar from '@/components/ui/BottomTabBar';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import MobileActionButton from '@/components/ui/mobile-action-button';
import SessionCard from '@/components/sessions/SessionCard';
import { useSessionApi } from '@/hooks/use-session-api';
import { useAppStore } from '@/stores/useAppStore';
import { selectSessions } from '@/stores/use-app-store-selectors';
import type { Session } from '@/types';

function SessionCardSkeleton() {
  return (
    <div className="glass-card mb-3 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="skeleton h-11 w-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between gap-3">
            <div className="skeleton h-4 w-32 rounded-md" />
            <div className="skeleton h-3 w-20 rounded-md" />
          </div>
          <div className="skeleton h-3 w-24 rounded-md" />
          <div className="skeleton h-3 w-full rounded-md" />
          <div className="skeleton h-3 w-3/4 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  const router = useRouter();

  return (
    <div className="fade-in flex flex-col items-center justify-center px-8 py-20 text-center">
      <div
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl"
        style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
      >
        {hasSearch ? '🔍' : '💬'}
      </div>
      <h2 className="text-base font-semibold text-white/86">
        {hasSearch ? 'No sessions found' : 'No sessions yet'}
      </h2>
      <p className="mt-2 max-w-sm text-base leading-7 text-white/45">
        {hasSearch
          ? 'Try a different search term or clear the current filter.'
          : 'Start a session for Claude Code, Codex, or another CLI assistant and it will appear here.'}
      </p>
      {!hasSearch ? (
        <button
          className="interactive-focus-ring accent-gradient accent-glow-sm mt-6 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.98]"
          onClick={() => router.push('/new-session-setup')}
          type="button"
        >
          Create First Session
        </button>
      ) : null}
    </div>
  );
}

function buildSessionGroups(sessions: Session[]) {
  return sessions.reduce(
    (groups, session) => {
      if (
        session.status === 'connected' ||
        session.status === 'connecting' ||
        session.status === 'starting'
      ) {
        groups.active.push(session);
      } else if (session.status === 'idle') {
        groups.idle.push(session);
      } else if (session.status === 'error') {
        groups.error.push(session);
      } else {
        groups.disconnected.push(session);
      }

      return groups;
    },
    {
      active: [] as Session[],
      disconnected: [] as Session[],
      error: [] as Session[],
      idle: [] as Session[],
    }
  );
}

function StatusSummary({
  groupedSessions,
}: {
  groupedSessions: ReturnType<typeof buildSessionGroups>;
}) {
  const totalSessions =
    groupedSessions.active.length +
    groupedSessions.idle.length +
    groupedSessions.error.length +
    groupedSessions.disconnected.length;

  if (totalSessions === 0) {
    return null;
  }

  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {groupedSessions.active.length > 0 ? (
        <div className="flex items-center gap-1.5">
          <span className="status-pulse h-2 w-2 rounded-full bg-green-400" />
          <span className="text-xs font-medium text-green-300">
            {groupedSessions.active.length} active
          </span>
        </div>
      ) : null}
      {groupedSessions.idle.length > 0 ? (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          <span className="text-xs font-medium text-blue-300">
            {groupedSessions.idle.length} idle
          </span>
        </div>
      ) : null}
      {groupedSessions.error.length > 0 ? (
        <div className="flex items-center gap-1.5">
          <span className="status-pulse h-2 w-2 rounded-full bg-red-400" />
          <span className="text-xs font-medium text-red-300">
            {groupedSessions.error.length} needs attention
          </span>
        </div>
      ) : null}
      <div className="ml-auto flex items-center gap-1.5 text-white/35">
        <Zap className="text-white/35" size={12} />
        <span className="text-[0.6875rem]">{totalSessions} sessions</span>
      </div>
    </div>
  );
}

function SessionSection({
  label,
  onDelete,
  sessions,
  toneClassName,
}: {
  label: string;
  onDelete: (id: string) => void;
  sessions: Session[];
  toneClassName: string;
}) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <section className="mb-2">
      <h2
        className={`mb-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] ${toneClassName}`}
      >
        {label}
      </h2>
      {sessions.map((session) => (
        <SessionCard key={session.id} onDelete={onDelete} session={session} />
      ))}
    </section>
  );
}

export default function SessionsListPage() {
  const router = useRouter();
  const sessionApi = useSessionApi();
  const sessions = useAppStore(selectSessions);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  useEffect(() => {
    void (async () => {
      try {
        await sessionApi.loadSessions();
        setLoadError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load sessions';
        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sessionApi]);

  const filteredSessions = useMemo(() => {
    if (!deferredSearchQuery) {
      return sessions;
    }

    return sessions.filter((session) => {
      return (
        session.name.toLowerCase().includes(deferredSearchQuery) ||
        session.cliProgram.name.toLowerCase().includes(deferredSearchQuery) ||
        session.workspacePath.toLowerCase().includes(deferredSearchQuery)
      );
    });
  }, [deferredSearchQuery, sessions]);

  const groupedSessions = useMemo(() => buildSessionGroups(filteredSessions), [filteredSessions]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await sessionApi.deleteSession(id);
        toast.success('Session deleted');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete session');
      }
    },
    [sessionApi]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await sessionApi.loadSessions();
      setLoadError(null);
      toast.success('Sessions refreshed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh sessions';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div
      className="flex min-h-dvh flex-col bg-[#08080f]"
      style={{ paddingTop: 'env(safe-area-inset-top, 44px)' }}
    >
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
            onClick={() => void handleRefresh()}
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
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search sessions, programs, or paths"
            type="search"
            value={searchQuery}
          />
          {searchQuery ? (
            <button
              aria-label="Clear search"
              className="interactive-focus-ring mobile-touch-target absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10"
              onClick={() => setSearchQuery('')}
              type="button"
            >
              <X className="text-white/65" size={14} />
            </button>
          ) : null}
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto px-4 pt-2"
        id="main-content"
        tabIndex={-1}
        style={{
          paddingBottom:
            'calc(var(--session-list-bottom-clearance, 104px) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {loadError ? (
          <div className="mb-3">
            <InlineAlertBanner
              actions={
                <MobileActionButton
                  label="Retry loading sessions"
                  onClick={() => void handleRefresh()}
                  size="sm"
                  variant="accent"
                >
                  <RefreshCcw size={15} />
                  <span className="ml-2 text-xs font-semibold">Retry</span>
                </MobileActionButton>
              }
              message={loadError}
              title="Session list needs attention"
              tone="warning"
            />
          </div>
        ) : null}

        {isLoading ? (
          <div>
            {[1, 2, 3, 4].map((item) => (
              <SessionCardSkeleton key={item} />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <EmptyState hasSearch={Boolean(searchQuery.trim())} />
        ) : (
          <>
            <StatusSummary groupedSessions={groupedSessions} />
            <SessionSection
              label="Active"
              onDelete={handleDelete}
              sessions={groupedSessions.active}
              toneClassName="text-green-300/65"
            />
            <SessionSection
              label="Needs Attention"
              onDelete={handleDelete}
              sessions={groupedSessions.error}
              toneClassName="text-red-300/65"
            />
            <SessionSection
              label="Idle"
              onDelete={handleDelete}
              sessions={groupedSessions.idle}
              toneClassName="text-blue-300/65"
            />
            <SessionSection
              label="Disconnected"
              onDelete={handleDelete}
              sessions={groupedSessions.disconnected}
              toneClassName="text-white/35"
            />
          </>
        )}
      </main>

      <FloatingActionButton onClick={() => router.push('/new-session-setup')} />
      <BottomTabBar />
    </div>
  );
}
