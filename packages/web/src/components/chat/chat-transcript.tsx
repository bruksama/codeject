'use client';

import { ChatActionCard } from '@/components/chat/chat-action-card';
import ChatMessage from '@/components/chat/ChatMessage';
import StreamingIndicator from '@/components/ui/StreamingIndicator';
import { type ChatState, type Message } from '@/types';

interface ChatTranscriptProps {
  chatState?: ChatState;
  isSubmittingAction?: boolean;
  messages: Message[];
  onOpenTerminal?: () => void;
  onSubmitAction?: (submit: string) => void;
  programIcon?: string;
  programName?: string;
}

const SUGGESTED_PROMPTS = [
  'Summarize what changed in this repo',
  'Find the next failing type or build issue',
  'Explain the current architecture',
  'Plan the next implementation step',
];

export function ChatTranscript({
  chatState,
  isSubmittingAction = false,
  messages,
  onOpenTerminal,
  onSubmitAction,
  programIcon = '🤖',
  programName = 'CLI',
}: ChatTranscriptProps) {
  const visibleMessages = messages.filter(
    (message) => !(message.role === 'assistant' && message.isStreaming)
  );
  const hasMessages = visibleMessages.length > 0;
  const showStreamingIndicator =
    chatState?.phase === 'awaiting-assistant' || chatState?.phase === 'streaming-assistant';

  if (!hasMessages) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl">
          {programIcon}
        </div>
        <h2 className="text-base font-semibold text-white/90">{programName} is ready</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
          Chat is the default surface. Open Terminal any time for approvals, menus, or raw TUI
          recovery.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <span
              key={prompt}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/45"
            >
              {prompt}
            </span>
          ))}
        </div>
        {showStreamingIndicator ? (
          <div className="mt-8 w-full max-w-sm">
            <StreamingIndicator programIcon={programIcon} programName={programName} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-1 pb-2 pt-1">
      {visibleMessages.map((message) => (
        <ChatMessage key={message.id} message={message} programIcon={programIcon} />
      ))}
      {chatState?.actionRequest && onOpenTerminal && onSubmitAction ? (
        <ChatActionCard
          actionRequest={chatState.actionRequest}
          isSubmitting={isSubmittingAction}
          onOpenTerminal={onOpenTerminal}
          onSubmit={onSubmitAction}
        />
      ) : null}
      {showStreamingIndicator ? (
        <StreamingIndicator programIcon={programIcon} programName={programName} />
      ) : null}
    </div>
  );
}
