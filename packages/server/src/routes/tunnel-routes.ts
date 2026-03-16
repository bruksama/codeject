import { Router, type Response } from 'express';
import { TunnelManager, TunnelManagerError } from '../services/tunnel-manager.js';

export function createTunnelRoutes(tunnelManager: TunnelManager) {
  const router = Router();

  router.get('/', async (_request, response) => {
    response.json({ tunnel: await tunnelManager.getStatus() });
  });

  router.post('/start', async (_request, response) => {
    await runTunnelAction(response, () => tunnelManager.start());
  });

  router.post('/stop', async (_request, response) => {
    await runTunnelAction(response, () => tunnelManager.stop());
  });

  router.post('/restart', async (_request, response) => {
    await runTunnelAction(response, () => tunnelManager.restart());
  });

  return router;
}

async function runTunnelAction(
  response: Response,
  action: () => Promise<unknown>
) {
  try {
    response.json({ tunnel: await action() });
  } catch (error) {
    if (error instanceof TunnelManagerError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    response.status(500).json({ error: error instanceof Error ? error.message : 'Tunnel action failed' });
  }
}
