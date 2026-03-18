import http from 'node:http';
import type net from 'node:net';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
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
  clientId: string;
  initialized: boolean;
  isAlive: boolean;
  sessionId: string;
  socket: WebSocket;
  wantsControl: boolean;
}
interface SessionControlState {
  controllerClientId?: string;
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
  const controlStates = new Map<string, SessionControlState>();
  const sessionSync = new WebSocketSessionSync(sessionStore);
  let nextClientId = 1;

  websocketServer.on('connection', (socket: WebSocket, request: http.IncomingMessage, sessionId: string) => {
    const client: ClientContext = {
      clientId: `client-${nextClientId++}`,
      initialized: false,
      isAlive: true,
      sessionId,
      socket,
      wantsControl: false,
    };
    clients.set(socket, client);
    ensureSessionControlState(sessionId);

    const sendFrame = (frame: ServerWebSocketMessage) => {
      safeSend(socket, frame);
    };

    void handleClientConnected(client, sendFrame);

    socket.on('pong', () => {
      client.isAlive = true;
    });

    socket.on('message', (payload: RawData) => {
      void handleClientMessage(client, payload, sendFrame);
    });

    socket.on('close', () => {
      clients.delete(socket);
      releaseControlIfOwned(client);
      if (client.initialized) {
        terminalSessionManager.unobserve(sessionId);
        client.initialized = false;
      }
      if (!hasActiveClientForSession(sessionId)) {
        void sessionSync.updateSessionStatus(sessionId, 'disconnected');
      }
      broadcastControlState(sessionId);
    });

    socket.on('error', (error: Error) => {
      logger.warn('Websocket client error', error);
    });

    void request;
  });

  let pendingOutputSnapshot = Promise.resolve();

  async function handleTerminalOutput(sessionId: string, data: string) {
    broadcast(sessionId, { type: 'terminal:output', data });
    const snapshot = await terminalSessionManager.getSnapshot(sessionId);
    await sessionSupervisor.handleTerminalSnapshot(sessionId, snapshot);
  }

  function queueTerminalOutput(sessionId: string, data: string) {
    pendingOutputSnapshot = pendingOutputSnapshot
      .catch(() => undefined)
      .then(() => handleTerminalOutput(sessionId, data))
      .catch(() => undefined);
  }

  function safeQueueTerminalOutput(sessionId: string, data: string) {
    queueTerminalOutput(sessionId, data);
  }

  terminalSessionManager.on('output', (sessionId, data) => {
    safeQueueTerminalOutput(sessionId, data);
  });

  terminalSessionManager.on('update', (sessionId, snapshot) => {
    void sessionSupervisor.handleTerminalSnapshot(sessionId, snapshot);
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
        if (client.initialized) {
          terminalSessionManager.unobserve(client.sessionId);
          client.initialized = false;
        }
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
      const isAuthorized =
        isLocalSocket(request.headers, request.socket.remoteAddress) ||
        (token && (await authService.validateApiKey(token)));
      if (!isAuthorized) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      websocketServer.handleUpgrade(request, socket, head, (websocket) => {
        websocketServer.emit('connection', websocket, request, sessionId);
      });
    },
    async shutdown() {
      websocketServer.close();
      for (const client of clients.values()) {
        client.socket.terminate();
        clients.delete(client.socket);
        if (client.initialized) {
          terminalSessionManager.unobserve(client.sessionId);
          client.initialized = false;
        }
      }
    },
  };

  function broadcast(sessionId: string, frame: ServerWebSocketMessage) {
    for (const client of clients.values()) {
      if (client.sessionId === sessionId) {
        safeSend(client.socket, frame);
      }
    }
  }

  function safeSend(socket: WebSocket, frame: ServerWebSocketMessage) {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      socket.send(JSON.stringify(frame));
    } catch (error) {
      logger.warn('Failed to send websocket frame', error);
    }
  }

  function toMessageText(payload: RawData) {
    if (typeof payload === 'string') {
      return payload;
    }
    if (payload instanceof Buffer) {
      return payload.toString();
    }
    if (payload instanceof ArrayBuffer) {
      return Buffer.from(payload).toString();
    }
    return Buffer.concat(Array.isArray(payload) ? payload : [payload]).toString();
  }

  function hasActiveClientForSession(sessionId: string) {
    for (const client of clients.values()) {
      if (client.sessionId === sessionId) {
        return true;
      }
    }
    return false;
  }

  async function handleClientConnected(client: ClientContext, sendFrame: (frame: ServerWebSocketMessage) => void) {
    try {
      const session = await sessionStore.getSession(client.sessionId);
      if (!session) {
        sendFrame({ type: 'terminal:error', message: 'Session not found' });
        return;
      }

      await terminalSessionManager.ensureSession(session);
      const nextSession = await sessionStore.getSession(client.sessionId);
      const bootstrap = await sessionSupervisor.getBootstrap(client.sessionId);
      await sessionSync.updateSessionStatus(client.sessionId, 'connected');
      sendFrame({
        chatState: nextSession?.chatState,
        type: 'terminal:ready',
        sessionId: client.sessionId,
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
      sendControlState(sendFrame, client);
      broadcastControlState(client.sessionId);
    } catch (error) {
      sendFrame({
        type: 'terminal:error',
        message: error instanceof Error ? error.message : 'Failed to connect terminal session',
      });
    }
  }

  async function sendInitialTerminalState(
    client: ClientContext,
    sendFrame: (frame: ServerWebSocketMessage) => void
  ) {
    sendFrame({ type: 'terminal:reset' });
    const snapshot = await terminalSessionManager.getSnapshot(client.sessionId);
    if (snapshot.content) {
      sendFrame({ type: 'terminal:output', data: snapshot.content });
    }
  }


  async function handleClientMessage(
    client: ClientContext,
    payload: RawData,
    sendFrame: (frame: ServerWebSocketMessage) => void
  ) {
    try {
      const frame = JSON.parse(toMessageText(payload)) as ClientWebSocketMessage;
      try {
        switch (frame.type) {
          case 'chat:prompt': {
            const session = await sessionStore.getSession(client.sessionId);
            if (!session) {
              sendFrame({ type: 'terminal:error', message: 'Session not found' });
              return;
            }
            await terminalSessionManager.ensureSession(session);
            await sessionSupervisor.handleChatPrompt(client.sessionId, frame.content);
            if (!(await terminalSessionManager.sendInput(client.sessionId, frame.content))) {
              sendFrame({ type: 'terminal:error', message: 'Terminal session is not active' });
              return;
            }
            await terminalSessionManager.sendKey(client.sessionId, 'Enter');
            await sessionSync.touchSession(client.sessionId);
            return;
          }
          case 'surface:set-mode':
            await sessionSupervisor.handleSurfaceModeChange(client.sessionId, frame.mode);
            return;
          case 'terminal:init': {
            client.wantsControl = frame.wantsControl ?? client.wantsControl;
            await sessionSync.persistTerminalSize(client.sessionId, frame.cols, frame.rows);
            const session = await sessionStore.getSession(client.sessionId);
            if (!session) {
              sendFrame({ type: 'terminal:error', message: 'Session not found' });
              return;
            }
            session.sessionOptions = {
              ...session.sessionOptions,
              terminal: { cols: frame.cols, rows: frame.rows },
            };
            if (!client.initialized) {
              await terminalSessionManager.observe(session);
              client.initialized = true;
            } else {
              await terminalSessionManager.resize(client.sessionId, {
                cols: frame.cols,
                rows: frame.rows,
              });
            }
            claimInitialControl(client);
            await sendInitialTerminalState(client, sendFrame);
            sendControlState(sendFrame, client);
            broadcastControlState(client.sessionId);
            return;
          }
          case 'terminal:claim-control':
            claimControl(client);
            broadcastControlState(client.sessionId);
            return;
          case 'terminal:input':
            if (!canClientWrite(client)) {
              sendFrame({ type: 'terminal:error', message: 'Terminal is read-only for this client' });
              return;
            }
            if (!(await terminalSessionManager.sendInput(client.sessionId, frame.data))) {
              sendFrame({ type: 'terminal:error', message: 'Terminal session is not active' });
              return;
            }
            await sessionSync.touchSession(client.sessionId);
            return;
          case 'terminal:key':
            if (!canClientWrite(client)) {
              sendFrame({ type: 'terminal:error', message: 'Terminal is read-only for this client' });
              return;
            }
            if (!(await terminalSessionManager.sendKey(client.sessionId, frame.key))) {
              sendFrame({ type: 'terminal:error', message: 'Terminal session is not active' });
              return;
            }
            await sessionSync.touchSession(client.sessionId);
            return;
          case 'terminal:ping':
            sendFrame({ type: 'terminal:pong', sessionId: client.sessionId });
            return;
          case 'terminal:resize':
            if (!(await terminalSessionManager.resize(client.sessionId, { cols: frame.cols, rows: frame.rows }))) {
              sendFrame({ type: 'terminal:error', message: 'Terminal session is not active' });
              return;
            }
            await sessionSync.persistTerminalSize(client.sessionId, frame.cols, frame.rows);
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

  function ensureSessionControlState(sessionId: string) {
    let state = controlStates.get(sessionId);
    if (!state) {
      state = {};
      controlStates.set(sessionId, state);
    }
    return state;
  }

  function claimInitialControl(client: ClientContext) {
    const state = ensureSessionControlState(client.sessionId);
    if (!state.controllerClientId && client.wantsControl) {
      state.controllerClientId = client.clientId;
    }
  }

  function claimControl(client: ClientContext) {
    const state = ensureSessionControlState(client.sessionId);
    state.controllerClientId = client.clientId;
  }

  function releaseControlIfOwned(client: ClientContext) {
    const state = controlStates.get(client.sessionId);
    if (!state || state.controllerClientId !== client.clientId) {
      return;
    }
    state.controllerClientId = findFirstClientIdForSession(client.sessionId, client.clientId);
    if (!state.controllerClientId && !hasActiveClientForSession(client.sessionId)) {
      controlStates.delete(client.sessionId);
    }
  }

  function findFirstClientIdForSession(sessionId: string, excludeClientId?: string) {
    for (const client of clients.values()) {
      if (
        client.sessionId === sessionId &&
        client.clientId !== excludeClientId &&
        client.initialized &&
        client.wantsControl
      ) {
        return client.clientId;
      }
    }
    for (const client of clients.values()) {
      if (client.sessionId === sessionId && client.clientId !== excludeClientId && client.initialized) {
        return client.clientId;
      }
    }
    return undefined;
  }

  function canClientWrite(client: ClientContext) {
    const state = ensureSessionControlState(client.sessionId);
    return state.controllerClientId === client.clientId;
  }

  function sendControlState(sendFrame: (frame: ServerWebSocketMessage) => void, client: ClientContext) {
    const state = ensureSessionControlState(client.sessionId);
    const canWrite = state.controllerClientId === client.clientId;
    sendFrame({
      type: 'terminal:control-state',
      canWrite,
      controllerClientId: state.controllerClientId,
      mode: canWrite ? 'controller' : 'viewer',
      reason: canWrite ? undefined : 'Another client is controlling this terminal',
    });
  }

  function broadcastControlState(sessionId: string) {
    for (const client of clients.values()) {
      if (client.sessionId !== sessionId) {
        continue;
      }
      sendControlState((frame) => safeSend(client.socket, frame), client);
    }
  }
}

