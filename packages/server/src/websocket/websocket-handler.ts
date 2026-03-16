import http from 'node:http';
import type net from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  type ClientWebSocketMessage,
  type ServerWebSocketMessage,
} from '@codeject/shared';
import { environment } from '../config/environment.js';
import { isLocalSocket } from '../middleware/auth-middleware.js';
import { authService } from '../services/auth-service.js';
import { type SessionSupervisor } from '../services/session-supervisor.js';
import { type SessionStore } from '../services/session-store.js';
import { type TerminalSessionManager } from '../services/terminal-session-manager.js';
import { logger } from '../utils/logger.js';
import { WebSocketSessionSync } from './websocket-session-sync.js';

interface ClientContext {
  isAlive: boolean;
  sessionId: string;
  socket: WebSocket;
}

interface WebSocketHandlerDependencies {
  sessionStore: SessionStore;
  sessionSupervisor: SessionSupervisor;
  terminalSessionManager: TerminalSessionManager;
}

export function createWebSocketHandler({
  sessionStore,
  sessionSupervisor,
  terminalSessionManager,
}: WebSocketHandlerDependencies) {
  const websocketServer = new WebSocketServer({ noServer: true });
  const clients = new Map<WebSocket, ClientContext>();
  const sessionSync = new WebSocketSessionSync(sessionStore);

  websocketServer.on('connection', (socket: WebSocket, request: http.IncomingMessage, sessionId: string) => {
    const client: ClientContext = { isAlive: true, sessionId, socket };
    clients.set(socket, client);

    const sendFrame = (frame: ServerWebSocketMessage) => {
      socket.send(JSON.stringify(frame));
    };

    void handleClientConnected(sessionId, sendFrame);

    socket.on('pong', () => {
      client.isAlive = true;
    });

    socket.on('message', (payload: Buffer) => {
      void handleClientMessage(sessionId, payload, sendFrame);
    });

    socket.on('close', () => {
      clients.delete(socket);
      if (!hasActiveClientForSession(sessionId)) {
        terminalSessionManager.unobserve(sessionId);
        void sessionSync.updateSessionStatus(sessionId, 'disconnected');
      }
    });

    socket.on('error', (error: Error) => {
      logger.warn('Websocket client error', error);
    });

    void request;
  });

  terminalSessionManager.on('update', (sessionId, snapshot) => {
    void sessionSupervisor.handleTerminalSnapshot(sessionId, snapshot);
    broadcast(sessionId, { type: 'terminal:update', snapshot });
  });

  terminalSessionManager.on('status', (sessionId, status) => {
    void sessionSupervisor.handleStatus(sessionId, status);
    broadcast(sessionId, { type: 'terminal:status', status });
  });

  terminalSessionManager.on('error', (sessionId, message) => {
    broadcast(sessionId, { type: 'terminal:error', message });
  });

  sessionSupervisor.on('chat:message', (sessionId, message) => {
    broadcast(sessionId, { type: 'chat:message', message });
  });

  sessionSupervisor.on('chat:update', (sessionId, messageId, content, isStreaming) => {
    broadcast(sessionId, { type: 'chat:update', content, isStreaming, messageId });
  });

  sessionSupervisor.on('surface:update', (sessionId, payload) => {
    broadcast(sessionId, { type: 'surface:update', ...payload });
  });

  const heartbeat = setInterval(() => {
    for (const client of clients.values()) {
      if (!client.isAlive) {
        client.socket.terminate();
        clients.delete(client.socket);
        terminalSessionManager.unobserve(client.sessionId);
        continue;
      }
      client.isAlive = false;
      client.socket.ping();
    }
  }, environment.websocketHeartbeatMs);

  websocketServer.on('close', () => clearInterval(heartbeat));

  return {
    async upgrade(request: http.IncomingMessage, socket: net.Socket, head: Buffer) {
      const requestUrl = new URL(request.url ?? '/', 'http://localhost');
      const match = requestUrl.pathname.match(/^\/ws\/(?<sessionId>[^/]+)$/);
      const sessionId = match?.groups?.sessionId;
      if (!sessionId) {
        socket.destroy();
        return;
      }

      const token = requestUrl.searchParams.get('token') ?? '';
      const isAuthorized = isLocalSocket(request.socket.remoteAddress) || (token && (await authService.validateApiKey(token)));
      if (!isAuthorized) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      websocketServer.handleUpgrade(request, socket, head, (websocket) => {
        websocketServer.emit('connection', websocket, request, sessionId);
      });
    },
  };

  function broadcast(sessionId: string, frame: ServerWebSocketMessage) {
    for (const client of clients.values()) {
      if (client.sessionId === sessionId) {
        client.socket.send(JSON.stringify(frame));
      }
    }
  }

  function hasActiveClientForSession(sessionId: string) {
    for (const client of clients.values()) {
      if (client.sessionId === sessionId) {
        return true;
      }
    }
    return false;
  }

  async function handleClientConnected(sessionId: string, sendFrame: (frame: ServerWebSocketMessage) => void) {
    try {
      const session = await sessionStore.getSession(sessionId);
      if (!session) {
        sendFrame({ type: 'terminal:error', message: 'Session not found' });
        return;
      }

      await terminalSessionManager.observe(session);
      const snapshot = await terminalSessionManager.getSnapshot(sessionId);
      const nextSession = await sessionStore.getSession(sessionId);
      const bootstrap = await sessionSupervisor.getBootstrap(sessionId);
      await sessionSync.updateSessionStatus(sessionId, 'connected');
      sendFrame({
        chatState: nextSession?.chatState,
        type: 'terminal:ready',
        sessionId,
        status: 'connected',
        surfaceMode: nextSession?.surfaceMode ?? 'chat',
        surfaceRequirement: nextSession?.surfaceRequirement ?? 'terminal-available',
        terminal: nextSession?.terminal,
      });
      sendFrame({
        type: 'chat:bootstrap',
        chatState: bootstrap?.chatState,
        messages: bootstrap?.messages ?? [],
      });
      sendFrame({ type: 'terminal:snapshot', snapshot });
    } catch (error) {
      sendFrame({
        type: 'terminal:error',
        message: error instanceof Error ? error.message : 'Failed to connect terminal session',
      });
    }
  }

  async function handleClientMessage(
    sessionId: string,
    payload: Buffer,
    sendFrame: (frame: ServerWebSocketMessage) => void
  ) {
    try {
      const frame = JSON.parse(payload.toString()) as ClientWebSocketMessage;
      try {
        switch (frame.type) {
          case 'chat:prompt': {
            const session = await sessionStore.getSession(sessionId);
            if (!session) {
              sendFrame({ type: 'terminal:error', message: 'Session not found' });
              return;
            }
            await terminalSessionManager.ensureSession(session);
            await sessionSupervisor.handleChatPrompt(sessionId, frame.content);
            if (!(await terminalSessionManager.sendInput(sessionId, frame.content))) {
              sendFrame({ type: 'terminal:error', message: 'Terminal session is not active' });
              return;
            }
            await terminalSessionManager.sendKey(sessionId, 'Enter');
            await sessionSync.touchSession(sessionId);
            return;
          }
          case 'surface:set-mode':
            await sessionSupervisor.handleSurfaceModeChange(sessionId, frame.mode);
            return;
          case 'terminal:init': {
            await sessionSync.persistTerminalSize(sessionId, frame.cols, frame.rows);
            const session = await sessionStore.getSession(sessionId);
            if (!session) {
              sendFrame({ type: 'terminal:error', message: 'Session not found' });
              return;
            }
            await terminalSessionManager.ensureSession(session);
            const snapshot = await terminalSessionManager.getSnapshot(sessionId);
            sendFrame({ type: 'terminal:snapshot', snapshot });
            return;
          }
          case 'terminal:input':
            if (!(await terminalSessionManager.sendInput(sessionId, frame.data))) {
              sendFrame({ type: 'terminal:error', message: 'Terminal session is not active' });
              return;
            }
            await sessionSync.touchSession(sessionId);
            return;
          case 'terminal:key':
            if (!(await terminalSessionManager.sendKey(sessionId, frame.key))) {
              sendFrame({ type: 'terminal:error', message: 'Terminal session is not active' });
              return;
            }
            await sessionSync.touchSession(sessionId);
            return;
          case 'terminal:ping':
            sendFrame({ type: 'terminal:pong', sessionId });
            return;
          case 'terminal:resize':
            if (!(await terminalSessionManager.resize(sessionId, { cols: frame.cols, rows: frame.rows }))) {
              sendFrame({ type: 'terminal:error', message: 'Terminal session is not active' });
              return;
            }
            await sessionSync.persistTerminalSize(sessionId, frame.cols, frame.rows);
            return;
          default:
            sendFrame({ type: 'terminal:error', message: 'Unsupported websocket message type' });
        }
      } catch (error) {
        logger.warn('Websocket command failed', error);
        sendFrame({
          type: 'terminal:error',
          message: error instanceof Error ? error.message : 'Failed to process websocket command',
        });
      }
    } catch (error: unknown) {
      logger.warn('Ignoring invalid websocket frame', error);
      sendFrame({ type: 'terminal:error', message: 'Invalid websocket frame' });
    }
  }
}
