import { spawn, type ChildProcess } from 'node:child_process';
import type { TunnelLifecycleState, TunnelMode } from '@codeject/shared';
import { authService } from './auth-service.js';
import { configStore, type StoredRemoteAccessConfig } from './config-store.js';
import { environment } from '../config/environment.js';
import { logger } from '../utils/logger.js';

const TUNNEL_URL_PATTERN = /(https:\/\/[a-z0-9.-]+\.trycloudflare\.com)/i;
const MAX_TUNNEL_LOG_LINES = 12;
const NAMED_TUNNEL_STARTUP_GRACE_MS = 1_200;

export interface TunnelStatus {
  authConfigured: boolean;
  autoStart: boolean;
  binaryAvailable: boolean;
  canStart: boolean;
  isDevelopment: boolean;
  lastError?: string;
  managedPid?: number;
  namedTunnelHostname?: string;
  namedTunnelTokenConfigured: boolean;
  publicUrl?: string;
  startedAt?: string;
  tunnelMode: TunnelMode;
  status: TunnelLifecycleState;
}

interface TunnelConfigurationInput {
  namedTunnelHostname?: string;
  namedTunnelToken?: string;
  tunnelMode: TunnelMode;
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
    const remoteAccess = await configStore.getRemoteAccess();
    // Auto-start is intentionally scoped to named tunnels only.
    // Quick tunnels are ephemeral and should remain manual.
    if (remoteAccess.autoStart && remoteAccess.tunnelMode === 'named-token') {
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
      canStart: authConfigured && binaryAvailable && this.hasTunnelConfiguration(remoteAccess),
      isDevelopment: environment.isDevelopment,
      lastError: remoteAccess.lastError ?? undefined,
      managedPid: remoteAccess.managedPid ?? undefined,
      namedTunnelHostname: remoteAccess.namedTunnelHostname ?? undefined,
      namedTunnelTokenConfigured: Boolean(remoteAccess.namedTunnelToken),
      publicUrl: this.getPublicUrl(remoteAccess),
      startedAt: remoteAccess.startedAt ?? undefined,
      tunnelMode: remoteAccess.tunnelMode,
      status: remoteAccess.tunnelStatus,
    };
  }

  async setAutoStart(autoStart: boolean) {
    const current = await configStore.getRemoteAccess();
    if (autoStart && current.tunnelMode !== 'named-token') {
      throw new TunnelManagerError('Auto-start is only available for named tunnel mode.', 409);
    }
    if (autoStart && (!current.namedTunnelHostname || !current.namedTunnelToken)) {
      throw new TunnelManagerError(
        'Save the named tunnel hostname and token before enabling auto-start.',
        409
      );
    }
    await configStore.setRemoteAccess({ autoStart });
    return this.getStatus();
  }

  async updateConfiguration(input: TunnelConfigurationInput) {
    const current = await configStore.getRemoteAccess();
    if (current.tunnelStatus !== 'inactive' && current.tunnelStatus !== 'error') {
      throw new TunnelManagerError('Stop remote access before changing tunnel configuration.', 409);
    }

    const nextMode = input.tunnelMode;
    const nextHostname =
      nextMode === 'named-token'
        ? normalizeHostname(input.namedTunnelHostname ?? current.namedTunnelHostname ?? '')
        : null;
    const nextToken =
      nextMode === 'named-token'
        ? normalizeSecretValue(input.namedTunnelToken, current.namedTunnelToken)
        : null;
    const nextAutoStart =
      nextMode === 'named-token' && Boolean(nextHostname && nextToken) ? current.autoStart : false;

    await configStore.setRemoteAccess({
      autoStart: nextAutoStart,
      enabled: false,
      lastError: null,
      namedTunnelHostname: nextHostname,
      namedTunnelToken: nextToken,
      tunnelMode: nextMode,
      tunnelUrl: null,
    });

    return this.getStatus();
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
    this.assertStartConfiguration(current);

    await this.cleanupStaleManagedProcess();
    const nextRemoteAccess = await configStore.getRemoteAccess();
    const command = this.buildTunnelCommand(nextRemoteAccess);

    await configStore.setRemoteAccess({
      enabled: true,
      lastError: null,
      managedPid: null,
      startedAt: null,
      tunnelStatus: 'starting',
      tunnelUrl: nextRemoteAccess.tunnelMode === 'quick' ? null : nextRemoteAccess.tunnelUrl,
    });

    return new Promise<TunnelStatus>((resolve, reject) => {
      let settled = false;
      this.stopRequested = false;
      const logLines: string[] = [];
      const child = spawn(environment.tunnelBinary, command.args, {
        env: command.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.child = child;
      void configStore.setRemoteAccess({
        enabled: true,
        managedPid: child.pid ?? null,
      });

      const markActive = async (publicUrl: string | null) => {
        if (settled) {
          return;
        }
        settled = true;
        await configStore.setRemoteAccess({
          enabled: true,
          lastError: null,
          managedPid: child.pid ?? null,
          startedAt: new Date().toISOString(),
          tunnelStatus: 'active',
          tunnelUrl: publicUrl,
        });
        resolve(await this.getStatus());
      };

      const handleChunk = (chunk: Buffer) => {
        for (const line of sanitizeTunnelLog(chunk.toString(), nextRemoteAccess.namedTunnelToken)) {
          logLines.push(line);
        }
        if (logLines.length > MAX_TUNNEL_LOG_LINES) {
          logLines.splice(0, logLines.length - MAX_TUNNEL_LOG_LINES);
        }

        if (nextRemoteAccess.tunnelMode === 'quick' && !settled) {
          const matchedUrl = chunk.toString().match(TUNNEL_URL_PATTERN)?.[1];
          if (matchedUrl) {
            void markActive(matchedUrl);
          }
        }
      };

      child.stdout.on('data', handleChunk);
      child.stderr.on('data', handleChunk);
      child.on('spawn', () => {
        if (nextRemoteAccess.tunnelMode === 'named-token') {
          setTimeout(() => {
            void markActive(null);
          }, NAMED_TUNNEL_STARTUP_GRACE_MS);
        }
      });
      child.on('error', (error) => {
        const message =
          selectTunnelErrorMessage(logLines) ?? error.message ?? 'Failed to start cloudflared.';
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
          : selectTunnelErrorMessage(logLines) ??
            `cloudflared exited${code !== null ? ` (code ${code})` : ''}${signal ? ` (${signal})` : ''}.`;
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

  private buildTunnelCommand(remoteAccess: StoredRemoteAccessConfig) {
    if (remoteAccess.tunnelMode === 'named-token') {
      return {
        args: ['tunnel', '--no-autoupdate', 'run'],
        env: {
          ...process.env,
          TUNNEL_TOKEN: remoteAccess.namedTunnelToken ?? '',
        },
      };
    }

    return {
      args: ['tunnel', '--no-autoupdate', '--url', environment.tunnelTargetUrl],
      env: process.env,
    };
  }

  private getPublicUrl(remoteAccess: StoredRemoteAccessConfig) {
    if (remoteAccess.tunnelMode === 'named-token') {
      return remoteAccess.namedTunnelHostname
        ? normalizePublicUrl(remoteAccess.namedTunnelHostname)
        : undefined;
    }

    return remoteAccess.tunnelUrl ?? undefined;
  }

  private hasTunnelConfiguration(remoteAccess: StoredRemoteAccessConfig) {
    if (remoteAccess.tunnelMode === 'named-token') {
      return Boolean(remoteAccess.namedTunnelHostname && remoteAccess.namedTunnelToken);
    }

    return true;
  }

  private assertStartConfiguration(remoteAccess: StoredRemoteAccessConfig) {
    if (remoteAccess.tunnelMode !== 'named-token') {
      return;
    }

    if (!remoteAccess.namedTunnelHostname) {
      throw new TunnelManagerError('Named tunnel hostname is required for named tunnel mode.', 409);
    }
    if (!remoteAccess.namedTunnelToken) {
      throw new TunnelManagerError('Named tunnel token is required for named tunnel mode.', 409);
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

function sanitizeTunnelLog(output: string, token?: string | null) {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (token ? line.replaceAll(token, '[redacted]') : line));
}

function selectTunnelErrorMessage(logLines: string[]) {
  const relevantLines = logLines.filter(
    (line) =>
      !/^\d{4}-\d{2}-\d{2}T/u.test(line) &&
      !line.startsWith('INF ') &&
      !line.startsWith('WRN ') &&
      !line.startsWith("See 'cloudflared tunnel run --help'.")
  );

  return relevantLines.at(-1) ?? logLines.at(-1);
}

function normalizeHostname(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimTrailingSlash(normalizePublicUrl(trimmed)) : null;
}

function normalizePublicUrl(value: string) {
  return value.includes('://') ? value : `https://${value}`;
}

function normalizeSecretValue(nextValue: string | undefined, currentValue: string | null) {
  if (nextValue === undefined) {
    return currentValue;
  }

  const trimmed = nextValue.trim();
  return trimmed.length ? trimmed : null;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/u, '');
}
