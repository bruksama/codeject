import { Router } from 'express';
import { Session } from '@codeject/shared';
import { sessionStore } from '../services/session-store.js';
import { type TerminalSessionManager } from '../services/terminal-session-manager.js';

export function createSessionsRoutes(terminalSessionManager: TerminalSessionManager) {
  const sessionsRoutes = Router();

  sessionsRoutes.get('/', async (_request, response) => {
    response.json({ sessions: await sessionStore.listSessions() });
  });

  sessionsRoutes.get('/:sessionId', async (request, response) => {
    const session = await sessionStore.getSession(request.params.sessionId);
    if (!session) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }
    response.json({ session });
  });

  sessionsRoutes.post('/', async (request, response) => {
    const payload = request.body as Partial<Session>;
    if (!payload.name || !payload.cliProgram || !payload.workspacePath) {
      response.status(400).json({ error: 'name, cliProgram, and workspacePath are required' });
      return;
    }

    const session = await sessionStore.createSession({
      chatState: payload.chatState,
      name: payload.name,
      cliProgram: payload.cliProgram,
      workspacePath: payload.workspacePath,
      sessionOptions: payload.sessionOptions,
      messages: payload.messages ?? [],
      status: payload.status ?? 'idle',
      surfaceMode: payload.surfaceMode ?? 'chat',
      surfaceRequirement: payload.surfaceRequirement ?? 'terminal-available',
      terminal: payload.terminal,
      createdAt: payload.createdAt,
      id: payload.id,
      lastMessageAt: payload.lastMessageAt,
    });
    response.status(201).json({ session });
  });

  sessionsRoutes.patch('/:sessionId', async (request, response) => {
    const session = await sessionStore.updateSession(request.params.sessionId, request.body as Partial<Session>);
    if (!session) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }
    response.json({ session });
  });

  sessionsRoutes.delete('/:sessionId', async (request, response) => {
    const session = await sessionStore.getSession(request.params.sessionId);
    if (session?.terminal?.sessionName) {
      await terminalSessionManager.stopSession(request.params.sessionId);
    }
    await sessionStore.deleteSession(request.params.sessionId);
    response.status(204).send();
  });

  return sessionsRoutes;
}
