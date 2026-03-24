'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal, Square } from 'lucide-react';
import { ChatComposerCommandSuggestionMenu } from '@/components/chat/chat-composer-command-suggestion-menu';
import { useChatComposerCommandSuggestions } from '@/components/chat/use-chat-composer-command-suggestions';

interface ChatComposerProps {
  cliProgramId?: string | null;
  className?: string;
  disabled?: boolean;
  errorMessage?: string | null;
  isVisible?: boolean;
  isBusy?: boolean;
  onSuggestionMenuVisibilityChange?: (isOpen: boolean) => void;
  onInterrupt?: () => void;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
  value: string;
}

const IDLE_HEIGHT = 40;
const EXPANDED_HEIGHT = 112;

export function ChatComposer({
  cliProgramId,
  className = '',
  disabled = false,
  errorMessage,
  isVisible = true,
  isBusy = false,
  onSuggestionMenuVisibilityChange,
  onInterrupt,
  onSubmit,
  onValueChange,
  value,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersTouchInput, setPrefersTouchInput] = useState(false);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = '0px';
    const nextHeight = Math.min(
      Math.max(element.scrollHeight, IDLE_HEIGHT),
      isFocused ? EXPANDED_HEIGHT : IDLE_HEIGHT
    );
    element.style.height = `${nextHeight}px`;
  }, [isFocused, value]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const updatePreference = () => setPrefersTouchInput(mediaQuery.matches);
    updatePreference();

    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  const {
    acceptSuggestion,
    commandQueryResult,
    handleCommandMenuEscape,
    handleCommandMenuMoveDown,
    handleCommandMenuMoveUp,
    handleSuggestionSelect,
    handleValueChange,
    isCommandMenuOpen,
    safeActiveSuggestionIndex,
    suggestions,
  } = useChatComposerCommandSuggestions({
    cliProgramId,
    onValueChange,
    value,
  });
  const canSubmit = !disabled && value.trim().length > 0;
  const isExpanded = isFocused || value.includes('\n');
  const canInterrupt = !disabled && isBusy && Boolean(onInterrupt);

  useEffect(() => {
    onSuggestionMenuVisibilityChange?.(isCommandMenuOpen);
  }, [isCommandMenuOpen, onSuggestionMenuVisibilityChange]);

  useEffect(() => {
    if (!isVisible || !isCommandMenuOpen) {
      return;
    }

    handleCommandMenuEscape();
  }, [handleCommandMenuEscape, isCommandMenuOpen, isVisible]);

  return (
    <div className={className}>
      {commandQueryResult ? (
        <ChatComposerCommandSuggestionMenu
          activeIndex={safeActiveSuggestionIndex}
          onSelect={handleSuggestionSelect}
          providerPrefix={commandQueryResult.providerPrefix}
          suggestions={suggestions}
        />
      ) : null}
      <div
        className="isolate flex items-end gap-2 overflow-hidden rounded-[20px] px-2.5 py-2 transition-all duration-200 shadow-[0_16px_36px_rgba(0,0,0,0.26)]"
        style={{
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          transform: 'translateZ(0)',
          willChange: 'transform',
          contain: 'paint',
          background: isExpanded
            ? 'linear-gradient(180deg, rgba(255,255,255,0.12), color-mix(in srgb, var(--accent-primary) 16%, rgba(10,10,18,0.92)))'
            : 'linear-gradient(180deg, rgba(255,255,255,0.1), color-mix(in srgb, var(--accent-primary) 14%, rgba(10,10,18,0.9)))',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.08), 0 16px 36px rgba(0,0,0,0.26)',
        }}
      >
        <textarea
          aria-label="Message your CLI session"
          aria-invalid={Boolean(errorMessage)}
          ref={textareaRef}
          className="auto-grow-textarea w-full flex-1 bg-transparent px-1.5 py-1 text-[0.95rem] leading-6 text-white/92 placeholder:text-white/25 focus:outline-none"
          disabled={disabled}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => handleValueChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(event) => {
            const isComposing = 'isComposing' in event.nativeEvent && event.nativeEvent.isComposing;

            if (isCommandMenuOpen) {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                handleCommandMenuMoveDown();
                return;
              }

              if (event.key === 'ArrowUp') {
                event.preventDefault();
                handleCommandMenuMoveUp();
                return;
              }

              if (
                event.key === 'Tab' ||
                (event.key === 'Enter' && !event.shiftKey && !isComposing)
              ) {
                event.preventDefault();
                acceptSuggestion();
                return;
              }

              if (event.key === 'Escape') {
                event.preventDefault();
                handleCommandMenuEscape();
                return;
              }
            }

            if (prefersTouchInput) {
              return;
            }

            if (isBusy) {
              return;
            }

            if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
              event.preventDefault();
              if (canSubmit) {
                onSubmit();
              }
            }
          }}
          placeholder="Message your CLI session"
          rows={1}
          value={value}
        />
        <button
          aria-label={canInterrupt ? 'Interrupt prompt' : 'Send message'}
          className={`interactive-focus-ring mobile-touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition-all duration-200 active:scale-[0.98] ${
            canInterrupt || canSubmit ? 'opacity-100' : 'pointer-events-none opacity-45'
          } ${isExpanded ? 'h-11 w-11' : ''}`}
          onClick={canInterrupt ? onInterrupt : onSubmit}
          style={
            canInterrupt
              ? {
                  background:
                    'linear-gradient(135deg, rgba(239,68,68,0.92), color-mix(in srgb, var(--accent-primary) 22%, rgba(239,68,68,0.76)))',
                }
              : {
                  background:
                    'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                }
          }
          type="button"
        >
          {canInterrupt ? (
            <Square fill="currentColor" size={14} strokeWidth={2.2} />
          ) : (
            <SendHorizontal size={17} />
          )}
        </button>
      </div>
      <div className="field-support-text px-1 pt-2">
        {errorMessage ? <p className="text-xs text-red-400/85">{errorMessage}</p> : null}
      </div>
    </div>
  );
}
