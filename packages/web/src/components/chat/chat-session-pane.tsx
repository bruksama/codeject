'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatTranscript } from '@/components/chat/chat-transcript';
import type { ChatState, Message } from '@/types';

const DEFAULT_COMPOSER_CLEARANCE = '140px';
const FLOATING_COMPOSER_GAP_PX = 20;

interface ChatSessionPaneProps {
  chatState?: ChatState;
  cliProgramId: string;
  disabled?: boolean;
  errorMessage?: string | null;
  isBusy?: boolean;
  isVisible?: boolean;
  isSubmittingAction?: boolean;
  messages: Message[];
  onInterrupt: () => void;
  onSubmitAction: (submit: string) => boolean | Promise<boolean>;
  onSubmitPrompt: () => void;
  onValueChange: (value: string) => void;
  programIcon: string;
  programName: string;
  sessionId: string;
  value: string;
}

export function ChatSessionPane({
  chatState,
  cliProgramId,
  disabled = false,
  errorMessage = null,
  isBusy = false,
  isVisible = true,
  isSubmittingAction = false,
  messages,
  onInterrupt,
  onSubmitAction,
  onSubmitPrompt,
  onValueChange,
  programIcon,
  programName,
  sessionId,
  value,
}: ChatSessionPaneProps) {
  const composerOverlayRef = useRef<HTMLDivElement | null>(null);
  const [composerClearance, setComposerClearance] = useState(DEFAULT_COMPOSER_CLEARANCE);

  useEffect(() => {
    const element = composerOverlayRef.current;
    if (!element || !isVisible) {
      return;
    }

    const syncComposerClearance = () => {
      setComposerClearance(`${element.offsetHeight + FLOATING_COMPOSER_GAP_PX}px`);
    };

    syncComposerClearance();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => syncComposerClearance());
    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
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
        ref={composerOverlayRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="pointer-events-auto">
          <ChatComposer
            cliProgramId={cliProgramId}
            className="z-20"
            disabled={disabled}
            errorMessage={errorMessage}
            isVisible={isVisible}
            isBusy={isBusy}
            onInterrupt={onInterrupt}
            onSubmit={onSubmitPrompt}
            onValueChange={onValueChange}
            value={value}
          />
        </div>
      </div>
    </div>
  );
}
