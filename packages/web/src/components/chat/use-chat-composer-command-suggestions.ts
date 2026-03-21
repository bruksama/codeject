'use client';

import { useState } from 'react';
import {
  getProviderAwareCommandQueryResult,
  parseFirstToken,
  replaceFirstTokenWithProviderCommand,
} from '@/lib/provider-aware-command-query';

interface UseChatComposerCommandSuggestionsOptions {
  cliProgramId?: string | null;
  onValueChange: (value: string) => void;
  value: string;
}

export function useChatComposerCommandSuggestions({
  cliProgramId,
  onValueChange,
  value,
}: UseChatComposerCommandSuggestionsOptions) {
  const [dismissedCommandToken, setDismissedCommandToken] = useState<string | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const { token: firstToken } = parseFirstToken(value);
  const rawCommandQueryResult = getProviderAwareCommandQueryResult(cliProgramId, value);
  const commandQueryResult =
    rawCommandQueryResult && firstToken && dismissedCommandToken !== firstToken
      ? rawCommandQueryResult
      : null;
  const suggestions = commandQueryResult?.suggestions ?? [];
  const isCommandMenuOpen = suggestions.length > 0;
  const safeActiveSuggestionIndex = isCommandMenuOpen
    ? Math.min(activeSuggestionIndex, suggestions.length - 1)
    : 0;

  const handleValueChange = (nextValue: string) => {
    const { token: nextToken } = parseFirstToken(nextValue);
    if (!nextToken || (dismissedCommandToken && nextToken !== dismissedCommandToken)) {
      setDismissedCommandToken(null);
    }

    onValueChange(nextValue);
  };

  const acceptSuggestion = () => {
    const selectedCommand = suggestions[safeActiveSuggestionIndex];
    const providerPrefix = commandQueryResult?.providerPrefix;
    if (!selectedCommand || !providerPrefix) {
      return false;
    }

    const nextValue = replaceFirstTokenWithProviderCommand(
      value,
      providerPrefix,
      selectedCommand.id
    );
    setDismissedCommandToken(parseFirstToken(nextValue).token);
    onValueChange(nextValue);
    return true;
  };

  return {
    acceptSuggestion,
    commandQueryResult,
    handleCommandMenuEscape() {
      setActiveSuggestionIndex(0);
      setDismissedCommandToken(firstToken);
    },
    handleCommandMenuMoveDown() {
      setActiveSuggestionIndex((currentIndex) => (currentIndex + 1) % suggestions.length);
    },
    handleCommandMenuMoveUp() {
      setActiveSuggestionIndex(
        (currentIndex) => (currentIndex - 1 + suggestions.length) % suggestions.length
      );
    },
    handleSuggestionSelect(commandId: string) {
      if (!commandQueryResult) {
        return;
      }

      const nextValue = replaceFirstTokenWithProviderCommand(
        value,
        commandQueryResult.providerPrefix,
        commandId
      );
      setDismissedCommandToken(parseFirstToken(nextValue).token);
      onValueChange(nextValue);
    },
    handleValueChange,
    isCommandMenuOpen,
    safeActiveSuggestionIndex,
    suggestions,
  };
}
