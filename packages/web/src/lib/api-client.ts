'use client';

import {
  type CliProgram,
  type ConnectionStatus,
  type Message,
  type Session,
  type TunnelLifecycleState,
  type TunnelMode,
} from '@/types';

const API_KEY_STORAGE_KEY = 'codeject-api-key';
let cachedApiKey: string | null = null;
let storageListenersAttached = false;

function ensureApiKeyStorageListeners() {
  if (storageListenersAttached || typeof window === 'undefined') {
    return;
  }

  const clearCache = () => {
    cachedApiKey = null;
  };

  window.addEventListener('storage', (event) => {
    if (!event.key || event.key === API_KEY_STORAGE_KEY) {
      clearCache();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      clearCache();
    }
  });

  storageListenersAttached = true;
}

export interface TunnelStatusResponse {
  authConfigured: boolean;
  autoStart: boolean;
  binaryAvailable: boolean;
  canStart: boolean;
  isDevelopment: boolean;
  lastError?: string;
  managedPid?: number;
  namedTunnelHostname?: string;
  namedTunnelTokenConfigured: boolean;
  publicUrl?: string;
  startedAt?: string;
  tunnelMode: TunnelMode;
  status: TunnelLifecycleState;
}

export interface TunnelConfigurationInput {
  namedTunnelHostname?: string;
  namedTunnelToken?: string;
  tunnelMode: TunnelMode;
}

export interface TunnelAutoStartInput {
  autoStart: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

function getBaseHost() {
  if (typeof window === 'undefined') return '127.0.0.1';
  return window.location.hostname || '127.0.0.1';
}

function getApiBaseUrl() {
  if (typeof window === 'undefined') return 'http://127.0.0.1:3500';
  return window.location.port === '4028' ? `http://${getBaseHost()}:3500` : '';
}

export function getWebSocketUrl(sessionId: string) {
  const storedApiKey = getStoredApiKey();
  const tokenSuffix = storedApiKey ? `?token=${encodeURIComponent(storedApiKey)}` : '';

  if (typeof window === 'undefined') {
    return `ws://127.0.0.1:3500/ws/${sessionId}${tokenSuffix}`;
  }

  if (window.location.port === '4028') {
    return `ws://${getBaseHost()}:3500/ws/${sessionId}${tokenSuffix}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/${sessionId}${tokenSuffix}`;
}

export function getStoredApiKey() {
  if (typeof window === 'undefined') return '';
  ensureApiKeyStorageListeners();
  if (cachedApiKey !== null) {
    return cachedApiKey;
  }
  cachedApiKey = window.localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
  return cachedApiKey;
}

export function setStoredApiKey(apiKey: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  cachedApiKey = apiKey;
}

export function clearStoredApiKey() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  cachedApiKey = '';
}

function normalizeMessage(message: Message): Message {
  return {
    ...message,
    timestamp: new Date(message.timestamp),
  };
}

function normalizeSession(session: Session): Session {
  return {
    ...session,
    chatState: session.chatState
      ? {
          ...session.chatState,
          transcriptUpdatedAt: session.chatState.transcriptUpdatedAt
            ? new Date(session.chatState.transcriptUpdatedAt)
            : undefined,
        }
      : undefined,
    createdAt: new Date(session.createdAt),
    lastMessageAt: new Date(session.lastMessageAt),
    messages: session.messages.map(normalizeMessage),
    providerRuntime: session.providerRuntime,
    surfaceRequirement: session.surfaceRequirement ?? 'terminal-available',
    terminal: session.terminal
      ? {
          ...session.terminal,
          lastSnapshotAt: session.terminal.lastSnapshotAt
            ? new Date(session.terminal.lastSnapshotAt)
            : undefined,
        }
      : undefined,
  };
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const storedApiKey = getStoredApiKey();

  if (!headers.has('content-type') && init?.body) {
    headers.set('content-type', 'application/json');
  }

  if (storedApiKey && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${storedApiKey}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && payload.error
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export interface SessionCreateInput {
  cliProgram: CliProgram;
  name: string;
  sessionOptions?: Session['sessionOptions'];
  workspacePath: string;
}

export interface AuthStatusResponse {
  configured: boolean;
}

export const apiClient = {
  async createSession(input: SessionCreateInput) {
    const payload = await requestJson<{ session: Session }>('/api/sessions', {
      body: JSON.stringify({
        ...input,
        messages: [],
        status: 'starting' satisfies ConnectionStatus,
      }),
      method: 'POST',
    });
    return normalizeSession(payload.session);
  },

  async deleteCliProgram(programId: string) {
    await requestJson<void>(`/api/config/programs/${programId}`, { method: 'DELETE' });
  },

  async deleteSession(sessionId: string) {
    await requestJson<void>(`/api/sessions/${sessionId}`, { method: 'DELETE' });
  },

  async getAuthStatus() {
    return requestJson<AuthStatusResponse>('/api/auth');
  },

  async getSession(sessionId: string) {
    const payload = await requestJson<{ session: Session }>(`/api/sessions/${sessionId}`);
    return normalizeSession(payload.session);
  },

  async getTunnelStatus() {
    const payload = await requestJson<{ tunnel: TunnelStatusResponse }>('/api/tunnel');
    return payload.tunnel;
  },

  async listCliPrograms() {
    const payload = await requestJson<{ cliPrograms: CliProgram[] }>('/api/config/programs');
    return payload.cliPrograms;
  },

  async listSessions() {
    const payload = await requestJson<{ sessions: Session[] }>('/api/sessions');
    return payload.sessions.map(normalizeSession);
  },

  async rotateApiKey() {
    const payload = await requestJson<{ apiKey: string }>('/api/auth/rotate', {
      method: 'POST',
    });
    setStoredApiKey(payload.apiKey);
    return payload.apiKey;
  },

  async restartTunnel() {
    const payload = await requestJson<{ tunnel: TunnelStatusResponse }>('/api/tunnel/restart', {
      method: 'POST',
    });
    return payload.tunnel;
  },

  async saveCliProgram(program: Omit<CliProgram, 'id'> & { id?: string }) {
    if (program.id) {
      const payload = await requestJson<{ cliProgram: CliProgram }>(
        `/api/config/programs/${program.id}`,
        {
          body: JSON.stringify(program),
          method: 'PUT',
        }
      );
      return payload.cliProgram;
    }

    const payload = await requestJson<{ cliProgram: CliProgram }>('/api/config/programs', {
      body: JSON.stringify(program),
      method: 'POST',
    });
    return payload.cliProgram;
  },

  async saveTunnelConfiguration(input: TunnelConfigurationInput) {
    const payload = await requestJson<{ tunnel: TunnelStatusResponse }>('/api/tunnel/config', {
      body: JSON.stringify(input),
      method: 'PUT',
    });
    return payload.tunnel;
  },

  async startTunnel() {
    const payload = await requestJson<{ tunnel: TunnelStatusResponse }>('/api/tunnel/start', {
      method: 'POST',
    });
    return payload.tunnel;
  },

  async stopTunnel() {
    const payload = await requestJson<{ tunnel: TunnelStatusResponse }>('/api/tunnel/stop', {
      method: 'POST',
    });
    return payload.tunnel;
  },

  async setTunnelAutoStart(autoStart: boolean) {
    const payload = await requestJson<{ tunnel: TunnelStatusResponse }>('/api/tunnel/auto-start', {
      body: JSON.stringify({ autoStart }),
      method: 'PUT',
    });
    return payload.tunnel;
  },
};
