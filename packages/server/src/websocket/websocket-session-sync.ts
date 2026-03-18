import { type ConnectionStatus } from '@codeject/shared';
import { type SessionStore } from '../services/session-store.js';

export class WebSocketSessionSync {
  constructor(private readonly sessionStore: SessionStore) {}

  async updateSessionStatus(sessionId: string, status: ConnectionStatus) {
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
      status,
    });
  }

  async touchSession(sessionId: string) {
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
    });
  }
}
