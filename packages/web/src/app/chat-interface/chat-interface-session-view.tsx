'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ConnectionStatusBanner } from '@/components/chat/connection-status-banner';
import { ChatSessionErrorRecoveryBanner } from '@/components/chat/chat-session-error-recovery-banner';
import { ChatSessionPane } from '@/components/chat/chat-session-pane';
import { TerminalRequiredBanner } from '@/components/chat/terminal-required-banner';
import { type SessionTab, SessionTabSwitcher } from '@/components/terminal/session-tab-switcher';
import { TerminalTab } from '@/components/terminal/terminal-tab';
import ConnectionBadge from '@/components/ui/ConnectionBadge';
import MobileActionButton from '@/components/ui/mobile-action-button';
import { MobileScreenHeader } from '@/components/ui/mobile-screen-header';
import { useChatNotifications } from '@/hooks/use-chat-notifications';
import { useHybridSession } from '@/hooks/use-hybrid-session';
import { useSessionApi } from '@/hooks/use-session-api';
import type { Session } from '@/types';

interface ChatInterfaceSessionViewProps {
  onBackToSessions: () => void;
  session: Session;
}

export function ChatInterfaceSessionView({
  onBackToSessions,
  session,
}: ChatInterfaceSessionViewProps) {
  const sessionApi = useSessionApi();
  const [activeTab, setActiveTab] = useState<SessionTab>('chat');
  const [chatDraft, setChatDraft] = useState('');
  const { handleMessage: handleNotificationMessage } = useChatNotifications(session.id);
  const hybrid = useHybridSession(session.id, { onMessage: handleNotificationMessage });
  const reconnectToastCycleRef = useRef<string | null>(null);

  useEffect(() => {
    void sessionApi.loadSession(session.id).catch(() => undefined);
  }, [session.id, sessionApi]);

  const handleReconnectSession = () => {
    hybrid.reconnect();
    toast(`Trying to reconnect ${session.cliProgram.name}`);
  };

  const reconnectSessionFromToast = useEffectEvent(() => {
    handleReconnectSession();
  });

  useEffect(() => {
    const toastId = `session-reconnect-${session.id}`;
    const disconnectCycleKey = hybrid.lastDisconnectedAt?.toISOString() ?? null;

    if (!disconnectCycleKey || hybrid.status !== 'disconnected') {
      reconnectToastCycleRef.current = null;
      toast.dismiss(toastId);
      return;
    }

    if (hybrid.reconnectAttempts < 3 || reconnectToastCycleRef.current === disconnectCycleKey) {
      return;
    }

    reconnectToastCycleRef.current = disconnectCycleKey;
    toast.error('Connection lost. Retrying...', {
      action: {
        label: 'Reconnect now',
        onClick: () => reconnectSessionFromToast(),
      },
      id: toastId,
    });
  }, [hybrid.lastDisconnectedAt, hybrid.reconnectAttempts, hybrid.status, session.id]);

  const showRecoveryBanner = hybrid.status === 'error' || Boolean(hybrid.lastError);
  const showTerminalRequired = hybrid.surfaceRequirement === 'terminal-required';
  const showTerminalBadge = showTerminalRequired && !hybrid.chatState?.actionRequest;
  const shouldShowTerminalBanner = showTerminalRequired && activeTab === 'chat';
  const isSubmittingAction =
    Boolean(hybrid.submittingActionId) &&
    hybrid.submittingActionId === hybrid.chatState?.actionRequest?.id;
  const isHandlingPrompt =
    hybrid.chatState?.phase === 'awaiting-assistant' ||
    hybrid.chatState?.phase === 'streaming-assistant';

  const handleActionSubmit = async (submit: string) => {
    const actionRequest = hybrid.chatState?.actionRequest;
    if (!actionRequest) return false;
    const didSubmit = hybrid.submitActionInput(actionRequest.id, submit);
    if (!didSubmit) {
      toast.error('CLI input is unavailable');
    }
    return didSubmit;
  };

  const handleTerminalInput = (value: string) => {
    const didSend = hybrid.sendTerminalInput(value);
    if (!didSend) {
      toast.error('Terminal input is unavailable');
    }
    return didSend;
  };

  const handleTerminalKey = (key: Parameters<typeof hybrid.sendTerminalKey>[0]) => {
    if (!hybrid.sendTerminalKey(key)) {
      toast.error('Terminal input is unavailable');
    }
  };

  const handleTabChange = (tab: SessionTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#08080f]">
      <MobileScreenHeader
        bottomContent={
          <div className="flex w-full min-w-0 items-center gap-1.5">
            <ConnectionBadge
              className="shrink-0 gap-1.5 px-2.5 py-1.5 text-[0.68rem] leading-none"
              showLabel
              size="sm"
              status={hybrid.status}
            />
            <div
              className="inline-flex h-8 min-w-0 flex-1 items-center rounded-full border border-white/8 bg-white/[0.03] px-3 text-[0.7rem] leading-none text-white/48"
              title={session.terminal?.sessionName ?? 'tmux starting'}
            >
              <span className="truncate">
                {session.terminal?.sessionName ? session.terminal.sessionName : 'tmux starting'}
              </span>
            </div>
            <SessionTabSwitcher
              activeTab={activeTab}
              compact
              onTabChange={handleTabChange}
              terminalBadge={showTerminalBadge}
            />
          </div>
        }
        onBack={onBackToSessions}
        rightActions={
          <MobileActionButton
            className="w-10 gap-0 rounded-full px-0 shadow-none"
            label="Reconnect session"
            onClick={handleReconnectSession}
            size="sm"
            title="Reconnect session"
          >
            <RefreshCcw
              className={hybrid.status === 'connecting' ? 'animate-spin shrink-0' : 'shrink-0'}
              size={16}
            />
          </MobileActionButton>
        }
        subtitle={`${session.cliProgram.name} · ${session.workspacePath}`}
        title={session.name}
      />

      <main
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-2.5 pb-2 pt-3"
        id="main-content"
        tabIndex={-1}
      >
        {showRecoveryBanner ? (
          <ChatSessionErrorRecoveryBanner
            message={hybrid.lastError}
            onGoToSessions={onBackToSessions}
            onReconnect={handleReconnectSession}
          />
        ) : null}

        {shouldShowTerminalBanner ? (
          <TerminalRequiredBanner
            reason={hybrid.chatState?.terminalRequiredReason}
            showTerminalTabHint={showTerminalBadge}
          />
        ) : null}

        {!showRecoveryBanner ? (
          <ConnectionStatusBanner
            hasConnected={hybrid.hasConnected}
            lastDisconnectedAt={hybrid.lastDisconnectedAt}
            lastReconnectedAt={hybrid.lastReconnectedAt}
            onReconnectNow={handleReconnectSession}
            status={hybrid.status}
          />
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
          <div className={activeTab === 'chat' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
            <ChatSessionPane
              chatState={hybrid.chatState}
              cliProgramId={session.cliProgram.id}
              disabled={hybrid.status === 'error'}
              errorMessage={showRecoveryBanner ? hybrid.lastError : null}
              isBusy={isHandlingPrompt}
              isVisible={activeTab === 'chat'}
              isSubmittingAction={isSubmittingAction}
              messages={hybrid.messages}
              onInterrupt={() => hybrid.interruptPrompt()}
              onSubmitAction={handleActionSubmit}
              onSubmitPrompt={() => {
                if (!hybrid.sendPrompt(chatDraft)) {
                  toast.error('Unable to send chat prompt');
                  return;
                }
                setChatDraft('');
              }}
              onValueChange={setChatDraft}
              programIcon={session.cliProgram.icon}
              programName={session.cliProgram.name}
              sessionId={session.id}
              value={chatDraft}
            />
          </div>
          <div className={activeTab === 'terminal' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
            <TerminalTab
              disabled={hybrid.status !== 'connected'}
              isActive={activeTab === 'terminal'}
              onSendInput={handleTerminalInput}
              onSendKey={handleTerminalKey}
              snapshot={hybrid.terminalSnapshot}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
