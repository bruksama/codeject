'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  type ChatState,
  type ConnectionStatus,
  type Message,
  type SurfaceMode,
  type SurfaceRequirement,
  type TerminalKey,
  type TerminalRuntime,
  type TerminalSnapshot,
} from '@/types';
import { getWebSocketUrl } from '@/lib/api-client';
import { WebSocketClient } from '@/lib/websocket-client';
import { useAppStore } from '@/stores/useAppStore';

const EMPTY_SNAPSHOT: TerminalSnapshot = { cols: 120, content: '', rows: 32, seq: 0 };
const EMPTY_MESSAGES: Message[] = [];

interface HybridSize {
  cols: number;
  rows: number;
}

interface HybridState {
  chatState?: ChatState;
  lastError: string | null;
  sessionId?: string;
  snapshot: TerminalSnapshot;
  status: ConnectionStatus;
  surfaceMode: SurfaceMode;
  surfaceRequirement: SurfaceRequirement;
}

export function useHybridSession(sessionId: string | undefined, size: HybridSize) {
  const [state, setState] = useState<HybridState>({
    lastError: null,
    snapshot: EMPTY_SNAPSHOT,
    status: 'idle',
    surfaceMode: 'chat',
    surfaceRequirement: 'terminal-available',
  });
  const clientRef = useRef<WebSocketClient | null>(null);
  const sizeRef = useRef(size);
  const updateSession = useAppStore((store) => store.updateSession);
  const addMessage = useAppStore((store) => store.addMessage);
  const updateMessage = useAppStore((store) => store.updateMessage);
  const sessionMessages = useAppStore(
    (store) =>
      store.sessions.find((session) => session.id === sessionId)?.messages ?? EMPTY_MESSAGES
  );

  const handleStatus = useEffectEvent((status: ConnectionStatus) => {
    if (!sessionId) return;
    setState((current) => ({ ...current, sessionId, status }));
    updateSession(sessionId, { status });
  });

  useEffect(() => {
    if (!sessionId) return;

    const client = new WebSocketClient(getWebSocketUrl(sessionId), {
      onError: (message) => {
        setState((current) => ({ ...current, lastError: message, sessionId, status: 'error' }));
        updateSession(sessionId, { status: 'error' });
      },
      onMessage: (message) => {
        switch (message.type) {
          case 'chat:bootstrap':
            updateSession(sessionId, {
              chatState: normalizeChatState(message.chatState),
              messages: message.messages.map(normalizeMessage),
            });
            return;
          case 'chat:message':
            addMessage(sessionId, normalizeMessage(message.message));
            return;
          case 'chat:update':
            updateMessage(sessionId, message.messageId, {
              content: message.content,
              isStreaming: message.isStreaming,
            });
            return;
          case 'surface:update':
            setState((current) => ({
              ...current,
              chatState: normalizeChatState(message.chatState),
              surfaceMode: message.mode,
              surfaceRequirement: message.requirement,
            }));
            updateSession(sessionId, {
              chatState: normalizeChatState(message.chatState),
              surfaceMode: message.mode,
              surfaceRequirement: message.requirement,
            });
            return;
          case 'terminal:ready':
            handleStatus(message.status);
            setState((current) => ({
              ...current,
              chatState: normalizeChatState(message.chatState),
              sessionId,
              surfaceMode: message.surfaceMode,
              surfaceRequirement: message.surfaceRequirement,
            }));
            updateSession(sessionId, {
              chatState: normalizeChatState(message.chatState),
              surfaceMode: message.surfaceMode,
              surfaceRequirement: message.surfaceRequirement,
              terminal: normalizeTerminalRuntime(message.terminal),
            });
            client.send({
              cols: sizeRef.current.cols,
              rows: sizeRef.current.rows,
              type: 'terminal:init',
            });
            return;
          case 'terminal:snapshot':
          case 'terminal:update':
            setState((current) => ({
              ...current,
              lastError: null,
              sessionId,
              snapshot: message.snapshot,
            }));
            return;
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

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    if (!clientRef.current || !sessionId || state.status !== 'connected') return;
    clientRef.current.send({ cols: size.cols, rows: size.rows, type: 'terminal:resize' });
  }, [sessionId, size.cols, size.rows, state.status]);

  return useMemo(
    () => ({
      chatState: state.chatState,
      disconnect() {
        clientRef.current?.disconnect();
      },
      lastError: state.lastError,
      messages: sessionMessages,
      openSurface(mode: SurfaceMode) {
        if (!sessionId) return;
        setState((current) => ({ ...current, surfaceMode: mode }));
        updateSession(sessionId, { surfaceMode: mode });
        clientRef.current?.send({ mode, type: 'surface:set-mode' });
      },
      reconnect() {
        setState((current) => ({ ...current, lastError: null }));
        clientRef.current?.reconnect();
      },
      sendPrompt(content: string) {
        const trimmed = content.trim();
        if (!trimmed) return false;
        clientRef.current?.send({ content: trimmed, type: 'chat:prompt' });
        return true;
      },
      sendTerminalInput(data: string) {
        if (!data.length) return false;
        clientRef.current?.send({ data, type: 'terminal:input' });
        return true;
      },
      sendTerminalKey(key: TerminalKey) {
        clientRef.current?.send({ key, type: 'terminal:key' });
      },
      snapshot: state.snapshot,
      status: state.status,
      surfaceMode: state.surfaceMode,
      surfaceRequirement: state.surfaceRequirement,
    }),
    [sessionId, sessionMessages, state, updateSession]
  );
}

function normalizeMessage(message: Message) {
  return { ...message, timestamp: new Date(message.timestamp) };
}

function normalizeChatState(chatState: ChatState | undefined) {
  return chatState
    ? {
        ...chatState,
        transcriptUpdatedAt: chatState.transcriptUpdatedAt
          ? new Date(chatState.transcriptUpdatedAt)
          : undefined,
      }
    : undefined;
}

function normalizeTerminalRuntime(terminal: TerminalRuntime | undefined) {
  return terminal
    ? {
        ...terminal,
        lastSnapshotAt: terminal.lastSnapshotAt ? new Date(terminal.lastSnapshotAt) : undefined,
      }
    : undefined;
}
