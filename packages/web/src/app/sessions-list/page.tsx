'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Zap, X } from 'lucide-react';
import { toast } from 'sonner';
import AppLogo from '@/components/ui/AppLogo';
import BottomTabBar from '@/components/ui/BottomTabBar';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import SessionCard from '@/components/sessions/SessionCard';
import { useSessionApi } from '@/hooks/use-session-api';
import { useAppStore } from '@/stores/useAppStore';
import { Session } from '@/types';

// Skeleton card for loading state
function SessionCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 mb-3">
      <div className="flex items-start gap-3">
        <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="skeleton h-4 w-32 rounded-md" />
            <div className="skeleton h-3 w-16 rounded-md" />
          </div>
          <div className="skeleton h-3 w-24 rounded-md" />
          <div className="skeleton h-3 w-full rounded-md" />
          <div className="skeleton h-3 w-3/4 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center fade-in">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5"
        style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
      >
        {hasSearch ? '🔍' : '💬'}
      </div>
      <h3 className="text-lg font-semibold text-white/80 mb-2">
        {hasSearch ? 'No sessions found' : 'No sessions yet'}
      </h3>
      <p className="text-sm text-white/40 leading-relaxed mb-6">
        {hasSearch
          ? 'Try a different search term or clear the filter.'
          : 'Start a new session to connect to Claude Code, Codex, or any CLI coding assistant.'}
      </p>
      {!hasSearch && (
        <button
          onClick={() => router.push('/new-session-setup')}
          className="accent-gradient px-6 py-3 rounded-2xl text-sm font-semibold text-white active:scale-95 transition-transform duration-150 accent-glow-sm"
        >
          Create First Session
        </button>
      )}
    </div>
  );
}

// Status summary bar
function StatusSummary({ sessions }: { sessions: Session[] }) {
  const connected = sessions.filter((s) => s.status === 'connected').length;
  const idle = sessions.filter((s) => s.status === 'idle').length;
  const errors = sessions.filter((s) => s.status === 'error').length;

  if (sessions.length === 0) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 mb-2"
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {connected > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 status-pulse" />
          <span className="text-xs text-green-400 font-medium">{connected} live</span>
        </div>
      )}
      {idle > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs text-blue-400 font-medium">{idle} idle</span>
        </div>
      )}
      {errors > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 status-pulse" />
          <span className="text-xs text-red-400 font-medium">{errors} error</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Zap size={11} className="text-purple-400/60" />
        <span className="text-[10px] text-white/30">{sessions.length} sessions</span>
      </div>
    </div>
  );
}

export default function SessionsListPage() {
  const router = useRouter();
  const sessionApi = useSessionApi();
  const { sessions } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  React.useEffect(() => {
    void (async () => {
      try {
        await sessionApi.loadSessions();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load sessions');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sessionApi]);

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.cliProgram.name.toLowerCase().includes(q) ||
      s.workspacePath.toLowerCase().includes(q)
    );
  });

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
      toast.success('Sessions refreshed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh sessions');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: '#08080f', paddingTop: 'env(safe-area-inset-top, 44px)' }}
    >
      {/* Header */}
      <header className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <AppLogo size={32} />
            <div>
              <span className="text-lg font-bold tracking-tight accent-gradient-text">
                Codeject
              </span>
              <p className="text-[10px] text-white/30 -mt-0.5">CLI Assistant Bridge</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
              isRefreshing
                ? 'bg-purple-500/20 animate-spin'
                : 'bg-white/5 hover:bg-white/10 active:scale-90'
            }`}
            aria-label="Refresh sessions"
            disabled={isRefreshing}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-white/50"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search sessions, programs, paths…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white/80 placeholder-white/25 input-focus transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center"
              aria-label="Clear search"
            >
              <X size={11} className="text-white/60" />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main
        className="flex-1 overflow-y-auto px-4 pt-3"
        style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}
      >
        {isLoading ? (
          <div>
            {[1, 2, 3, 4].map((i) => (
              <SessionCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <EmptyState hasSearch={!!searchQuery.trim()} />
        ) : (
          <>
            <StatusSummary sessions={filteredSessions} />

            {/* Sessions grouped by status */}
            {/* Connected first */}
            {filteredSessions.filter((s) => s.status === 'connected').length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400/50 mb-2 px-1">
                  Active
                </p>
                {filteredSessions
                  .filter((s) => s.status === 'connected')
                  .map((session) => (
                    <SessionCard key={session.id} session={session} onDelete={handleDelete} />
                  ))}
              </div>
            )}

            {/* Idle */}
            {filteredSessions.filter((s) => s.status === 'idle').length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/50 mb-2 px-1">
                  Idle
                </p>
                {filteredSessions
                  .filter((s) => s.status === 'idle')
                  .map((session) => (
                    <SessionCard key={session.id} session={session} onDelete={handleDelete} />
                  ))}
              </div>
            )}

            {/* Errors */}
            {filteredSessions.filter((s) => s.status === 'error').length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400/50 mb-2 px-1">
                  Needs Attention
                </p>
                {filteredSessions
                  .filter((s) => s.status === 'error')
                  .map((session) => (
                    <SessionCard key={session.id} session={session} onDelete={handleDelete} />
                  ))}
              </div>
            )}

            {/* Disconnected */}
            {filteredSessions.filter((s) => s.status === 'disconnected').length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-2 px-1">
                  Disconnected
                </p>
                {filteredSessions
                  .filter((s) => s.status === 'disconnected')
                  .map((session) => (
                    <SessionCard key={session.id} session={session} onDelete={handleDelete} />
                  ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* FAB */}
      <FloatingActionButton onClick={() => router.push('/new-session-setup')} />

      {/* Bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
