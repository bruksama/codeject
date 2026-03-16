'use client';

import {
  type ClientWebSocketMessage,
  type ConnectionStatus,
  type ServerWebSocketMessage,
} from '@codeject/shared';

interface WebSocketClientOptions {
  onError?: (message: string) => void;
  onMessage?: (message: ServerWebSocketMessage) => void;
  onStatus?: (status: ConnectionStatus) => void;
}

export class WebSocketClient {
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private socket: WebSocket | null = null;
  private readonly queue: ClientWebSocketMessage[] = [];
  private manuallyClosed = false;

  constructor(
    private readonly url: string,
    private readonly options: WebSocketClientOptions
  ) {}

  connect() {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    this.manuallyClosed = false;
    this.options.onStatus?.('connecting');

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      this.flushQueue();
    });

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as ServerWebSocketMessage;
        if (message.type === 'terminal:ready') {
          this.options.onStatus?.('connected');
        }
        if (message.type === 'terminal:status') {
          this.options.onStatus?.(message.status);
        }
        if (message.type === 'terminal:error') {
          this.options.onError?.(message.message);
        }
        this.options.onMessage?.(message);
      } catch {
        this.options.onError?.('Invalid websocket frame');
      }
    });

    socket.addEventListener('close', () => {
      this.socket = null;
      if (this.manuallyClosed) {
        this.options.onStatus?.('disconnected');
        return;
      }
      this.options.onStatus?.('connecting');
      this.scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      this.options.onError?.('WebSocket connection failed');
      this.options.onStatus?.('error');
    });
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
    const delay = Math.min(1_000 * 2 ** this.reconnectAttempts, 10_000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
