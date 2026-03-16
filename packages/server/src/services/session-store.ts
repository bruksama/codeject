import fs from 'node:fs/promises';
import path from 'node:path';
import { type ChatState, type Session } from '@codeject/shared';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../config/environment.js';
import {
  deleteFileIfExists,
  ensureDirectory,
  readJsonFile,
  writeJsonFile,
} from './file-system-store.js';

type SessionInput = Omit<Session, 'id' | 'createdAt' | 'lastMessageAt'> & Partial<Pick<Session, 'id' | 'createdAt' | 'lastMessageAt'>>;

function sessionFilePath(sessionId: string) {
  return path.join(environment.sessionsDir, `${sessionId}.json`);
}

function normalizeSessionOptions(session: Session) {
  return session.sessionOptions
    ? {
        terminal: session.sessionOptions.terminal
          ? {
              cols: session.sessionOptions.terminal.cols,
              rows: session.sessionOptions.terminal.rows,
            }
          : undefined,
      }
    : undefined;
}

function normalizeTerminalRuntime(session: Session) {
  return session.terminal
    ? {
        ...session.terminal,
        lastSnapshotAt: session.terminal.lastSnapshotAt
          ? new Date(session.terminal.lastSnapshotAt)
          : undefined,
      }
    : undefined;
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

function hydrateSession(session: Session): Session {
  return {
    ...session,
    createdAt: new Date(session.createdAt),
    lastMessageAt: new Date(session.lastMessageAt),
    chatState: normalizeChatState(session.chatState),
    sessionOptions: normalizeSessionOptions(session),
    surfaceMode: session.surfaceMode ?? 'chat',
    surfaceRequirement: session.surfaceRequirement ?? 'terminal-available',
    terminal: normalizeTerminalRuntime(session),
    messages: session.messages.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
    })),
  };
}

export class SessionStore {
  private readonly sessionLocks = new Map<string, Promise<unknown>>();

  async listSessions() {
    await this.cleanupStaleSessions();
    await ensureDirectory(environment.sessionsDir);
    const entries = await fs.readdir(environment.sessionsDir);
    const sessions = await Promise.all(
      entries.filter((entry) => entry.endsWith('.json')).map(async (entry) => {
        const session = await readJsonFile<Session | null>(path.join(environment.sessionsDir, entry), null);
        return session ? hydrateSession(session) : null;
      })
    );
    return sessions.filter(Boolean).sort((a, b) => b!.lastMessageAt.getTime() - a!.lastMessageAt.getTime()) as Session[];
  }

  async getSession(sessionId: string) {
    const session = await readJsonFile<Session | null>(sessionFilePath(sessionId), null);
    return session ? hydrateSession(session) : null;
  }

  async createSession(input: SessionInput) {
    const session: Session = {
      ...input,
      id: input.id ?? uuidv4(),
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
      lastMessageAt: input.lastMessageAt ? new Date(input.lastMessageAt) : new Date(),
      chatState: normalizeChatState(input.chatState),
      messages: input.messages ?? [],
      surfaceMode: input.surfaceMode ?? 'chat',
      surfaceRequirement: input.surfaceRequirement ?? 'terminal-available',
    };
    await this.withSessionLock(session.id, async () => {
      await writeJsonFile(sessionFilePath(session.id), session);
    });
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<Session>) {
    return this.withSessionLock(sessionId, async () => {
      const existing = await this.getSession(sessionId);
      if (!existing) return null;
      const nextSession: Session = {
        ...existing,
        ...updates,
        id: existing.id,
        createdAt: updates.createdAt ? new Date(updates.createdAt) : existing.createdAt,
        lastMessageAt: updates.lastMessageAt ? new Date(updates.lastMessageAt) : existing.lastMessageAt,
        chatState:
          'chatState' in updates ? normalizeChatState(updates.chatState) : existing.chatState,
        sessionOptions: updates.sessionOptions ?? existing.sessionOptions,
        surfaceMode: updates.surfaceMode ?? existing.surfaceMode,
        surfaceRequirement: updates.surfaceRequirement ?? existing.surfaceRequirement,
        terminal:
          'terminal' in updates
            ? updates.terminal
              ? {
                  ...updates.terminal,
                  lastSnapshotAt: updates.terminal.lastSnapshotAt
                    ? new Date(updates.terminal.lastSnapshotAt)
                    : undefined,
                }
              : undefined
            : existing.terminal,
        messages: updates.messages
          ? updates.messages.map((message) => ({ ...message, timestamp: new Date(message.timestamp) }))
          : existing.messages,
      };
      await writeJsonFile(sessionFilePath(sessionId), nextSession);
      return nextSession;
    });
  }

  async deleteSession(sessionId: string) {
    await this.withSessionLock(sessionId, async () => {
      await deleteFileIfExists(sessionFilePath(sessionId));
    });
  }

  async cleanupStaleSessions() {
    await ensureDirectory(environment.sessionsDir);
    const sessions = await this.listRawSessions();
    const staleSessions = sessions.filter(
      (session) => Date.now() - new Date(session.lastMessageAt).getTime() > environment.staleSessionMs
    );
    await Promise.all(staleSessions.map((session) => deleteFileIfExists(sessionFilePath(session.id))));
    return staleSessions.map(hydrateSession);
  }

  private async listRawSessions() {
    const entries = await fs.readdir(environment.sessionsDir);
    const sessions = await Promise.all(
      entries.filter((entry) => entry.endsWith('.json')).map((entry) =>
        readJsonFile<Session | null>(path.join(environment.sessionsDir, entry), null)
      )
    );
    return sessions.filter(Boolean) as Session[];
  }

  private async withSessionLock<T>(sessionId: string, operation: () => Promise<T>) {
    const previous = this.sessionLocks.get(sessionId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    this.sessionLocks.set(sessionId, next);
    try {
      return await next;
    } finally {
      if (this.sessionLocks.get(sessionId) === next) {
        this.sessionLocks.delete(sessionId);
      }
    }
  }
}

export const sessionStore = new SessionStore();
