import { Router, type Response } from 'express';
import { TunnelManager, TunnelManagerError } from '../services/tunnel-manager.js';
import type { TunnelMode } from '@codeject/shared';

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

  router.put('/config', async (request, response) => {
    await runTunnelAction(response, () =>
      tunnelManager.updateConfiguration(validateTunnelConfigInput(request.body))
    );
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

function validateTunnelConfigInput(body: unknown) {
  const input = typeof body === 'object' && body ? body : {};
  const tunnelMode = readTunnelMode(input);
  const namedTunnelHostname = readOptionalString(input, 'namedTunnelHostname');
  const namedTunnelToken = readOptionalString(input, 'namedTunnelToken');

  if (tunnelMode === 'named-token' && namedTunnelHostname && !isHostnameLike(namedTunnelHostname)) {
    throw new TunnelManagerError('Named tunnel hostname must be a valid hostname or URL.', 400);
  }

  return {
    namedTunnelHostname,
    namedTunnelToken,
    tunnelMode,
  };
}

function readTunnelMode(input: object) {
  const tunnelMode = Reflect.get(input, 'tunnelMode');
  if (tunnelMode === 'quick' || tunnelMode === 'named-token') {
    return tunnelMode as TunnelMode;
  }
  throw new TunnelManagerError('Tunnel mode must be `quick` or `named-token`.', 400);
}

function readOptionalString(input: object, key: string) {
  const value = Reflect.get(input, key);
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new TunnelManagerError(`${key} must be a string.`, 400);
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : '';
}

function isHostnameLike(value: string) {
  try {
    const normalized = value.includes('://') ? value : `https://${value}`;
    const url = new URL(normalized);
    return Boolean(url.hostname);
  } catch {
    return false;
  }
}
