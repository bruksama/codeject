import fs from 'node:fs/promises';
import path from 'node:path';
import { Session } from '@codeject/shared';
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

function hydrateSession(session: Session): Session {
  return {
    ...session,
    createdAt: new Date(session.createdAt),
    lastMessageAt: new Date(session.lastMessageAt),
    messages: session.messages.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
    })),
  };
}

export class SessionStore {
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
    };
    await writeJsonFile(sessionFilePath(session.id), session);
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<Session>) {
    const existing = await this.getSession(sessionId);
    if (!existing) return null;
    const nextSession: Session = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: updates.createdAt ? new Date(updates.createdAt) : existing.createdAt,
      lastMessageAt: updates.lastMessageAt ? new Date(updates.lastMessageAt) : existing.lastMessageAt,
      messages: updates.messages
        ? updates.messages.map((message) => ({ ...message, timestamp: new Date(message.timestamp) }))
        : existing.messages,
    };
    await writeJsonFile(sessionFilePath(sessionId), nextSession);
    return nextSession;
  }

  async deleteSession(sessionId: string) {
    await deleteFileIfExists(sessionFilePath(sessionId));
  }

  async cleanupStaleSessions() {
    await ensureDirectory(environment.sessionsDir);
    const sessions = await this.listRawSessions();
    await Promise.all(
      sessions
        .filter((session) => Date.now() - new Date(session.lastMessageAt).getTime() > environment.staleSessionMs)
        .map((session) => deleteFileIfExists(sessionFilePath(session.id)))
    );
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
}

export const sessionStore = new SessionStore();

