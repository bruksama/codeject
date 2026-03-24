import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import type net from 'node:net';
import test from 'node:test';
import { WebSocket } from 'ws';
import { type Session } from '@codeject/shared';
import { createWebSocketHandler } from './websocket-handler.js';

class TestSessionStore {
  constructor(private readonly session: Session) {}

  async getSession(sessionId: string) {
    return sessionId === this.session.id ? structuredClone(this.session) : null;
  }

  async updateSession(_sessionId: string, _updates: Partial<Session>) {
    return structuredClone(this.session);
  }
}

class TestSessionSupervisor extends EventEmitter {
  chatPromptCalls = 0;

  async getBootstrap() {
    return {
      chatState: { phase: 'idle' as const },
      messages: [],
    };
  }

  async handleActionSubmission() {}

  async handleChatPrompt() {
    this.chatPromptCalls += 1;
  }

  async handleStatus() {}

  async handleTerminalSnapshot() {}
}

class TestTerminalSessionManager extends EventEmitter {
  snapshot = { cols: 80, content: '', rows: 24, seq: 1 };
  sendInputCalls = 0;

  async ensureSession() {}

  async getSnapshot() {
    return this.snapshot;
  }

  async observe() {}

  async sendInput() {
    this.sendInputCalls += 1;
    return true;
  }

  async sendKey() {
    return true;
  }

  unobserve() {}
}

test('websocket handler rejects malformed client frames before command execution', async (t) => {
  const now = new Date('2026-03-23T09:00:00.000Z');
  const session: Session = {
    id: 'session-1',
    name: 'Session 1',
    cliProgram: {
      id: 'claude-code',
      name: 'Claude Code',
      command: 'claude',
      icon: '/assets/program-icons/claude.png',
    },
    workspacePath: '/tmp/codeject',
    messages: [],
    status: 'idle',
    surfaceMode: 'chat',
    surfaceRequirement: 'terminal-available',
    createdAt: now,
    lastMessageAt: now,
  };
  const sessionStore = new TestSessionStore(session);
  const sessionSupervisor = new TestSessionSupervisor();
  const terminalSessionManager = new TestTerminalSessionManager();
  const websocketHandler = createWebSocketHandler({
    sessionStore: sessionStore as never,
    sessionSupervisor: sessionSupervisor as never,
    terminalSessionManager: terminalSessionManager as never,
  });
  const server = http.createServer();

  server.on('upgrade', (request, socket, head) => {
    void websocketHandler.upgrade(request, socket as net.Socket, head);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  t.after(async () => {
    await websocketHandler.shutdown();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected server address');
  }

  const client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/session-1`);
  t.after(() => client.close());

  const messages: Array<Record<string, unknown>> = [];
  client.on('message', (data) => {
    messages.push(JSON.parse(data.toString()) as Record<string, unknown>);
  });

  await new Promise<void>((resolve, reject) => {
    client.once('open', () => resolve());
    client.once('error', reject);
  });

  client.send(JSON.stringify({ type: 'chat:prompt', content: 42 }));

  await waitFor(() =>
    messages.some(
      (message) =>
        message.type === 'terminal:error' && message.message === 'Invalid websocket frame'
    )
  );

  assert.equal(terminalSessionManager.sendInputCalls, 0);
  assert.equal(sessionSupervisor.chatPromptCalls, 0);
});

test('websocket handler forwards terminal snapshots after terminal output', async (t) => {
  const now = new Date('2026-03-23T09:00:00.000Z');
  const session: Session = {
    id: 'session-1',
    name: 'Session 1',
    cliProgram: {
      id: 'claude-code',
      name: 'Claude Code',
      command: 'claude',
      icon: '/assets/program-icons/claude.png',
    },
    workspacePath: '/tmp/codeject',
    messages: [],
    status: 'idle',
    surfaceMode: 'chat',
    surfaceRequirement: 'terminal-available',
    createdAt: now,
    lastMessageAt: now,
  };
  const sessionStore = new TestSessionStore(session);
  const sessionSupervisor = new TestSessionSupervisor();
  const terminalSessionManager = new TestTerminalSessionManager();
  terminalSessionManager.snapshot = {
    cols: 80,
    content: '$ pwd',
    rows: 24,
    seq: 1,
  };
  const websocketHandler = createWebSocketHandler({
    sessionStore: sessionStore as never,
    sessionSupervisor: sessionSupervisor as never,
    terminalSessionManager: terminalSessionManager as never,
  });
  const server = http.createServer();

  server.on('upgrade', (request, socket, head) => {
    void websocketHandler.upgrade(request, socket as net.Socket, head);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  t.after(async () => {
    await websocketHandler.shutdown();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected server address');
  }

  const client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/session-1`);
  t.after(() => client.close());

  const messages: Array<Record<string, unknown>> = [];
  client.on('message', (data) => {
    messages.push(JSON.parse(data.toString()) as Record<string, unknown>);
  });

  await new Promise<void>((resolve, reject) => {
    client.once('open', () => resolve());
    client.once('error', reject);
  });

  await waitFor(() =>
    messages.some(
      (message) =>
        message.type === 'terminal:snapshot' &&
        message.content === '$ pwd' &&
        message.seq === 1
    )
  );

  terminalSessionManager.snapshot = {
    cols: 120,
    content: '$ pwd\n/tmp/codeject',
    rows: 32,
    seq: 2,
  };
  terminalSessionManager.emit('output', 'session-1', '$ pwd\n/tmp/codeject');

  await waitFor(() =>
    messages.some(
      (message) =>
        message.type === 'terminal:snapshot' &&
        message.content === '$ pwd\n/tmp/codeject' &&
        message.cols === 120 &&
        message.rows === 32 &&
        message.seq === 2
    )
  );
});

async function waitFor(predicate: () => boolean, timeoutMs = 2_000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for websocket assertion');
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
