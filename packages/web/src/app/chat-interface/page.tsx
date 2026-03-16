'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatTranscript } from '@/components/chat/chat-transcript';
import { HybridSurfaceToggle } from '@/components/chat/hybrid-surface-toggle';
import { TerminalRequiredBanner } from '@/components/chat/terminal-required-banner';
import { TerminalInputBar } from '@/components/terminal/terminal-input-bar';
import { TerminalKeyStrip } from '@/components/terminal/terminal-key-strip';
import { TerminalViewport } from '@/components/terminal/terminal-viewport';
import ConnectionBadge from '@/components/ui/ConnectionBadge';
import { useHybridSession } from '@/hooks/use-hybrid-session';
import { useSessionApi } from '@/hooks/use-session-api';
import { useAppStore } from '@/stores/useAppStore';

export default function ChatInterfacePage() {
  const router = useRouter();
  const sessionApi = useSessionApi();
  const { sessions, activeSessionId } = useAppStore();
  const session = sessions.find((item) => item.id === activeSessionId) ?? sessions[0];
  const [chatDraft, setChatDraft] = useState('');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [terminalDraft, setTerminalDraft] = useState('');
  const [terminalSize, setTerminalSize] = useState({ cols: 120, rows: 32 });
  const hybrid = useHybridSession(session?.id, terminalSize);

  useEffect(() => {
    if (session?.id) {
      void sessionApi.loadSession(session.id).catch(() => undefined);
      return;
    }
    void sessionApi.loadSessions().catch(() => undefined);
  }, [session?.id, sessionApi]);

  const handleViewportSize = useCallback((size: { cols: number; rows: number }) => {
    setTerminalSize((current) =>
      current.cols === size.cols && current.rows === size.rows ? current : size
    );
  }, []);

  const handleChatSubmit = useCallback(() => {
    if (!hybrid.sendPrompt(chatDraft)) {
      toast.error('Unable to send chat prompt');
      return;
    }
    setChatDraft('');
  }, [chatDraft, hybrid]);

  const handleTerminalSubmit = useCallback(
    (value: string) => {
      if (!hybrid.sendTerminalInput(value)) {
        toast.error('Terminal input is unavailable');
        return;
      }
      hybrid.sendTerminalKey('Enter');
      setTerminalDraft('');
    },
    [hybrid]
  );

  const handleActionSubmit = useCallback(
    (submit: string) => {
      const actionRequest = hybrid.chatState?.actionRequest;
      if (!actionRequest) return;
      if (!hybrid.submitActionInput(submit)) {
        toast.error('Terminal input is unavailable');
        return;
      }
      setPendingActionId(actionRequest.id);
    },
    [hybrid]
  );

  if (!session) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#08080f] px-6 text-center">
        <p className="text-sm text-white/50">No session selected</p>
        <button
          className="accent-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          onClick={() => router.push('/sessions-list')}
          type="button"
        >
          Go to Sessions
        </button>
      </div>
    );
  }

  const showTerminalRequired = hybrid.surfaceRequirement === 'terminal-required';
  const showTerminal = hybrid.surfaceMode === 'terminal';
  const isSubmittingAction =
    Boolean(pendingActionId) && pendingActionId === hybrid.chatState?.actionRequest?.id;

  return (
    <div
      className="flex h-dvh overflow-hidden flex-col bg-[#08080f] px-2.5 pb-3"
      style={{ paddingTop: 'env(safe-area-inset-top, 44px)' }}
    >
      <header className="mb-2 flex items-center gap-2.5 py-2">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/70"
          onClick={() => router.push('/sessions-list')}
          type="button"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{session.cliProgram.icon}</span>
            <span className="truncate text-[13px] font-semibold text-white/90">{session.name}</span>
            <ConnectionBadge showLabel size="sm" status={hybrid.status} />
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] text-white/32">
            {session.workspacePath}
          </p>
        </div>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/70"
          onClick={() => {
            hybrid.reconnect();
            toast.success(`Reconnecting ${session.cliProgram.name}`);
          }}
          type="button"
        >
          <RefreshCcw size={16} />
        </button>
      </header>

      <div className="mb-2 flex items-center justify-between gap-2">
        <HybridSurfaceToggle activeMode={hybrid.surfaceMode} onModeChange={hybrid.openSurface} />
        <div className="truncate rounded-2xl border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/42">
          {session.terminal?.sessionName ? `tmux:${session.terminal.sessionName}` : 'tmux starting'}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        {showTerminalRequired ? (
          <TerminalRequiredBanner
            onOpenTerminal={() => hybrid.openSurface('terminal')}
            reason={hybrid.chatState?.terminalRequiredReason}
          />
        ) : null}

        {showTerminal ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-0 flex-1">
              <TerminalViewport
                onSizeChange={handleViewportSize}
                snapshot={hybrid.snapshot}
                status={hybrid.status}
              />
            </div>
            <TerminalKeyStrip onKeyPress={hybrid.sendTerminalKey} />
            <TerminalInputBar
              disabled={hybrid.status === 'error'}
              onBackspace={() => hybrid.sendTerminalKey('Backspace')}
              onEnter={() => hybrid.sendTerminalKey('Enter')}
              onSubmit={handleTerminalSubmit}
              onValueChange={setTerminalDraft}
              value={terminalDraft}
            />
          </div>
        ) : (
          <>
            <div className="glass-card min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
              <ChatTranscript
                chatState={hybrid.chatState}
                isSubmittingAction={isSubmittingAction}
                messages={hybrid.messages}
                onOpenTerminal={() => hybrid.openSurface('terminal')}
                onSubmitAction={handleActionSubmit}
                programIcon={session.cliProgram.icon}
                programName={session.cliProgram.name}
                sessionId={session.id}
              />
            </div>
            <ChatComposer
              disabled={hybrid.status === 'error'}
              errorMessage={hybrid.lastError}
              onSubmit={handleChatSubmit}
              onValueChange={setChatDraft}
              value={chatDraft}
            />
          </>
        )}
      </div>
    </div>
  );
}
