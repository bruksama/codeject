import assert from 'node:assert/strict';
import test from 'node:test';
import { type ProviderStopSignal, type Session } from '@codeject/shared';
import { createInternalProviderHooksRoutes } from './internal-provider-hooks-routes.js';

class TestSessionStore {
  constructor(private readonly session: Session | null) {}

  async getSession(sessionId: string) {
    return this.session?.id === sessionId ? structuredClone(this.session) : null;
  }
}

class TestSessionSupervisor {
  lastSignal: ProviderStopSignal | null = null;

  async handleProviderStopSignal(_sessionId: string, signal: ProviderStopSignal) {
    this.lastSignal = signal;
    return true;
  }
}

test('internal provider hook route validates auth, payload, and provider match', async () => {
  const now = new Date('2026-04-03T03:40:00.000Z');
  const session: Session = {
    cliProgram: { command: 'codex', icon: 'bot', id: 'codex', name: 'Codex' },
    createdAt: now,
    id: 'session-1',
    lastMessageAt: now,
    messages: [],
    name: 'Codex Session',
    providerRuntime: { hookToken: 'secret-token', provider: 'codex' },
    status: 'connected',
    surfaceMode: 'chat',
    surfaceRequirement: 'terminal-available',
    workspacePath: '/tmp/codeject',
  };
  const store = new TestSessionStore(session);
  const supervisor = new TestSessionSupervisor();
  const router = createInternalProviderHooksRoutes(store as never, supervisor as never);
  const handler = router.stack[0]?.route?.stack[0]?.handle as
    | ((request: TestRequest, response: TestResponse, next: () => void) => Promise<void> | void)
    | undefined;

  if (typeof handler !== 'function') {
    throw new Error('Expected provider-stop route handler');
  }

  const missingAuth = await invokeHandler(handler, undefined, {
    event: 'stop',
    provider: 'codex',
    sessionId: 'session-1',
  });
  assert.equal(missingAuth.statusCode, 401);

  const invalidBody = await invokeHandler(handler, 'Bearer secret-token', {
    event: 'stop',
    provider: 'invalid',
    sessionId: 'session-1',
  });
  assert.equal(invalidBody.statusCode, 400);

  const providerMismatch = await invokeHandler(handler, 'Bearer secret-token', {
    event: 'stop',
    provider: 'claude',
    sessionId: 'session-1',
  });
  assert.equal(providerMismatch.statusCode, 409);

  const accepted = await invokeHandler(handler, 'Bearer secret-token', {
    event: 'stop',
    provider: 'codex',
    providerTurnId: 'turn-1',
    sessionId: 'session-1',
  });
  assert.equal(accepted.statusCode, 202);
  assert.deepEqual(accepted.body, { ok: true });
  assert.equal(supervisor.lastSignal?.providerTurnId, 'turn-1');
});

async function invokeHandler(
  handler: (
    request: TestRequest,
    response: TestResponse,
    next: () => void
  ) => Promise<void> | void,
  authorization: string | undefined,
  body: Record<string, unknown>
) {
  const response = new TestResponse();
  const request = new TestRequest(authorization, body);
  await handler(request, response, () => undefined);
  return response;
}

class TestRequest {
  constructor(
    public readonly authorization: string | undefined,
    public readonly body: Record<string, unknown>
  ) {}

  header(name: string) {
    return name.toLowerCase() === 'authorization' ? this.authorization : undefined;
  }
}

class TestResponse {
  body: Record<string, unknown> | null = null;
  statusCode = 200;

  json(payload: Record<string, unknown>) {
    this.body = payload;
    return this;
  }

  status(statusCode: number) {
    this.statusCode = statusCode;
    return this;
  }
}
