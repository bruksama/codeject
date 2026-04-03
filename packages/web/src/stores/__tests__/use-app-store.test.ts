import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';
import type { Session } from '@/types';

const STORAGE_KEY = 'codeject-storage';

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

function createSession(id: string): Session {
  const now = new Date('2026-03-23T09:00:00.000Z');
  return {
    id,
    name: `Session ${id}`,
    cliProgram: {
      id: 'claude-code',
      name: 'Claude Code',
      command: 'claude',
      icon: '/assets/program-icons/claude.png',
    },
    workspacePath: `~/projects/${id}`,
    messages: [],
    status: 'idle',
    surfaceMode: 'chat',
    surfaceRequirement: 'terminal-available',
    createdAt: now,
    lastMessageAt: now,
  };
}

function createMessage(id: string, content: string) {
  return {
    content,
    id,
    role: 'assistant' as const,
    timestamp: new Date('2026-03-23T09:00:01.000Z'),
  };
}

function resetStore() {
  useAppStore.setState({
    activeSessionId: null,
    cliPrograms: [],
    sessions: [],
    settings: structuredClone(defaultSettings),
  });
}

describe('useAppStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStore();
  });

  afterEach(() => {
    window.localStorage.clear();
    resetStore();
  });

  it('persists font size and accent color updates to localStorage', () => {
    useAppStore.getState().updateSettings({
      accentColor: '#1d4ed8',
      fontSize: 'large',
      notifications: true,
    });

    const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(persisted.state.settings.fontSize).toBe('large');
    expect(persisted.state.settings.accentColor).toBe('#1d4ed8');
    expect(persisted.state.settings.notifications).toBe(true);
  });

  it('merges remote access updates without dropping existing settings', () => {
    useAppStore.getState().updateRemoteAccess({
      autoStart: true,
      enabled: true,
    });

    const remoteAccess = useAppStore.getState().settings.remoteAccess;
    expect(remoteAccess).toMatchObject({
      autoStart: true,
      enabled: true,
      tunnelMode: 'quick',
      tunnelStatus: 'inactive',
    });
  });

  it('resets settings back to the default values', () => {
    useAppStore.getState().updateSettings({
      accentColor: '#f97316',
      fontSize: 'small',
      notifications: true,
    });

    useAppStore.getState().resetSettings();

    expect(useAppStore.getState().settings).toEqual(defaultSettings);
  });

  it('merges legacy persisted settings with the new notifications default', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          activeSessionId: null,
          settings: {
            accentColor: '#1d4ed8',
            fontSize: 'large',
            remoteAccess: {
              enabled: true,
              tunnelMode: 'quick',
            },
            theme: 'dark',
          },
        },
        version: 0,
      })
    );

    await useAppStore.persist.rehydrate();

    expect(useAppStore.getState().settings).toMatchObject({
      accentColor: '#1d4ed8',
      fontSize: 'large',
      notifications: false,
      remoteAccess: {
        autoStart: false,
        authKey: '',
        enabled: true,
        tunnelMode: 'quick',
        tunnelStatus: 'inactive',
      },
    });
  });

  it('keeps the active session when setSessions still contains it', () => {
    useAppStore.setState({ activeSessionId: 'session-2' });

    useAppStore.getState().setSessions([createSession('session-1'), createSession('session-2')]);

    expect(useAppStore.getState().activeSessionId).toBe('session-2');
  });

  it('falls back to the first session when the active session disappears', () => {
    useAppStore.setState({ activeSessionId: 'missing-session' });

    useAppStore.getState().setSessions([createSession('session-1'), createSession('session-2')]);

    expect(useAppStore.getState().activeSessionId).toBe('session-1');
  });

  it('keeps live messages idempotent when the same websocket frame arrives twice', () => {
    useAppStore.getState().addSession(createSession('session-1'));

    const message = createMessage('message-1', 'Final answer');
    useAppStore.getState().addMessage('session-1', message);
    useAppStore.getState().addMessage('session-1', message);

    expect(useAppStore.getState().sessions[0]?.messages).toEqual([message]);
  });

  it('dedupes duplicate message ids when a session payload replaces messages', () => {
    useAppStore.getState().addSession(createSession('session-1'));

    const message = createMessage('message-1', 'Final answer');
    useAppStore.getState().updateSession('session-1', {
      messages: [message, message],
    });

    expect(useAppStore.getState().sessions[0]?.messages).toEqual([message]);
  });
});
