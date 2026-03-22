'use client';

import {
  type ChatState,
  type ConnectionStatus,
  type Message,
  type SurfaceRequirement,
  type TerminalRuntime,
} from '@/types';

export interface OptimisticPromptState {
  acknowledgedAssistant: boolean;
  acknowledgedUser: boolean;
  assistantMessage: Message;
  prompt: string;
  userMessage: Message;
}

export function mergeOptimisticMessages(
  sessionMessages: Message[],
  optimisticPrompt: OptimisticPromptState | undefined
) {
  if (!optimisticPrompt) {
    return sessionMessages;
  }

  const merged = [...sessionMessages];
  if (!optimisticPrompt.acknowledgedUser) {
    merged.push(optimisticPrompt.userMessage);
  }
  if (!optimisticPrompt.acknowledgedAssistant) {
    merged.push(optimisticPrompt.assistantMessage);
  }
  return merged;
}

export function normalizeMessage(message: Message) {
  return { ...message, timestamp: new Date(message.timestamp) };
}

export function normalizeChatState(chatState: ChatState | undefined) {
  return chatState
    ? {
        ...chatState,
        transcriptUpdatedAt: chatState.transcriptUpdatedAt
          ? new Date(chatState.transcriptUpdatedAt)
          : undefined,
      }
    : undefined;
}

export function normalizeTerminalRuntime(terminal: TerminalRuntime | undefined) {
  return terminal
    ? {
        ...terminal,
        lastSnapshotAt: terminal.lastSnapshotAt ? new Date(terminal.lastSnapshotAt) : undefined,
      }
    : undefined;
}

export function reconcileSubmittingActionId(
  currentActionId: string | null,
  nextChatState: ChatState | undefined,
  nextRequirement: SurfaceRequirement,
  nextStatus: ConnectionStatus
) {
  if (!currentActionId || nextStatus !== 'connected') {
    return null;
  }

  return nextRequirement === 'terminal-required' &&
    nextChatState?.actionRequest?.id === currentActionId
    ? currentActionId
    : null;
}

export function buildInterruptedChatState(
  chatState: ChatState | undefined,
  surfaceRequirement: SurfaceRequirement,
  timestamp: Date
): ChatState | undefined {
  if (!chatState) {
    return undefined;
  }

  return {
    ...chatState,
    actionRequest: undefined,
    lastAssistantMessageId: undefined,
    phase:
      surfaceRequirement === 'terminal-required'
        ? ('terminal-required' as const)
        : ('idle' as const),
    terminalRequiredReason: undefined,
    transcriptUpdatedAt: timestamp,
  };
}

export function buildOptimisticPromptState(
  chatState: ChatState | undefined,
  prompt: string,
  timestamp: Date
) {
  const promptKey = `${timestamp.getTime()}`;

  return {
    chatState: {
      ...chatState,
      actionRequest: undefined,
      lastAssistantMessageId: undefined,
      lastPrompt: prompt,
      phase: 'awaiting-assistant' as const,
      terminalRequiredReason: undefined,
      transcriptUpdatedAt: timestamp,
    },
    optimisticPrompt: {
      acknowledgedAssistant: false,
      acknowledgedUser: false,
      assistantMessage: {
        content: '',
        id: `optimistic-assistant-${promptKey}`,
        isStreaming: true,
        role: 'assistant' as const,
        timestamp,
      },
      prompt,
      userMessage: {
        content: prompt,
        id: `optimistic-user-${promptKey}`,
        role: 'user' as const,
        timestamp,
      },
    } satisfies OptimisticPromptState,
  };
}
