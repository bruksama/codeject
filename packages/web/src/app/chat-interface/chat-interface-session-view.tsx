'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ConnectionStatusBanner } from '@/components/chat/connection-status-banner';
import { ChatSessionErrorRecoveryBanner } from '@/components/chat/chat-session-error-recovery-banner';
import { ChatTranscript } from '@/components/chat/chat-transcript';
import { TerminalRequiredBanner } from '@/components/chat/terminal-required-banner';
import ConnectionBadge from '@/components/ui/ConnectionBadge';
import MobileActionButton from '@/components/ui/mobile-action-button';
import { MobileScreenHeader } from '@/components/ui/mobile-screen-header';
import ProgramIcon from '@/components/ui/program-icon';
import { useHybridSession } from '@/hooks/use-hybrid-session';
import { useSessionApi } from '@/hooks/use-session-api';
import type { Session } from '@/types';

const CHAT_COMPOSER_CLEARANCE = 'calc(58px * var(--app-font-scale))';
const CHAT_COMPOSER_MENU_CLEARANCE = 'calc(350px * var(--app-font-scale))';

interface ChatInterfaceSessionViewProps {
  onBackToSessions: () => void;
  session: Session;
}

export function ChatInterfaceSessionView({
  onBackToSessions,
  session,
}: ChatInterfaceSessionViewProps) {
  const sessionApi = useSessionApi();
  const [chatDraft, setChatDraft] = useState('');
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const hybrid = useHybridSession(session.id);
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

  return (
    <div className="flex min-h-dvh flex-col bg-[#08080f]">
      <MobileScreenHeader
        onBack={onBackToSessions}
        rightActions={
          <MobileActionButton label="Reconnect session" onClick={handleReconnectSession} size="sm">
            <RefreshCcw size={16} />
            <span className="ml-2 text-xs font-semibold">Reconnect</span>
          </MobileActionButton>
        }
        subtitle={`${session.cliProgram.name} · ${session.workspacePath}`}
        title={session.name}
      />

      <main
        className="flex min-h-0 flex-1 flex-col gap-3 px-2.5 pb-3"
        id="main-content"
        tabIndex={-1}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
              <ProgramIcon alt={session.cliProgram.name} icon={session.cliProgram.icon} size={16} />
            </div>
            <ConnectionBadge showLabel size="sm" status={hybrid.status} />
          </div>
          <div className="max-w-[68vw] truncate rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[0.6875rem] text-white/48">
            {session.terminal?.sessionName ? session.terminal.sessionName : 'tmux starting'}
          </div>
        </div>

        {showRecoveryBanner ? (
          <ChatSessionErrorRecoveryBanner
            message={hybrid.lastError}
            onGoToSessions={onBackToSessions}
            onReconnect={handleReconnectSession}
          />
        ) : null}

        {showTerminalRequired ? (
          <TerminalRequiredBanner reason={hybrid.chatState?.terminalRequiredReason} />
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

        <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] px-3 pb-2 pt-3">
          <div className="h-full min-h-0 flex-1">
            <ChatTranscript
              chatState={hybrid.chatState}
              composerClearance={
                isCommandMenuOpen ? CHAT_COMPOSER_MENU_CLEARANCE : CHAT_COMPOSER_CLEARANCE
              }
              isSubmittingAction={isSubmittingAction}
              messages={hybrid.messages}
              onSubmitAction={handleActionSubmit}
              programIcon={session.cliProgram.icon}
              programName={session.cliProgram.name}
              sessionId={session.id}
            />
          </div>
          <ChatComposer
            cliProgramId={session.cliProgram.id}
            className="absolute inset-x-3 bottom-3 z-20"
            disabled={hybrid.status === 'error'}
            errorMessage={showRecoveryBanner ? hybrid.lastError : null}
            isBusy={isHandlingPrompt}
            onSuggestionMenuVisibilityChange={setIsCommandMenuOpen}
            onInterrupt={() => hybrid.interruptPrompt()}
            onSubmit={() => {
              if (!hybrid.sendPrompt(chatDraft)) {
                toast.error('Unable to send chat prompt');
                return;
              }
              setChatDraft('');
            }}
            onValueChange={setChatDraft}
            value={chatDraft}
          />
        </div>
      </main>
    </div>
  );
}
