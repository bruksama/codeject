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
  notifications: false,
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
    act(() => {
      resetStore();
    });
    websocketHarness.connect.mockClear();
    websocketHarness.disconnect.mockClear();
    websocketHarness.reconnect.mockClear();
    websocketHarness.send.mockClear();
    websocketHarness.options = null;
  });

  afterEach(() => {
    window.localStorage.clear();
    act(() => {
      resetStore();
    });
  });

  it('keeps transport frame errors on the reconnect path', async () => {
    const { result } = renderHook(() => useHybridSession('session-1'));

    expect(websocketHarness.connect).toHaveBeenCalledTimes(1);

    await act(async () => {
      websocketHarness.options?.onStatus?.('connected');
      await Promise.resolve();
    });

    await act(async () => {
      websocketHarness.options?.onError?.('Invalid websocket frame', 'transport');
      websocketHarness.options?.onStatus?.('disconnected');
      await Promise.resolve();
    });

    expect(result.current.status).toBe('disconnected');
    expect(result.current.lastError).toBeNull();
    expect(useAppStore.getState().sessions[0]?.status).toBe('disconnected');
  });

  it('surfaces session errors in the recovery state', async () => {
    const { result } = renderHook(() => useHybridSession('session-1'));

    await act(async () => {
      websocketHarness.options?.onStatus?.('connected');
      websocketHarness.options?.onError?.('Terminal session is not active', 'session');
      await Promise.resolve();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.lastError).toBe('Terminal session is not active');
    expect(useAppStore.getState().sessions[0]?.status).toBe('error');
  });

  it('stores terminal snapshots from websocket frames', async () => {
    const { result } = renderHook(() => useHybridSession('session-1'));

    await act(async () => {
      websocketHarness.options?.onMessage?.({
        type: 'terminal:snapshot',
        content: '$ pwd',
        cols: 80,
        rows: 24,
        seq: 3,
      });
      await Promise.resolve();
    });

    expect(result.current.terminalSnapshot).toEqual({
      content: '$ pwd',
      cols: 80,
      rows: 24,
      seq: 3,
    });
  });

  it('sends terminal input and special keys through the websocket client', async () => {
    const { result } = renderHook(() => useHybridSession('session-1'));

    await act(async () => {
      websocketHarness.options?.onStatus?.('connected');
      await Promise.resolve();
    });

    await act(async () => {
      expect(result.current.sendTerminalKey('Tab')).toBe(true);
      expect(result.current.sendTerminalInput('npm test')).toBe(true);
      await Promise.resolve();
    });

    expect(websocketHarness.send).toHaveBeenNthCalledWith(1, {
      key: 'Tab',
      type: 'terminal:key',
    });
    expect(websocketHarness.send).toHaveBeenNthCalledWith(2, {
      data: 'npm test',
      type: 'terminal:input',
    });
    expect(websocketHarness.send).toHaveBeenNthCalledWith(3, {
      key: 'Enter',
      type: 'terminal:key',
    });
  });
});
