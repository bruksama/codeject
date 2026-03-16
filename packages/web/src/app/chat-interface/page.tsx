'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCcw, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';
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
      className="flex h-dvh overflow-hidden flex-col bg-[#08080f] px-3 pb-4"
      style={{ paddingTop: 'env(safe-area-inset-top, 44px)' }}
    >
      <header className="mb-3 flex items-center gap-3 py-3">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/70"
          onClick={() => router.push('/sessions-list')}
          type="button"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base">{session.cliProgram.icon}</span>
            <span className="truncate text-sm font-semibold text-white/90">{session.name}</span>
            <ConnectionBadge showLabel size="sm" status={hybrid.status} />
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-white/35">
            {session.workspacePath}
          </p>
        </div>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/70"
          onClick={() => {
            hybrid.reconnect();
            toast.success(`Reconnecting ${session.cliProgram.name}`);
          }}
          type="button"
        >
          <RefreshCcw size={17} />
        </button>
      </header>

      <div className="mb-3 flex items-center justify-between gap-3">
        <HybridSurfaceToggle activeMode={hybrid.surfaceMode} onModeChange={hybrid.openSurface} />
        <div className="truncate rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/45">
          {session.terminal?.sessionName ? `tmux:${session.terminal.sessionName}` : 'tmux starting'}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
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
            <div className="glass-card min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <ChatTranscript
                chatState={hybrid.chatState}
                isSubmittingAction={isSubmittingAction}
                messages={hybrid.messages}
                onOpenTerminal={() => hybrid.openSurface('terminal')}
                onSubmitAction={handleActionSubmit}
                programIcon={session.cliProgram.icon}
                programName={session.cliProgram.name}
              />
            </div>
            <div className="glass-card rounded-[24px] border border-white/10 p-3">
              <div className="flex items-end gap-3">
                <textarea
                  className="auto-grow-textarea input-focus min-h-[48px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 placeholder:text-white/25"
                  onChange={(event) => setChatDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                  placeholder="Message your CLI session"
                  value={chatDraft}
                />
                <button
                  className="accent-gradient flex h-11 w-11 items-center justify-center rounded-2xl text-white active:scale-[0.98]"
                  onClick={handleChatSubmit}
                  type="button"
                >
                  <SendHorizontal size={17} />
                </button>
              </div>
              {hybrid.lastError ? (
                <p className="px-1 pt-2 text-xs text-red-400/85">{hybrid.lastError}</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
