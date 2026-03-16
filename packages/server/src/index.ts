import http from 'node:http';
import type net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { environment } from './config/environment.js';
import { optionalLocalAuth } from './middleware/auth-middleware.js';
import { authRoutes } from './routes/auth-routes.js';
import { configRoutes } from './routes/config-routes.js';
import { healthRoutes } from './routes/health-routes.js';
import { createSessionsRoutes } from './routes/sessions-routes.js';
import { createTunnelRoutes } from './routes/tunnel-routes.js';
import { authService } from './services/auth-service.js';
import { SessionSupervisor } from './services/session-supervisor.js';
import { sessionStore } from './services/session-store.js';
import { TerminalSessionManager } from './services/terminal-session-manager.js';
import { TunnelManager } from './services/tunnel-manager.js';
import { TmuxBridge } from './services/tmux-bridge.js';
import { logger } from './utils/logger.js';
import { createWebSocketHandler } from './websocket/websocket-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webOutDir = path.resolve(__dirname, '../../web/out');

async function bootstrap() {
  await authService.ensureApiKey();
  const tunnelManager = new TunnelManager();
  await tunnelManager.initialize();

  const app = express();
  const server = http.createServer(app);
  const tmuxBridge = new TmuxBridge();
  const terminalSessionManager = new TerminalSessionManager(
    sessionStore,
    tmuxBridge,
    environment.cliIdleTimeoutMs
  );
  const sessionSupervisor = new SessionSupervisor(sessionStore);
  const staleSessions = await sessionStore.cleanupStaleSessions();
  await terminalSessionManager.stopSessions(staleSessions);
  const websocketHandler = createWebSocketHandler({
    sessionStore,
    sessionSupervisor,
    terminalSessionManager,
  });

  app.set('trust proxy', true);
  app.use(
    cors({
      origin: ['http://localhost:4028', 'http://127.0.0.1:4028', 'http://localhost:3000'],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/sessions', optionalLocalAuth, createSessionsRoutes(terminalSessionManager));
  app.use('/api/config', optionalLocalAuth, configRoutes);
  app.use('/api/tunnel', optionalLocalAuth, createTunnelRoutes(tunnelManager));

  app.use(express.static(webOutDir, { extensions: ['html'] }));
  app.use((_request, response) => {
    response.sendFile(path.join(webOutDir, 'index.html'));
  });

  server.on('upgrade', (request, socket, head) => {
    if (!request.url?.startsWith('/ws/')) {
      socket.destroy();
      return;
    }
    void websocketHandler.upgrade(request, socket as net.Socket, head);
  });

  server.listen(environment.port, environment.host, () => {
    logger.info(`codeject server listening on http://${environment.host}:${environment.port}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    await tunnelManager.shutdown();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', error);
  process.exitCode = 1;
});
