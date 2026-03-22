'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { SessionListEmptyState } from '@/app/sessions-list/session-list-empty-state';
import { buildSessionGroups } from '@/app/sessions-list/session-list-groups';
import { SessionListHeader } from '@/app/sessions-list/session-list-header';
import { SessionListLoadingSkeleton } from '@/app/sessions-list/session-list-loading-skeleton';
import { SessionListSection } from '@/app/sessions-list/session-list-section';
import { SessionListStatusSummary } from '@/app/sessions-list/session-list-status-summary';
import InlineAlertBanner from '@/components/ui/inline-alert-banner';
import BottomTabBar from '@/components/ui/BottomTabBar';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import MobileActionButton from '@/components/ui/mobile-action-button';
import { useSessionApi } from '@/hooks/use-session-api';
import { useAppStore } from '@/stores/useAppStore';
import { selectSessions } from '@/stores/use-app-store-selectors';

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
      <SessionListHeader
        isRefreshing={isRefreshing}
        onClearSearch={() => setSearchQuery('')}
        onRefresh={() => void handleRefresh()}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
      />

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
              <SessionListLoadingSkeleton key={item} />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <SessionListEmptyState hasSearch={Boolean(searchQuery.trim())} />
        ) : (
          <>
            <SessionListStatusSummary groupedSessions={groupedSessions} />
            <SessionListSection
              label="Active"
              onDelete={handleDelete}
              sessions={groupedSessions.active}
              toneClassName="text-green-300/65"
            />
            <SessionListSection
              label="Needs Attention"
              onDelete={handleDelete}
              sessions={groupedSessions.error}
              toneClassName="text-red-300/65"
            />
            <SessionListSection
              label="Idle"
              onDelete={handleDelete}
              sessions={groupedSessions.idle}
              toneClassName="text-blue-300/65"
            />
            <SessionListSection
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
