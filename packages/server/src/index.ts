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
import { sessionsRoutes } from './routes/sessions-routes.js';
import { authService } from './services/auth-service.js';
import { sessionStore } from './services/session-store.js';
import { logger } from './utils/logger.js';
import { createWebSocketHandler } from './websocket/websocket-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webOutDir = path.resolve(__dirname, '../../web/out');

async function bootstrap() {
  await authService.ensureApiKey();
  await sessionStore.cleanupStaleSessions();

  const app = express();
  const server = http.createServer(app);
  const websocketHandler = createWebSocketHandler();

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
  app.use('/api/sessions', optionalLocalAuth, sessionsRoutes);
  app.use('/api/config', optionalLocalAuth, configRoutes);

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
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', error);
  process.exitCode = 1;
});
