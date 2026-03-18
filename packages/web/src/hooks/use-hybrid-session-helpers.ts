'use client';

import {
  type ChatState,
  type ConnectionStatus,
  type Message,
  type SurfaceRequirement,
  type TerminalRuntime,
} from '@/types';

export function mergeOptimisticMessages(
  sessionMessages: Message[],
  optimisticPrompt:
    | {
        acknowledgedAssistant: boolean;
        acknowledgedUser: boolean;
        assistantMessage: Message;
        userMessage: Message;
      }
    | undefined
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
