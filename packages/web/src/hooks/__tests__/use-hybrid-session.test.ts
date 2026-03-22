import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';
import type { Session } from '@/types';
import { useHybridSession } from '../use-hybrid-session';

type MockClientOptions = {
  onError?: (message: string, kind: 'session' | 'transport') => void;
  onMessage?: (message: unknown) => void;
  onReconnectAttempt?: (attempt: number) => void;
  onStatus?: (status: Session['status']) => void;
};

const websocketHarness = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  options: null as MockClientOptions | null,
  reconnect: vi.fn(),
  send: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  getWebSocketUrl: vi.fn(() => 'ws://example.test/ws/session-1'),
}));

vi.mock('@/lib/websocket-client', () => ({
  WebSocketClient: class MockWebSocketClient {
    constructor(_url: unknown, options: (typeof websocketHarness)['options']) {
      websocketHarness.options = options;
    }

    connect = websocketHarness.connect;
    disconnect = websocketHarness.disconnect;
    reconnect = websocketHarness.reconnect;
    send = websocketHarness.send;
  },
}));

const defaultSettings = {
  accentColor: '#7c3aed',
  fontSize: 'medium' as const,
  remoteAccess: {
    autoStart: false,
    authKey: '',
    enabled: false,
    namedTunnelHostname: undefined,
    namedTunnelTokenConfigured: false,
    tunnelMode: 'quick' as const,
    tunnelStatus: 'inactive' as const,
    tunnelUrl: undefined,
  },
  theme: 'dark' as const,
};

function createSession(): Session {
  const now = new Date('2026-03-23T09:00:00.000Z');
  return {
    id: 'session-1',
    name: 'Session 1',
    cliProgram: {
      command: 'claude',
      icon: '/assets/program-icons/claude.png',
      id: 'claude-code',
      name: 'Claude Code',
    },
    createdAt: now,
    lastMessageAt: now,
    messages: [],
    status: 'idle',
    surfaceMode: 'chat',
    surfaceRequirement: 'terminal-available',
    workspacePath: '~/projects/session-1',
  };
}

function resetStore() {
  useAppStore.setState({
    activeSessionId: 'session-1',
    cliPrograms: [],
    sessions: [createSession()],
    settings: structuredClone(defaultSettings),
  });
}

describe('useHybridSession', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStore();
    websocketHarness.connect.mockClear();
    websocketHarness.disconnect.mockClear();
    websocketHarness.reconnect.mockClear();
    websocketHarness.send.mockClear();
    websocketHarness.options = null;
  });

  afterEach(() => {
    window.localStorage.clear();
    resetStore();
  });

  it('keeps transport frame errors on the reconnect path', () => {
    const { result } = renderHook(() => useHybridSession('session-1'));

    expect(websocketHarness.connect).toHaveBeenCalledTimes(1);

    act(() => {
      websocketHarness.options?.onStatus?.('connected');
    });

    act(() => {
      websocketHarness.options?.onError?.('Invalid websocket frame', 'transport');
      websocketHarness.options?.onStatus?.('disconnected');
    });

    expect(result.current.status).toBe('disconnected');
    expect(result.current.lastError).toBeNull();
    expect(useAppStore.getState().sessions[0]?.status).toBe('disconnected');
  });

  it('surfaces session errors in the recovery state', () => {
    const { result } = renderHook(() => useHybridSession('session-1'));

    act(() => {
      websocketHarness.options?.onStatus?.('connected');
      websocketHarness.options?.onError?.('Terminal session is not active', 'session');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.lastError).toBe('Terminal session is not active');
    expect(useAppStore.getState().sessions[0]?.status).toBe('error');
  });
});
