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
    const next = cloneSession(session);
    this.sessions.set(next.id, next);
    return cloneSession(next);
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

test('SessionSupervisor keeps Codex on loading until a final transcript answer exists', async () => {
  const transcriptPath = await writeTempFile(
    codexEntries([{ id: 'assistant-1', phase: 'commentary', text: 'Working...' }])
  );
  const session = createCodexSession(transcriptPath);
  const store = new TestSessionStore();
  await store.createSession(session);
  const supervisor = new SessionSupervisor(store as unknown as SessionStore);

  await supervisor.handleChatPrompt(session.id, 'Explain the change');
  await supervisor.handleTerminalSnapshot(session.id, blankSnapshot());

  let next = await store.getSession(session.id);
  assert.equal(next?.chatState?.phase, 'awaiting-assistant');
  assert.deepEqual(
    next?.messages.map((message) => ({ content: message.content, role: message.role })),
    [
      { content: 'Explain the change', role: 'user' },
      { content: '', role: 'assistant' },
    ]
  );

  await fs.writeFile(
    transcriptPath,
    codexEntries([{ id: 'assistant-2', phase: 'final_answer', text: 'Final answer' }])
  );
  await supervisor.handleTerminalSnapshot(session.id, blankSnapshot());

  next = await store.getSession(session.id);
  assert.equal(next?.messages.filter((message) => message.role === 'assistant').length, 1);
  assert.equal(next?.messages.at(-1)?.content, 'Final answer');
  assert.equal(next?.chatState?.phase, 'idle');
  assert.equal(next?.messages.at(-1)?.isStreaming, false);
});

test('SessionSupervisor ignores narrative terminal questions while Codex is still working', async () => {
  const transcriptPath = await writeTempFile(
    codexEntries([{ id: 'assistant-1', phase: 'commentary', text: 'Working...' }])
  );
  const session = createCodexSession(transcriptPath);
  const store = new TestSessionStore();
  await store.createSession(session);
  const supervisor = new SessionSupervisor(store as unknown as SessionStore);

  await supervisor.handleChatPrompt(session.id, 'Inspect the repo');
  await supervisor.handleTerminalSnapshot(session.id, {
    cols: 80,
    content:
      'Using ck:ask for an architecture/codebase assessment.\nI need you to inspect the current codebase and tell me which directory should I inspect first?',
    rows: 24,
    seq: 1,
  });

  const next = await store.getSession(session.id);
  assert.equal(next?.surfaceRequirement, 'terminal-available');
  assert.equal(next?.chatState?.actionRequest, undefined);
  assert.equal(next?.chatState?.phase, 'awaiting-assistant');
});

test('SessionSupervisor removes an empty assistant placeholder when no final answer arrives', async () => {
  const transcriptPath = await writeTempFile(
    codexEntries([{ id: 'assistant-1', phase: 'commentary', text: 'Still working' }])
  );
  const session = createCodexSession(transcriptPath);
  const store = new TestSessionStore();
  await store.createSession(session);
  const supervisor = new SessionSupervisor(store as unknown as SessionStore);

  await supervisor.handleChatPrompt(session.id, 'Try the task');
  await supervisor.handleTerminalSnapshot(session.id, blankSnapshot());
  await supervisor.handleStatus(session.id, 'idle');

  const next = await store.getSession(session.id);
  assert.equal(next?.chatState?.phase, 'idle');
  assert.deepEqual(
    next?.messages.map((message) => ({ content: message.content, role: message.role })),
    [{ content: 'Try the task', role: 'user' }]
  );
});

test('SessionSupervisor bootstrap ignores stale Codex finals from before the current turn', async () => {
  const transcriptPath = await writeTempFile(
    codexEntries([{ id: 'assistant-final', phase: 'final_answer', text: 'Older final' }])
  );
  const oldTimestamp = new Date(Date.now() - 20_000);
  await fs.utimes(transcriptPath, oldTimestamp, oldTimestamp);

  const session = createCodexSession(transcriptPath);
  const store = new TestSessionStore();
  await store.createSession(session);
  const supervisor = new SessionSupervisor(store as unknown as SessionStore);

  await supervisor.handleChatPrompt(session.id, 'New prompt');

  const bootstrap = await supervisor.getBootstrap(session.id);

  assert.equal(bootstrap?.chatState?.phase, 'awaiting-assistant');
  assert.deepEqual(
    bootstrap?.messages.map((message) => ({ content: message.content, role: message.role })),
    [
      { content: 'New prompt', role: 'user' },
      { content: '', role: 'assistant' },
    ]
  );
});

test('SessionSupervisor keeps Claude on loading until an end_turn transcript arrives', async () => {
  const transcriptPath = await writeTempFile(
    claudeEntries([
      { id: 'assistant-1', stopReason: null, text: "I'll inspect the repo first" },
    ])
  );
  const session = createClaudeSession(transcriptPath);
  const store = new TestSessionStore();
  await store.createSession(session);
  const supervisor = new SessionSupervisor(store as unknown as SessionStore);

  await supervisor.handleChatPrompt(session.id, 'Explain the change');
  await supervisor.handleTerminalSnapshot(session.id, blankSnapshot());

  let next = await store.getSession(session.id);
  assert.equal(next?.chatState?.phase, 'awaiting-assistant');
  assert.deepEqual(
    next?.messages.map((message) => ({ content: message.content, role: message.role })),
    [
      { content: 'Explain the change', role: 'user' },
      { content: '', role: 'assistant' },
    ]
  );

  await fs.writeFile(
    transcriptPath,
    claudeEntries([
      { id: 'assistant-2', stopReason: 'end_turn', text: 'Final Claude answer' },
    ])
  );
  await supervisor.handleTerminalSnapshot(session.id, blankSnapshot());

  next = await store.getSession(session.id);
  assert.equal(next?.messages.at(-1)?.content, 'Final Claude answer');
  assert.equal(next?.chatState?.phase, 'idle');
});

test('SessionSupervisor resumes pending after action submission and settles the next final answer', async () => {
  const transcriptPath = await writeTempFile(
    codexEntries([{ id: 'assistant-1', phase: 'commentary', text: 'Working after action' }])
  );
  const session = createCodexSession(transcriptPath);
  session.chatState = {
    actionRequest: {
      id: 'action-1',
      kind: 'confirm',
      options: [
        { label: 'Yes', submit: 'y', value: 'yes' },
        { label: 'No', submit: 'n', value: 'no' },
      ],
      prompt: 'Continue?',
      source: 'terminal',
    },
    phase: 'terminal-required',
    transcriptUpdatedAt: new Date(Date.now() - 5_000),
  };
  const store = new TestSessionStore();
  await store.createSession(session);
  const supervisor = new SessionSupervisor(store as unknown as SessionStore);

  await supervisor.handleActionSubmission(session.id);
  await supervisor.handleTerminalSnapshot(session.id, blankSnapshot());

  let next = await store.getSession(session.id);
  assert.equal(next?.chatState?.phase, 'awaiting-assistant');
  assert.equal(next?.messages.length, 0);

  await fs.writeFile(
    transcriptPath,
    codexEntries([{ id: 'assistant-2', phase: 'final_answer', text: 'Post-action final answer' }])
  );
  await supervisor.handleTerminalSnapshot(session.id, blankSnapshot());

  next = await store.getSession(session.id);
  assert.equal(next?.messages.at(-1)?.content, 'Post-action final answer');
  assert.equal(next?.chatState?.phase, 'idle');
});

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

function createCodexSession(transcriptPath: string): Session {
  const now = new Date();
  return {
    cliProgram: { command: 'codex', icon: 'bot', id: 'codex', name: 'Codex' },
    createdAt: now,
    id: 'session-1',
    lastMessageAt: now,
    messages: [],
    name: 'Codex Session',
    providerRuntime: { provider: 'codex', transcriptPath },
    status: 'connected',
    surfaceMode: 'chat',
    surfaceRequirement: 'terminal-available',
    workspacePath: '/tmp/codeject',
  };
}

function createClaudeSession(transcriptPath: string): Session {
  const now = new Date();
  return {
    cliProgram: { command: 'claude', icon: 'bot', id: 'claude-code', name: 'Claude Code' },
    createdAt: now,
    id: 'session-claude',
    lastMessageAt: now,
    messages: [],
    name: 'Claude Session',
    providerRuntime: { provider: 'claude', transcriptPath },
    status: 'connected',
    surfaceMode: 'chat',
    surfaceRequirement: 'terminal-available',
    workspacePath: '/tmp/codeject',
  };
}

function blankSnapshot() {
  return { cols: 80, content: '', rows: 24, seq: 1 };
}

function codexEntries(entries: Array<{ id: string; phase: string; text: string }>) {
  return entries
    .map((entry) =>
      JSON.stringify({
        type: 'response_item',
        payload: {
          content: [{ text: entry.text, type: 'output_text' }],
          id: entry.id,
          phase: entry.phase,
          role: 'assistant',
          type: 'message',
        },
      })
    )
    .join('\n');
}

function claudeEntries(entries: Array<{ id: string; stopReason: string | null; text: string }>) {
  return entries
    .map((entry) =>
      JSON.stringify({
        message: {
          content: [{ text: entry.text, type: 'text' }],
          id: entry.id,
          role: 'assistant',
          stop_reason: entry.stopReason,
        },
      })
    )
    .join('\n');
}

async function writeTempFile(content: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeject-supervisor-'));
  const filePath = path.join(dir, 'transcript.jsonl');
  await fs.writeFile(filePath, content);
  return filePath;
}
