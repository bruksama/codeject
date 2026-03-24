'use client';

import {
  ServerWebSocketMessageSchema,
  type ClientWebSocketMessage,
  type ConnectionStatus,
  type ServerWebSocketMessage,
} from '@codeject/shared';

export type WebSocketErrorKind = 'session' | 'transport';

interface WebSocketClientOptions {
  onError?: (message: string, kind: WebSocketErrorKind) => void;
  onMessage?: (message: ServerWebSocketMessage) => void;
  onReconnectAttempt?: (attempt: number) => void;
  onStatus?: (status: ConnectionStatus) => void;
}

export class WebSocketClient {
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private socket: WebSocket | null = null;
  private readonly queue: ClientWebSocketMessage[] = [];
  private manuallyClosed = false;

  constructor(
    private readonly url: string | (() => string),
    private readonly options: WebSocketClientOptions
  ) {}

  connect() {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    this.manuallyClosed = false;
    this.options.onStatus?.('connecting');

    const socket = new WebSocket(this.resolveUrl());
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      this.flushQueue();
    });

    socket.addEventListener('message', (event) => {
      try {
        const rawMessage = JSON.parse(event.data);
        const parsedMessage = ServerWebSocketMessageSchema.safeParse(rawMessage);
        if (!parsedMessage.success) {
          console.warn('Invalid server websocket frame', parsedMessage.error.flatten());
          this.options.onError?.('Invalid websocket frame', 'transport');
          if (socket.readyState <= WebSocket.OPEN) {
            socket.close();
          }
          return;
        }

        const message: ServerWebSocketMessage = parsedMessage.data;
        if (message.type === 'terminal:ready') {
          this.options.onStatus?.('connected');
        }
        if (message.type === 'terminal:status') {
          this.options.onStatus?.(message.status);
        }
        if (message.type === 'terminal:error') {
          this.options.onError?.(message.message, 'session');
        }
        this.options.onMessage?.(message);
      } catch (error) {
        console.warn('Invalid websocket frame', error);
        this.options.onError?.('Invalid websocket frame', 'transport');
        if (socket.readyState <= WebSocket.OPEN) {
          socket.close();
        }
      }
    });

    socket.addEventListener('close', () => {
      this.socket = null;
      this.options.onStatus?.('disconnected');
      if (this.manuallyClosed) {
        return;
      }
      this.scheduleReconnect();
    });

    socket.addEventListener('error', () => undefined);
  }

  disconnect() {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  reconnect() {
    this.disconnect();
    this.manuallyClosed = false;
    this.connect();
  }

  send(message: ClientWebSocketMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return;
    }

    this.queue.push(message);
    if (!this.socket || this.socket.readyState >= WebSocket.CLOSING) {
      this.connect();
    }
  }

  private flushQueue() {
    while (this.queue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const next = this.queue.shift();
      if (next) {
        this.socket.send(JSON.stringify(next));
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const attempt = this.reconnectAttempts + 1;
    const delay = Math.min(1_000 * 2 ** (attempt - 1), 10_000);
    this.reconnectAttempts = attempt;
    this.options.onReconnectAttempt?.(attempt);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private resolveUrl() {
    return typeof this.url === 'function' ? this.url() : this.url;
  }
}
