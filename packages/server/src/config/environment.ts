import dotenv from 'dotenv';
import os from 'node:os';
import path from 'node:path';

dotenv.config();

const DEFAULT_PORT = 3500;
const DEFAULT_HOST = '0.0.0.0';

const codejectHome = process.env.CODEJECT_HOME ?? path.join(os.homedir(), '.codeject');
const sessionsDir = path.join(codejectHome, 'sessions');
const configFile = path.join(codejectHome, 'config.json');

export const environment = {
  cliIdleTimeoutMs: 60 * 60 * 1000,
  codejectHome,
  configFile,
  host: process.env.HOST ?? DEFAULT_HOST,
  isDevelopment: process.env.NODE_ENV !== 'production',
  port: Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10),
  sessionsDir,
  staleSessionMs: 24 * 60 * 60 * 1000,
  websocketHeartbeatMs: 30_000,
};
