import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { useChatComposerCommandSuggestions } from '@/components/chat/use-chat-composer-command-suggestions';

function useSuggestionHarness(cliProgramId: string | null, initialValue = '') {
  const [value, setValue] = useState(initialValue);
  const suggestions = useChatComposerCommandSuggestions({
    cliProgramId,
    onValueChange: setValue,
    value,
  });

  return { ...suggestions, value };
}

describe('useChatComposerCommandSuggestions', () => {
  it('opens suggestions for Claude sessions when the first token starts with slash', () => {
    const { result } = renderHook(() => useSuggestionHarness('claude-code', '/'));

    expect(result.current.isCommandMenuOpen).toBe(true);
    expect(result.current.suggestions.length).toBeGreaterThan(0);
  });

  it('does not open suggestions for unsupported providers', () => {
    const { result } = renderHook(() => useSuggestionHarness('opencode', '$'));

    expect(result.current.isCommandMenuOpen).toBe(false);
    expect(result.current.suggestions).toEqual([]);
  });

  it('replaces only the first token and preserves the trailing prompt text', () => {
    const { result } = renderHook(() =>
      useSuggestionHarness('claude-code', '/ck:pl build the missing tests')
    );

    act(() => {
      result.current.handleSuggestionSelect('ck:plan');
    });

    expect(result.current.value).toBe('/ck:plan build the missing tests');
  });

  it('hides suggestions after escape until the first token changes', () => {
    const { result } = renderHook(() => useSuggestionHarness('codex', '$'));

    act(() => {
      result.current.handleCommandMenuEscape();
    });

    expect(result.current.isCommandMenuOpen).toBe(false);

    act(() => {
      result.current.handleValueChange('$ck:h');
    });

    expect(result.current.isCommandMenuOpen).toBe(true);
    expect(result.current.suggestions.some((command) => command.id === 'ck:ck-help')).toBe(true);
  });
});
