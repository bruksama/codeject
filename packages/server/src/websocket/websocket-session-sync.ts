import { type ConnectionStatus, type Session, type TerminalRuntime } from '@codeject/shared';
import { type SessionStore } from '../services/session-store.js';

export class WebSocketSessionSync {
  constructor(private readonly sessionStore: SessionStore) {}

  async persistTerminalSize(sessionId: string, cols: number, rows: number) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
      sessionOptions: {
        ...session.sessionOptions,
        terminal: { cols, rows },
      },
    });
  }

  async updateSessionStatus(sessionId: string, status: ConnectionStatus) {
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
      status,
    });
  }

  async updateTerminalRuntime(sessionId: string, terminal: TerminalRuntime | undefined) {
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
      terminal,
    });
  }

  async touchSession(sessionId: string) {
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
    });
  }

  async clearLegacyTranscript(session: Session) {
    if (session.messages.length === 0) return;
    await this.sessionStore.updateSession(session.id, {
      messages: session.messages,
    });
  }
}
