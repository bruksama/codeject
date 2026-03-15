import http from 'node:http';
import type net from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import { environment } from '../config/environment.js';
import { authService } from '../services/auth-service.js';
import { isLocalSocket } from '../middleware/auth-middleware.js';
import { logger } from '../utils/logger.js';

interface ClientContext {
  isAlive: boolean;
  sessionId: string;
  socket: WebSocket;
}

export function createWebSocketHandler() {
  const websocketServer = new WebSocketServer({ noServer: true });
  const clients = new Map<WebSocket, ClientContext>();

  websocketServer.on(
    'connection',
    (socket: WebSocket, request: http.IncomingMessage, sessionId: string) => {
    const client: ClientContext = { isAlive: true, sessionId, socket };
    clients.set(socket, client);

    socket.send(JSON.stringify({ type: 'connection:ready', sessionId }));
    socket.on('pong', () => {
      client.isAlive = true;
    });
    socket.on('message', (payload: Buffer) => {
      try {
        const frame = JSON.parse(payload.toString()) as { type?: string };
        if (frame.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', sessionId }));
        }
      } catch (error: unknown) {
        logger.warn('Ignoring invalid websocket frame', error);
      }
    });
    socket.on('close', () => {
      clients.delete(socket);
    });
    socket.on('error', (error: Error) => {
      logger.warn('Websocket client error', error);
    });
    void request;
    }
  );

  const heartbeat = setInterval(() => {
    for (const client of clients.values()) {
      if (!client.isAlive) {
        client.socket.terminate();
        clients.delete(client.socket);
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
}
