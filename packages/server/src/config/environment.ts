import dotenv from 'dotenv';
import os from 'node:os';
import path from 'node:path';

dotenv.config();

const DEFAULT_PORT = 3500;
const DEFAULT_HOST = '0.0.0.0';
const port = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);

const codejectHome = process.env.CODEJECT_HOME ?? path.join(os.homedir(), '.codeject');
const sessionsDir = path.join(codejectHome, 'sessions');
const configFile = path.join(codejectHome, 'config.json');

export const environment = {
  cliIdleTimeoutMs: 60 * 60 * 1000,
  codejectHome,
  configFile,
  host: process.env.HOST ?? DEFAULT_HOST,
  isDevelopment: process.env.NODE_ENV !== 'production',
  port,
  sessionsDir,
  staleSessionMs: 24 * 60 * 60 * 1000,
  tunnelAutoStart: process.env.CODEJECT_TUNNEL_AUTOSTART === '1',
  tunnelBinary: process.env.CODEJECT_TUNNEL_BINARY ?? 'cloudflared',
  tunnelShutdownTimeoutMs: 5_000,
  tunnelTargetUrl: process.env.CODEJECT_TUNNEL_TARGET_URL ?? `http://127.0.0.1:${port}`,
  websocketHeartbeatMs: 30_000,
};
