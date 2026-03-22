'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  type ChatState,
  type ConnectionStatus,
  type Message,
  type SurfaceRequirement,
} from '@/types';
import { getWebSocketUrl } from '@/lib/api-client';
import { WebSocketClient } from '@/lib/websocket-client';
import { useAppStore } from '@/stores/useAppStore';
import {
  buildInterruptedChatState,
  buildOptimisticPromptState,
  mergeOptimisticMessages,
  normalizeChatState,
  normalizeMessage,
  normalizeTerminalRuntime,
  type OptimisticPromptState,
  reconcileSubmittingActionId,
} from './use-hybrid-session-helpers';
const EMPTY_MESSAGES: Message[] = [];
interface HybridState {
  chatState?: ChatState;
  hasConnected: boolean;
  lastError: string | null;
  lastDisconnectedAt: Date | null;
  lastReconnectedAt: Date | null;
  optimisticPrompt?: OptimisticPromptState;
  submittingActionId: string | null;
  status: ConnectionStatus;
  surfaceRequirement: SurfaceRequirement;
  reconnectAttempts: number;
}

export function useHybridSession(sessionId: string | undefined) {
  const [state, setState] = useState<HybridState>({
    lastError: null,
    hasConnected: false,
    lastDisconnectedAt: null,
    lastReconnectedAt: null,
    reconnectAttempts: 0,
    submittingActionId: null,
    status: 'idle',
    surfaceRequirement: 'terminal-available',
  });
  const clientRef = useRef<WebSocketClient | null>(null);
  const updateSession = useAppStore((store) => store.updateSession);
  const addMessage = useAppStore((store) => store.addMessage);
  const updateMessage = useAppStore((store) => store.updateMessage);
  const sessionMessages = useAppStore(
    (store) =>
      store.sessions.find((session) => session.id === sessionId)?.messages ?? EMPTY_MESSAGES
  );
  const handleStatus = useEffectEvent((status: ConnectionStatus) => {
    if (!sessionId) return;
    setState((current) => ({
      ...current,
      hasConnected: current.hasConnected || status === 'connected',
      lastDisconnectedAt:
        status === 'connected' || status === 'idle'
          ? null
          : status === 'disconnected' && current.hasConnected
            ? (current.lastDisconnectedAt ?? new Date())
            : current.lastDisconnectedAt,
      lastError: status === 'connected' || status === 'idle' ? null : current.lastError,
      lastReconnectedAt:
        status === 'connected' && current.lastDisconnectedAt
          ? new Date()
          : current.lastReconnectedAt,
      reconnectAttempts:
        status === 'connected' || status === 'idle' ? 0 : current.reconnectAttempts,
      status,
      submittingActionId: status === 'connected' ? current.submittingActionId : null,
    }));
    updateSession(sessionId, { status });
  });

  useEffect(() => {
    if (!sessionId) return;

    const client = new WebSocketClient(() => getWebSocketUrl(sessionId), {
      onError: (message, kind) => {
        if (kind === 'transport') {
          return;
        }

        setState((current) => ({
          ...current,
          lastDisconnectedAt: current.hasConnected
            ? (current.lastDisconnectedAt ?? new Date())
            : current.lastDisconnectedAt,
          lastError: message,
          lastReconnectedAt: null,
          status: 'error',
          submittingActionId: null,
        }));
        updateSession(sessionId, { status: 'error' });
      },
      onMessage: (message) => {
        switch (message.type) {
          case 'chat:bootstrap': {
            const nextChatState = normalizeChatState(message.chatState);
            setState((current) => ({
              ...current,
              chatState: nextChatState,
              submittingActionId: reconcileSubmittingActionId(
                current.submittingActionId,
                nextChatState,
                current.surfaceRequirement,
                current.status
              ),
            }));
            updateSession(sessionId, {
              chatState: nextChatState,
              messages: message.messages.map(normalizeMessage),
            });
            return;
          }
          case 'chat:message':
            setState((current) => {
              const optimisticPrompt = current.optimisticPrompt;
              if (!optimisticPrompt) {
                return current;
              }

              const acknowledgedUser =
                optimisticPrompt.acknowledgedUser ||
                (message.message.role === 'user' &&
                  message.message.content.trim() === optimisticPrompt.prompt);
              const acknowledgedAssistant =
                optimisticPrompt.acknowledgedAssistant ||
                (message.message.role === 'assistant' &&
                  message.message.isStreaming === true &&
                  !message.message.content.trim());

              if (acknowledgedUser && acknowledgedAssistant) {
                return { ...current, optimisticPrompt: undefined };
              }

              return {
                ...current,
                optimisticPrompt: {
                  ...optimisticPrompt,
                  acknowledgedAssistant,
                  acknowledgedUser,
                },
              };
            });
            addMessage(sessionId, normalizeMessage(message.message));
            return;
          case 'chat:update':
            setState((current) => {
              if (!current.optimisticPrompt || !message.content.trim()) {
                return current;
              }

              return { ...current, optimisticPrompt: undefined };
            });
            updateMessage(sessionId, message.messageId, {
              content: message.content,
              isStreaming: message.isStreaming,
            });
            return;
          case 'surface:update': {
            const nextChatState = normalizeChatState(message.chatState);
            setState((current) => ({
              ...current,
              chatState: nextChatState,
              submittingActionId: reconcileSubmittingActionId(
                current.submittingActionId,
                nextChatState,
                message.requirement,
                current.status
              ),
              surfaceRequirement: message.requirement,
            }));
            updateSession(sessionId, {
              chatState: nextChatState,
              surfaceRequirement: message.requirement,
            });
            return;
          }
          case 'terminal:ready': {
            const nextChatState = normalizeChatState(message.chatState);
            handleStatus(message.status);
            setState((current) => ({
              ...current,
              chatState: nextChatState,
              submittingActionId: reconcileSubmittingActionId(
                current.submittingActionId,
                nextChatState,
                message.surfaceRequirement,
                message.status
              ),
              surfaceRequirement: message.surfaceRequirement,
            }));
            updateSession(sessionId, {
              chatState: nextChatState,
              surfaceRequirement: message.surfaceRequirement,
              terminal: normalizeTerminalRuntime(message.terminal),
            });
            return;
          }
          default:
            return;
        }
      },
      onReconnectAttempt: (attempt) => {
        setState((current) => ({
          ...current,
          reconnectAttempts: attempt,
        }));
      },
      onStatus: handleStatus,
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [addMessage, sessionId, updateMessage, updateSession]);

  return {
    chatState: state.chatState,
    disconnect() {
      clientRef.current?.disconnect();
    },
    hasConnected: state.hasConnected,
    interruptPrompt() {
      if (!sessionId) return;
      const timestamp = new Date();
      const nextChatState = buildInterruptedChatState(
        state.chatState,
        state.surfaceRequirement,
        timestamp
      );
      setState((current) => ({
        ...current,
        chatState: nextChatState,
        optimisticPrompt: undefined,
      }));
      updateSession(sessionId, { chatState: nextChatState });
      clientRef.current?.send({ key: 'Escape', type: 'terminal:key' });
      window.setTimeout(() => {
        clientRef.current?.send({ key: 'Escape', type: 'terminal:key' });
      }, 90);
    },
    lastError: state.lastError,
    lastDisconnectedAt: state.lastDisconnectedAt,
    lastReconnectedAt: state.lastReconnectedAt,
    messages: mergeOptimisticMessages(sessionMessages, state.optimisticPrompt),
    reconnect() {
      setState((current) => ({
        ...current,
        lastError: null,
        lastReconnectedAt: null,
        reconnectAttempts: 0,
        submittingActionId: null,
      }));
      clientRef.current?.reconnect();
    },
    reconnectAttempts: state.reconnectAttempts,
    sendPrompt(content: string) {
      const trimmed = content.trim();
      if (!trimmed) return false;

      const timestamp = new Date();
      const optimisticState = buildOptimisticPromptState(state.chatState, trimmed, timestamp);
      setState((current) => ({
        ...current,
        chatState: optimisticState.chatState,
        optimisticPrompt: optimisticState.optimisticPrompt,
        surfaceRequirement: 'terminal-available',
      }));
      clientRef.current?.send({ content: trimmed, type: 'chat:prompt' });
      return true;
    },
    status: state.status,
    submitActionInput(actionId: string, data: string) {
      if (state.status !== 'connected') return false;
      if (!state.chatState?.actionRequest || state.chatState.actionRequest.id !== actionId) {
        return false;
      }
      if (data.length > 0) {
        clientRef.current?.send({ data, type: 'terminal:input' });
      }
      clientRef.current?.send({ key: 'Enter', type: 'terminal:key' });
      setState((current) => ({
        ...current,
        lastError: null,
        submittingActionId: actionId,
      }));
      return true;
    },
    submittingActionId: state.submittingActionId,
    surfaceRequirement: state.surfaceRequirement,
  };
}
