'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  type ChatState,
  type ChatStatePhase,
  type ConnectionStatus,
  type Message,
  type SurfaceRequirement,
} from '@/types';
import { getWebSocketUrl } from '@/lib/api-client';
import { WebSocketClient } from '@/lib/websocket-client';
import { useAppStore } from '@/stores/useAppStore';
import {
  mergeOptimisticMessages,
  normalizeChatState,
  normalizeMessage,
  normalizeTerminalRuntime,
  reconcileSubmittingActionId,
} from './use-hybrid-session-helpers';

const EMPTY_MESSAGES: Message[] = [];

interface HybridState {
  chatState?: ChatState;
  lastError: string | null;
  optimisticPrompt?: {
    acknowledgedAssistant: boolean;
    acknowledgedUser: boolean;
    assistantMessage: Message;
    prompt: string;
    userMessage: Message;
  };
  submittingActionId: string | null;
  status: ConnectionStatus;
  surfaceRequirement: SurfaceRequirement;
}

export function useHybridSession(sessionId: string | undefined) {
  const [state, setState] = useState<HybridState>({
    lastError: null,
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
      lastError: status === 'connected' || status === 'idle' ? null : current.lastError,
      status,
      submittingActionId: status === 'connected' ? current.submittingActionId : null,
    }));
    updateSession(sessionId, { status });
  });

  useEffect(() => {
    if (!sessionId) return;

    const client = new WebSocketClient(() => getWebSocketUrl(sessionId), {
      onError: (message) => {
        setState((current) => ({
          ...current,
          lastError: message,
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
    interruptPrompt() {
      if (!sessionId) return;
      const timestamp = new Date();
      const nextPhase: ChatStatePhase =
        state.surfaceRequirement === 'terminal-required' ? 'terminal-required' : 'idle';
      const nextChatState = state.chatState
        ? {
            ...state.chatState,
            actionRequest: undefined,
            lastAssistantMessageId: undefined,
            phase: nextPhase,
            terminalRequiredReason: undefined,
            transcriptUpdatedAt: timestamp,
          }
        : undefined;

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
    messages: mergeOptimisticMessages(sessionMessages, state.optimisticPrompt),
    reconnect() {
      setState((current) => ({
        ...current,
        lastError: null,
        submittingActionId: null,
      }));
      clientRef.current?.reconnect();
    },
    sendPrompt(content: string) {
      const trimmed = content.trim();
      if (!trimmed) return false;

      const timestamp = new Date();
      const promptKey = `${timestamp.getTime()}`;
      setState((current) => ({
        ...current,
        chatState: {
          ...current.chatState,
          actionRequest: undefined,
          lastAssistantMessageId: undefined,
          lastPrompt: trimmed,
          phase: 'awaiting-assistant',
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
            role: 'assistant',
            timestamp,
          },
          prompt: trimmed,
          userMessage: {
            content: trimmed,
            id: `optimistic-user-${promptKey}`,
            role: 'user',
            timestamp,
          },
        },
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
