import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerWebSocketMessage } from '@codeject/shared';
import { WebSocketClient } from '@/lib/websocket-client';

type Listener = (event?: Event | { data: string }) => void;

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly listeners = new Map<string, Listener[]>();
  readonly sent: string[] = [];
  readyState = MockWebSocket.CONNECTING;

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close');
  }

  send(data: string) {
    this.sent.push(data);
  }

  emitOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.emit('open');
  }

  emitError() {
    this.emit('error');
  }

  emitMessage(message: ServerWebSocketMessage | Record<string, unknown> | string) {
    const data = typeof message === 'string' ? message : JSON.stringify(message);
    this.emit('message', { data });
  }

  emitServerClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close');
  }

  private emit(type: string, event?: Event | { data: string }) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function createReadyMessage(): ServerWebSocketMessage {
  return {
    type: 'terminal:ready',
    chatState: { phase: 'idle' },
    sessionId: 'session-1',
    status: 'connected',
    surfaceMode: 'chat',
    surfaceRequirement: 'terminal-available',
    terminal: { sessionName: 'tmux-1' },
  };
}

describe('WebSocketClient', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('queues messages until the socket opens and then flushes them', () => {
    const client = new WebSocketClient('ws://example.test/ws/session-1', {});

    client.send({ type: 'chat:prompt', content: 'hello' });

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].sent).toEqual([]);

    MockWebSocket.instances[0].emitOpen();

    expect(MockWebSocket.instances[0].sent).toEqual([
      JSON.stringify({ type: 'chat:prompt', content: 'hello' }),
    ]);
  });

  it('resolves the reconnect URL again before each retry', () => {
    const urls = ['ws://example.test/ws/old', 'ws://example.test/ws/new'];
    const client = new WebSocketClient(() => urls[0], {});

    client.connect();
    expect(MockWebSocket.instances[0].url).toBe('ws://example.test/ws/old');

    urls.shift();
    MockWebSocket.instances[0].emitServerClose();
    vi.advanceTimersByTime(1_000);

    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[1].url).toBe('ws://example.test/ws/new');
  });

  it('reports disconnection and reconnect attempts after an unexpected close', () => {
    const onStatus = vi.fn();
    const onReconnectAttempt = vi.fn();
    const client = new WebSocketClient('ws://example.test/ws/session-1', {
      onReconnectAttempt,
      onStatus,
    });

    client.connect();
    MockWebSocket.instances[0].emitMessage(createReadyMessage());
    MockWebSocket.instances[0].emitServerClose();
    vi.advanceTimersByTime(1_000);

    expect(onStatus.mock.calls.map(([status]) => status)).toEqual([
      'connecting',
      'connected',
      'disconnected',
      'connecting',
    ]);
    expect(onReconnectAttempt).toHaveBeenCalledWith(1);
  });

  it('does not reconnect after a manual disconnect', () => {
    const onStatus = vi.fn();
    const client = new WebSocketClient('ws://example.test/ws/session-1', { onStatus });

    client.connect();
    MockWebSocket.instances[0].emitOpen();
    client.disconnect();
    vi.advanceTimersByTime(10_000);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(onStatus).toHaveBeenLastCalledWith('disconnected');
  });

  it('reports invalid websocket frames only', () => {
    const onError = vi.fn();
    const client = new WebSocketClient('ws://example.test/ws/session-1', { onError });

    client.connect();
    MockWebSocket.instances[0].emitMessage('{');
    MockWebSocket.instances[0].emitError();

    expect(onError).toHaveBeenCalledWith('Invalid websocket frame', 'transport');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('treats invalid structured websocket frames as transport failures', () => {
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onStatus = vi.fn();
    const client = new WebSocketClient('ws://example.test/ws/session-1', {
      onError,
      onMessage,
      onStatus,
    });

    client.connect();
    MockWebSocket.instances[0].emitOpen();
    MockWebSocket.instances[0].emitMessage({
      status: 'bogus',
      type: 'terminal:status',
    });

    expect(onError).toHaveBeenCalledWith('Invalid websocket frame', 'transport');
    expect(onMessage).not.toHaveBeenCalled();
    expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.CLOSED);
    expect(onStatus).toHaveBeenCalledWith('disconnected');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('classifies terminal errors as session errors', () => {
    const onError = vi.fn();
    const client = new WebSocketClient('ws://example.test/ws/session-1', { onError });

    client.connect();
    MockWebSocket.instances[0].emitMessage({
      type: 'terminal:error',
      message: 'Terminal session is not active',
    });

    expect(onError).toHaveBeenCalledWith('Terminal session is not active', 'session');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('ignores stale socket events after a reconnect creates a new current socket', () => {
    const onMessage = vi.fn();
    const onStatus = vi.fn();
    const client = new WebSocketClient('ws://example.test/ws/session-1', {
      onMessage,
      onStatus,
    });

    client.connect();
    const firstSocket = MockWebSocket.instances[0];
    firstSocket.emitServerClose();
    vi.advanceTimersByTime(1_000);

    expect(MockWebSocket.instances).toHaveLength(2);
    const secondSocket = MockWebSocket.instances[1];
    secondSocket.emitMessage(createReadyMessage());

    firstSocket.emitMessage(createReadyMessage());
    firstSocket.emitServerClose();

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onStatus.mock.calls.map(([status]) => status)).toEqual([
      'connecting',
      'disconnected',
      'connecting',
      'connected',
    ]);
  });
});
