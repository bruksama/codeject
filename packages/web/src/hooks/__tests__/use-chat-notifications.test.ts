import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';
import { useChatNotifications } from '../use-chat-notifications';

const notificationHarness = vi.hoisted(() => ({
  notify: vi.fn(),
}));

vi.mock('@/lib/notification-service', () => ({
  notificationService: {
    notify: notificationHarness.notify,
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

function resetStore() {
  useAppStore.setState({
    activeSessionId: null,
    cliPrograms: [],
    sessions: [],
    settings: structuredClone(defaultSettings),
  });
}

describe('useChatNotifications', () => {
  beforeEach(() => {
    resetStore();
    notificationHarness.notify.mockClear();
  });

  it('does not notify when browser notifications are disabled', () => {
    const { result } = renderHook(() => useChatNotifications('session-1'));

    act(() => {
      result.current.handleMessage({
        message: {
          content: 'Finished',
          id: 'assistant-1',
          role: 'assistant',
          timestamp: new Date('2026-03-23T09:00:00.000Z'),
        },
        type: 'chat:message',
      });
    });

    expect(notificationHarness.notify).not.toHaveBeenCalled();
  });

  it('dedupes repeated action request notifications', () => {
    useAppStore.getState().updateSettings({ notifications: true });
    const { result } = renderHook(() => useChatNotifications('session-1'));
    const confirmOption = { label: 'Approve', submit: 'y', value: 'yes' };
    const rejectOption = { label: 'Reject', submit: 'n', value: 'no' };
    const actionMessage = {
      chatState: {
        actionRequest: {
          id: 'action-1',
          kind: 'confirm' as const,
          options: [confirmOption, rejectOption] as [typeof confirmOption, typeof rejectOption],
          prompt: 'Approve the command?',
          source: 'terminal' as const,
        },
        phase: 'idle' as const,
      },
      mode: 'chat' as const,
      requirement: 'chat-safe' as const,
      type: 'surface:update' as const,
    };

    act(() => {
      result.current.handleMessage(actionMessage);
      result.current.handleMessage(actionMessage);
    });

    expect(notificationHarness.notify).toHaveBeenCalledTimes(1);
    expect(notificationHarness.notify).toHaveBeenCalledWith('Action needed', {
      body: 'Approve the command?',
      sessionId: 'session-1',
      tag: 'action-session-1',
    });
  });

  it('notifies for persisted action requests delivered by bootstrap', () => {
    useAppStore.getState().updateSettings({ notifications: true });
    const { result } = renderHook(() => useChatNotifications('session-1'));

    act(() => {
      result.current.handleMessage({
        chatState: {
          actionRequest: {
            id: 'action-boot',
            kind: 'free-input',
            context: 'Paste token',
            prompt: 'Paste token',
            source: 'terminal',
          },
          phase: 'terminal-required',
        },
        messages: [],
        type: 'chat:bootstrap',
      });
    });

    expect(notificationHarness.notify).toHaveBeenCalledWith('Action needed', {
      body: 'Paste token',
      sessionId: 'session-1',
      tag: 'action-session-1',
    });
  });

  it('notifies when an assistant reply settles through chat:update', () => {
    useAppStore.getState().updateSettings({ notifications: true });
    const { result } = renderHook(() => useChatNotifications('session-1'));

    act(() => {
      result.current.handleMessage({
        content: 'Final answer',
        isStreaming: false,
        messageId: 'assistant-2',
        type: 'chat:update',
      });
    });

    expect(notificationHarness.notify).toHaveBeenCalledWith('Reply ready', {
      body: 'Final answer',
      sessionId: 'session-1',
      tag: 'reply-session-1',
    });
  });

  it('notifies when a connected session becomes idle', () => {
    useAppStore.getState().updateSettings({ notifications: true });
    const { result } = renderHook(() => useChatNotifications('session-1'));

    act(() => {
      result.current.handleMessage({
        chatState: { phase: 'idle' },
        sessionId: 'session-1',
        status: 'connected',
        surfaceMode: 'chat',
        surfaceRequirement: 'terminal-available',
        type: 'terminal:ready',
      });
      result.current.handleMessage({
        status: 'idle',
        type: 'terminal:status',
      });
    });

    expect(notificationHarness.notify).toHaveBeenCalledWith('Session finished', {
      body: 'Your AI agent is idle',
      sessionId: 'session-1',
      tag: 'idle-session-1',
    });
  });
});
