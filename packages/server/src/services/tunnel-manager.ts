import { spawn, type ChildProcess } from 'node:child_process';
import { authService } from './auth-service.js';
import { configStore, type StoredRemoteAccessConfig, type TunnelLifecycleState } from './config-store.js';
import { environment } from '../config/environment.js';
import { logger } from '../utils/logger.js';

const TUNNEL_URL_PATTERN = /(https:\/\/[a-z0-9.-]+\.trycloudflare\.com)/i;

export interface TunnelStatus {
  authConfigured: boolean;
  autoStart: boolean;
  binaryAvailable: boolean;
  canStart: boolean;
  isDevelopment: boolean;
  lastError?: string;
  managedPid?: number;
  publicUrl?: string;
  startedAt?: string;
  status: TunnelLifecycleState;
}

export class TunnelManagerError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export class TunnelManager {
  private child: ChildProcess | null = null;
  private stopRequested = false;

  async initialize() {
    await this.cleanupStaleManagedProcess();
    if (!environment.tunnelAutoStart || environment.isDevelopment) {
      return;
    }
    const remoteAccess = await configStore.getRemoteAccess();
    if (remoteAccess.autoStart) {
      await this.start();
    }
  }

  async getStatus(): Promise<TunnelStatus> {
    const remoteAccess = await configStore.getRemoteAccess();
    const authConfigured = await authService.hasApiKey();
    const binaryAvailable = await this.isBinaryAvailable();

    return {
      authConfigured,
      autoStart: remoteAccess.autoStart,
      binaryAvailable,
      canStart: authConfigured && binaryAvailable,
      isDevelopment: environment.isDevelopment,
      lastError: remoteAccess.lastError ?? undefined,
      managedPid: remoteAccess.managedPid ?? undefined,
      publicUrl: remoteAccess.tunnelUrl ?? undefined,
      startedAt: remoteAccess.startedAt ?? undefined,
      status: remoteAccess.tunnelStatus,
    };
  }

  async start() {
    const current = await configStore.getRemoteAccess();
    if (this.child || current.tunnelStatus === 'starting' || current.tunnelStatus === 'active') {
      return this.getStatus();
    }
    if (!(await authService.hasApiKey())) {
      throw new TunnelManagerError('Remote auth must be configured before starting the tunnel.', 409);
    }
    if (!(await this.isBinaryAvailable())) {
      throw new TunnelManagerError('cloudflared is not installed or not available on PATH.', 400);
    }

    await this.cleanupStaleManagedProcess();
    await configStore.setRemoteAccess({
      enabled: true,
      lastError: null,
      managedPid: null,
      startedAt: null,
      tunnelStatus: 'starting',
      tunnelUrl: null,
    });

    return new Promise<TunnelStatus>((resolve, reject) => {
      let settled = false;
      this.stopRequested = false;
      const child = spawn(
        environment.tunnelBinary,
        ['tunnel', '--no-autoupdate', '--url', environment.tunnelTargetUrl],
        {
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      this.child = child;
      void configStore.setRemoteAccess({
        enabled: true,
        managedPid: child.pid ?? null,
      });

      const handleChunk = (chunk: Buffer) => {
        const text = chunk.toString();
        const matchedUrl = text.match(TUNNEL_URL_PATTERN)?.[1];
        if (!matchedUrl || settled) {
          return;
        }
        settled = true;
        void configStore.setRemoteAccess({
          enabled: true,
          lastError: null,
          managedPid: child.pid ?? null,
          startedAt: new Date().toISOString(),
          tunnelStatus: 'active',
          tunnelUrl: matchedUrl,
        });
        resolve(this.getStatus());
      };

      child.stdout.on('data', handleChunk);
      child.stderr.on('data', handleChunk);
      child.on('error', (error) => {
        const message = error.message || 'Failed to start cloudflared.';
        this.child = null;
        void configStore.setRemoteAccess({
          enabled: false,
          lastError: message,
          managedPid: null,
          startedAt: null,
          tunnelStatus: 'error',
          tunnelUrl: null,
        });
        if (!settled) {
          settled = true;
          reject(new TunnelManagerError(message, 500));
        }
      });
      child.on('exit', (code, signal) => {
        const message = this.stopRequested
          ? null
          : `cloudflared exited before tunnel became active${code !== null ? ` (code ${code})` : ''}${
              signal ? ` (${signal})` : ''
            }.`;
        this.child = null;
        void configStore.setRemoteAccess({
          enabled: false,
          lastError: message,
          managedPid: null,
          startedAt: null,
          tunnelStatus: this.stopRequested ? 'inactive' : 'error',
          tunnelUrl: null,
        });
        if (!settled) {
          settled = true;
          reject(new TunnelManagerError(message ?? 'Tunnel stopped.', this.stopRequested ? 200 : 500));
          return;
        }
        if (!this.stopRequested) {
          logger.warn('Managed tunnel exited unexpectedly', { code, signal });
        }
      });
    });
  }

  async stop() {
    const child = this.child;
    if (!child) {
      await configStore.setRemoteAccess({
        enabled: false,
        lastError: null,
        managedPid: null,
        startedAt: null,
        tunnelStatus: 'inactive',
        tunnelUrl: null,
      });
      return this.getStatus();
    }

    this.stopRequested = true;
    await configStore.setRemoteAccess({
      enabled: false,
      tunnelStatus: 'stopping',
    });

    child.kill('SIGTERM');
    await this.waitForProcessExit(child.pid ?? null);
    this.child = null;
    await configStore.setRemoteAccess({
      enabled: false,
      lastError: null,
      managedPid: null,
      startedAt: null,
      tunnelStatus: 'inactive',
      tunnelUrl: null,
    });
    return this.getStatus();
  }

  async restart() {
    await this.stop();
    return this.start();
  }

  async shutdown() {
    if (!this.child) {
      return;
    }
    try {
      await this.stop();
    } catch (error) {
      logger.warn('Tunnel shutdown failed', error);
    }
  }

  private async cleanupStaleManagedProcess() {
    const remoteAccess = await configStore.getRemoteAccess();
    if (!remoteAccess.managedPid) {
      await this.resetPersistedTunnelState(remoteAccess);
      return;
    }

    if (this.isProcessRunning(remoteAccess.managedPid)) {
      logger.info('Cleaning stale managed tunnel process', { pid: remoteAccess.managedPid });
      process.kill(remoteAccess.managedPid, 'SIGTERM');
      await this.waitForProcessExit(remoteAccess.managedPid);
    }

    await this.resetPersistedTunnelState(remoteAccess);
  }

  private async resetPersistedTunnelState(remoteAccess: StoredRemoteAccessConfig) {
    if (
      remoteAccess.tunnelStatus === 'inactive' &&
      !remoteAccess.managedPid &&
      !remoteAccess.tunnelUrl &&
      !remoteAccess.startedAt &&
      !remoteAccess.lastError
    ) {
      return;
    }
    await configStore.setRemoteAccess({
      enabled: false,
      lastError: null,
      managedPid: null,
      startedAt: null,
      tunnelStatus: 'inactive',
      tunnelUrl: null,
    });
  }

  private async isBinaryAvailable() {
    return new Promise<boolean>((resolve) => {
      const child = spawn(environment.tunnelBinary, ['--version'], { stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.on('exit', (code) => resolve(code === 0));
    });
  }

  private isProcessRunning(pid: number) {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private async waitForProcessExit(pid: number | null) {
    if (!pid) {
      return;
    }
    const timeoutAt = Date.now() + environment.tunnelShutdownTimeoutMs;
    while (Date.now() < timeoutAt) {
      if (!this.isProcessRunning(pid)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (this.isProcessRunning(pid)) {
      process.kill(pid, 'SIGKILL');
    }
  }
}
