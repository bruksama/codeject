'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatSessionErrorRecoveryBanner } from '@/components/chat/chat-session-error-recovery-banner';
import { ChatTranscript } from '@/components/chat/chat-transcript';
import { TerminalRequiredBanner } from '@/components/chat/terminal-required-banner';
import ConnectionBadge from '@/components/ui/ConnectionBadge';
import MobileActionButton from '@/components/ui/mobile-action-button';
import { MobileScreenHeader } from '@/components/ui/mobile-screen-header';
import ProgramIcon from '@/components/ui/program-icon';
import { useHybridSession } from '@/hooks/use-hybrid-session';
import { useSessionApi } from '@/hooks/use-session-api';
import { useAppStore } from '@/stores/useAppStore';
import { selectActiveSessionOrFirstSession } from '@/stores/use-app-store-selectors';

const CHAT_COMPOSER_CLEARANCE = 'calc(58px * var(--app-font-scale))';
const CHAT_COMPOSER_MENU_CLEARANCE = 'calc(350px * var(--app-font-scale))';

export default function ChatInterfacePage() {
  const router = useRouter();
  const sessionApi = useSessionApi();
  const session = useAppStore(selectActiveSessionOrFirstSession);
  const [chatDraft, setChatDraft] = useState('');
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const hybrid = useHybridSession(session?.id);

  useEffect(() => {
    if (session?.id) {
      void sessionApi.loadSession(session.id).catch(() => undefined);
      return;
    }

    void sessionApi.loadSessions().catch(() => undefined);
  }, [session?.id, sessionApi]);

  if (!session) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#08080f] px-6 text-center">
        <p className="text-base leading-7 text-white/50">No session selected</p>
        <button
          className="interactive-focus-ring accent-gradient rounded-xl px-5 py-3 text-sm font-semibold text-white"
          onClick={() => router.push('/sessions-list')}
          type="button"
        >
          Go to Sessions
        </button>
      </div>
    );
  }

  const reconnectSession = () => {
    hybrid.reconnect();
    toast.success(`Reconnecting ${session.cliProgram.name}`);
  };
  const showTerminalRequired = hybrid.surfaceRequirement === 'terminal-required';
  const showRecoveryBanner = hybrid.status === 'error' || Boolean(hybrid.lastError);
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
        onBack={() => router.push('/sessions-list')}
        rightActions={
          <MobileActionButton label="Reconnect session" onClick={reconnectSession} size="sm">
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
            onGoToSessions={() => router.push('/sessions-list')}
            onReconnect={reconnectSession}
          />
        ) : null}

        {showTerminalRequired ? (
          <TerminalRequiredBanner reason={hybrid.chatState?.terminalRequiredReason} />
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
            errorMessage={null}
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
