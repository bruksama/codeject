import { Router } from 'express';
import { ProviderStopSignalSchema } from '@codeject/shared';
import { getTranscriptProvider } from '../services/provider-transcript-reader.js';
import { type SessionStore } from '../services/session-store.js';
import { type SessionSupervisor } from '../services/session-supervisor.js';

export function createInternalProviderHooksRoutes(
  sessionStore: SessionStore,
  sessionSupervisor: SessionSupervisor
) {
  const router = Router();

  router.post('/provider-stop', async (request, response) => {
    const token = getBearerToken(request.header('authorization'));
    if (!token) {
      response.status(401).json({ error: 'Missing hook token' });
      return;
    }

    const payload = ProviderStopSignalSchema.safeParse(request.body);
    if (!payload.success) {
      response.status(400).json({ error: 'Invalid provider stop payload' });
      return;
    }

    const session = await sessionStore.getSession(payload.data.sessionId);
    if (!session) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.providerRuntime?.hookToken !== token) {
      response.status(401).json({ error: 'Invalid hook token' });
      return;
    }

    if (getTranscriptProvider(session) !== payload.data.provider) {
      response.status(409).json({ error: 'Provider mismatch' });
      return;
    }

    await sessionSupervisor.handleProviderStopSignal(payload.data.sessionId, payload.data);
    response.status(202).json({ ok: true });
  });

  return router;
}

function getBearerToken(authorization: string | undefined) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}
