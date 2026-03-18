'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { ChatActionCard } from '@/components/chat/chat-action-card';
import ChatMessage from '@/components/chat/ChatMessage';
import ProgramIcon from '@/components/ui/program-icon';
import StreamingIndicator from '@/components/ui/StreamingIndicator';
import { type ChatState, type Message } from '@/types';

interface ChatTranscriptProps {
  chatState?: ChatState;
  isSubmittingAction?: boolean;
  messages: Message[];
  onSubmitAction?: (submit: string) => boolean | Promise<boolean>;
  programIcon?: string;
  programName?: string;
  sessionId?: string;
}

const SUGGESTED_PROMPTS = [
  'Summarize what changed in this repo',
  'Find the next failing type or build issue',
  'Explain the current architecture',
  'Plan the next implementation step',
];

const BOTTOM_THRESHOLD_PX = 96;
const COMPOSER_CLEARANCE_PX = 58;

export function ChatTranscript({
  chatState,
  isSubmittingAction = false,
  messages,
  onSubmitAction,
  programIcon = '/assets/program-icons/claude.png',
  programName = 'CLI',
  sessionId,
}: ChatTranscriptProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const shouldFollowRef = useRef(true);
  const previousSessionIdRef = useRef<string | undefined>(sessionId);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const visibleMessages = messages.filter(
    (message) => !(message.role === 'assistant' && !message.isStreaming && !message.content.trim())
  );
  const hasMessages = visibleMessages.length > 0;
  const hasInlineStreamingAssistant = visibleMessages.some(
    (message) => message.role === 'assistant' && message.isStreaming && !message.content.trim()
  );
  const showStreamingIndicator =
    chatState?.phase === 'awaiting-assistant' || chatState?.phase === 'streaming-assistant';
  const latestMessageId = visibleMessages.at(-1)?.id;
  const isNearBottom = useCallback((element: HTMLDivElement) => {
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    return distanceFromBottom <= BOTTOM_THRESHOLD_PX;
  }, []);

  const syncBottomState = useCallback(() => {
    const element = scrollContainerRef.current;
    if (!element) return;
    const nearBottom = isNearBottom(element);
    shouldFollowRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom);
  }, [isNearBottom]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior) => {
    const element = scrollContainerRef.current;
    if (!element) return;
    element.scrollTo({ behavior, top: element.scrollHeight });
    shouldFollowRef.current = true;
    setShowJumpToLatest(false);
  }, []);

  useEffect(() => {
    if (previousSessionIdRef.current === sessionId) return;
    previousSessionIdRef.current = sessionId;
    hasAutoScrolledRef.current = false;
    shouldFollowRef.current = true;
  }, [sessionId]);

  useEffect(() => {
    if (!visibleMessages.length) {
      hasAutoScrolledRef.current = false;
      shouldFollowRef.current = true;
      return;
    }

    const frameId = requestAnimationFrame(() => {
      if (!hasAutoScrolledRef.current) {
        hasAutoScrolledRef.current = true;
        scrollToLatest('auto');
        return;
      }

      if (shouldFollowRef.current) {
        scrollToLatest('auto');
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [latestMessageId, scrollToLatest, showStreamingIndicator, visibleMessages.length]);

  if (!hasMessages) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl">
          <ProgramIcon alt={programName} icon={programIcon} size={32} />
        </div>
        <h2 className="text-base font-semibold text-white/90">{programName} is ready</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
          Chat is the only surface now. Approvals, selections, and direct input show up as inline
          action cards when the CLI needs attention.
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
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        ref={scrollContainerRef}
        className="flex h-full flex-col gap-4 overflow-y-auto px-1 pt-1"
        style={{
          paddingBottom: `calc(${COMPOSER_CLEARANCE_PX}px + env(safe-area-inset-bottom, 0px))`,
        }}
        onScroll={syncBottomState}
      >
        {visibleMessages.map((message) =>
          message.role === 'assistant' && message.isStreaming && !message.content.trim() ? (
            <StreamingIndicator
              key={message.id}
              programIcon={programIcon}
              programName={programName}
            />
          ) : (
            <ChatMessage key={message.id} message={message} programIcon={programIcon} />
          )
        )}
        {chatState?.actionRequest && onSubmitAction ? (
          <ChatActionCard
            key={chatState.actionRequest.id}
            actionRequest={chatState.actionRequest}
            isSubmitting={isSubmittingAction}
            onSubmit={onSubmitAction}
          />
        ) : null}
        {showStreamingIndicator && !hasInlineStreamingAssistant ? (
          <StreamingIndicator programIcon={programIcon} programName={programName} />
        ) : null}
      </div>
      {showJumpToLatest ? (
        <button
          className="absolute bottom-[calc(74px+env(safe-area-inset-bottom,0px))] left-1/2 isolate flex h-11 min-w-11 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full px-3 text-white/95 shadow-[0_16px_36px_rgba(0,0,0,0.38)]"
          onClick={() => scrollToLatest('smooth')}
          style={{
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.16), color-mix(in srgb, var(--accent-primary) 24%, rgba(10,10,18,0.94)))',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 16px 36px rgba(0,0,0,0.38)',
          }}
          type="button"
        >
          <ArrowDown size={18} />
        </button>
      ) : null}
    </div>
  );
}
