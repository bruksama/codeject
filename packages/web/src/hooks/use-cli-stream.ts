'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  type ConnectionStatus,
  type TerminalKey,
  type TerminalRuntime,
  type TerminalSnapshot,
} from '@/types';
import { getWebSocketUrl } from '@/lib/api-client';
import { WebSocketClient } from '@/lib/websocket-client';
import { useAppStore } from '@/stores/useAppStore';

const EMPTY_SNAPSHOT: TerminalSnapshot = {
  cols: 120,
  content: '',
  rows: 32,
  seq: 0,
};

interface StreamSize {
  cols: number;
  rows: number;
}

interface StreamState {
  lastError: string | null;
  sessionId: string | undefined;
  snapshot: TerminalSnapshot;
  status: ConnectionStatus;
}

export function useCliStream(sessionId: string | undefined, size: StreamSize) {
  const [streamState, setStreamState] = useState<StreamState>({
    lastError: null,
    sessionId: undefined,
    snapshot: EMPTY_SNAPSHOT,
    status: 'idle',
  });
  const clientRef = useRef<WebSocketClient | null>(null);
  const sizeRef = useRef(size);
  const lastStatusRef = useRef<ConnectionStatus>('idle');

  const updateSession = useAppStore((state) => state.updateSession);

  const handleStatus = useEffectEvent((status: ConnectionStatus) => {
    if (!sessionId || lastStatusRef.current === status) return;
    lastStatusRef.current = status;
    setStreamState((current) => ({ ...current, sessionId, status }));
    updateSession(sessionId, { status });
  });

  const pushInit = useEffectEvent(() => {
    clientRef.current?.send({
      cols: sizeRef.current.cols,
      rows: sizeRef.current.rows,
      type: 'terminal:init',
    });
  });

  useEffect(() => {
    if (!sessionId) return;

    lastStatusRef.current = 'idle';

    const client = new WebSocketClient(getWebSocketUrl(sessionId), {
      onError: (message) => {
        setStreamState((current) => ({
          ...current,
          lastError: message,
          sessionId,
          status: 'error',
        }));
        updateSession(sessionId, { status: 'error' });
        lastStatusRef.current = 'error';
      },
      onMessage: (message) => {
        switch (message.type) {
          case 'terminal:ready':
            handleStatus(message.status);
            if (message.terminal) {
              updateSession(sessionId, { terminal: normalizeTerminalRuntime(message.terminal) });
            }
            pushInit();
            return;
          case 'terminal:snapshot':
          case 'terminal:update':
            setStreamState((current) => ({
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
  }, [sessionId, updateSession]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    if (!clientRef.current || !sessionId) return;
    clientRef.current.send({
      cols: size.cols,
      rows: size.rows,
      type: 'terminal:resize',
    });
  }, [sessionId, size.cols, size.rows]);

  return useMemo(() => {
    const currentState =
      streamState.sessionId === sessionId
        ? streamState
        : {
            lastError: null,
            sessionId,
            snapshot: EMPTY_SNAPSHOT,
            status: 'idle' as ConnectionStatus,
          };

    return {
      disconnect() {
        clientRef.current?.disconnect();
      },

      lastError: currentState.lastError,

      reconnect() {
        setStreamState((state) => ({ ...state, lastError: null }));
        clientRef.current?.reconnect();
      },

      sendInput(data: string) {
        if (!data.length) return false;
        clientRef.current?.send({ data, type: 'terminal:input' });
        return true;
      },

      sendKey(key: TerminalKey) {
        clientRef.current?.send({ key, type: 'terminal:key' });
      },

      snapshot: currentState.snapshot,
      status: currentState.status,
    };
  }, [sessionId, streamState]);
}

function normalizeTerminalRuntime(terminal: TerminalRuntime): TerminalRuntime {
  return {
    ...terminal,
    lastSnapshotAt: terminal.lastSnapshotAt ? new Date(terminal.lastSnapshotAt) : undefined,
  };
}
