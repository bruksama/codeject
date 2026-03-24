'use client';

import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatTranscript } from '@/components/chat/chat-transcript';
import type { ChatState, Message } from '@/types';

interface ChatSessionPaneProps {
  chatState?: ChatState;
  cliProgramId: string;
  composerClearance: string;
  disabled?: boolean;
  errorMessage?: string | null;
  isBusy?: boolean;
  isVisible?: boolean;
  isSubmittingAction?: boolean;
  messages: Message[];
  onInterrupt: () => void;
  onSubmitAction: (submit: string) => boolean | Promise<boolean>;
  onSubmitPrompt: () => void;
  onSuggestionMenuVisibilityChange: (isOpen: boolean) => void;
  onValueChange: (value: string) => void;
  programIcon: string;
  programName: string;
  sessionId: string;
  value: string;
}

export function ChatSessionPane({
  chatState,
  cliProgramId,
  composerClearance,
  disabled = false,
  errorMessage = null,
  isBusy = false,
  isVisible = true,
  isSubmittingAction = false,
  messages,
  onInterrupt,
  onSubmitAction,
  onSubmitPrompt,
  onSuggestionMenuVisibilityChange,
  onValueChange,
  programIcon,
  programName,
  sessionId,
  value,
}: ChatSessionPaneProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 px-3 pt-3">
        <ChatTranscript
          chatState={chatState}
          composerClearance={composerClearance}
          isSubmittingAction={isSubmittingAction}
          messages={messages}
          onSubmitAction={onSubmitAction}
          programIcon={programIcon}
          programName={programName}
          sessionId={sessionId}
        />
      </div>
      <div
        className="shrink-0 border-t border-white/6 px-3 pt-2"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <ChatComposer
          cliProgramId={cliProgramId}
          className="z-20"
          disabled={disabled}
          errorMessage={errorMessage}
          isVisible={isVisible}
          isBusy={isBusy}
          onSuggestionMenuVisibilityChange={onSuggestionMenuVisibilityChange}
          onInterrupt={onInterrupt}
          onSubmit={onSubmitPrompt}
          onValueChange={onValueChange}
          value={value}
        />
      </div>
    </div>
  );
}
