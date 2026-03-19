import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { type Session } from '@codeject/shared';
import { type SessionStore } from './session-store.js';
import { SessionSupervisor } from './session-supervisor.js';

class TestSessionStore {
  private readonly sessions = new Map<string, Session>();

  async createSession(session: Session) {
    this.sessions.set(session.id, cloneSession(session));
  }

  async getSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    return session ? cloneSession(session) : null;
  }

  async updateSession(sessionId: string, updates: Partial<Session>) {
    const existing = this.sessions.get(sessionId);
    if (!existing) return null;
    const next = cloneSession({
      ...existing,
      ...updates,
      chatState: 'chatState' in updates ? updates.chatState : existing.chatState,
      messages: updates.messages ?? existing.messages,
      providerRuntime: updates.providerRuntime ?? existing.providerRuntime,
      surfaceRequirement: updates.surfaceRequirement ?? existing.surfaceRequirement,
      lastMessageAt: updates.lastMessageAt ? new Date(updates.lastMessageAt) : existing.lastMessageAt,
    });
    this.sessions.set(sessionId, next);
    return cloneSession(next);
  }
}

test('handleStatus retries briefly so a delayed final transcript still settles', async () => {
  const transcriptPath = await writeTempFile('');
  const session = createCodexSession(transcriptPath);
  const store = new TestSessionStore();
  await store.createSession(session);
  const supervisor = new SessionSupervisor(store as unknown as SessionStore);

  await supervisor.handleChatPrompt(session.id, 'Explain the result');

  const delayedWrite = new Promise<void>((resolve) => {
    setTimeout(() => {
      void fs
        .writeFile(
          transcriptPath,
          JSON.stringify({
            type: 'response_item',
            payload: {
              content: [{ text: 'Final after idle', type: 'output_text' }],
              id: 'assistant-final',
              phase: 'final_answer',
              role: 'assistant',
              type: 'message',
            },
          })
        )
        .then(() => resolve());
    }, 50);
  });

  await supervisor.handleStatus(session.id, 'idle');
  await delayedWrite;

  const next = await store.getSession(session.id);
  assert.equal(next?.chatState?.phase, 'idle');
  assert.equal(next?.messages.at(-1)?.content, 'Final after idle');
  assert.equal(next?.messages.at(-1)?.isStreaming, false);
});

function createCodexSession(transcriptPath: string): Session {
  const now = new Date();
  return {
    cliProgram: { command: 'codex', icon: 'bot', id: 'codex', name: 'Codex' },
    createdAt: now,
    id: 'session-status',
    lastMessageAt: now,
    messages: [],
    name: 'Codex Session',
    providerRuntime: { provider: 'codex', transcriptPath },
    status: 'connected',
    surfaceMode: 'chat',
    surfaceRequirement: 'terminal-available',
    workspacePath: '/tmp/codeject-status',
  };
}

function cloneSession(session: Session): Session {
  return {
    ...session,
    createdAt: new Date(session.createdAt),
    lastMessageAt: new Date(session.lastMessageAt),
    chatState: session.chatState
      ? {
          ...session.chatState,
          transcriptUpdatedAt: session.chatState.transcriptUpdatedAt
            ? new Date(session.chatState.transcriptUpdatedAt)
            : undefined,
        }
      : undefined,
    messages: session.messages.map((message) => ({ ...message, timestamp: new Date(message.timestamp) })),
  };
}

async function writeTempFile(content: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeject-status-'));
  const filePath = path.join(dir, 'transcript.jsonl');
  await fs.writeFile(filePath, content);
  return filePath;
}
