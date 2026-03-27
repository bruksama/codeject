#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const runtimes = [
  { name: 'server', color: '\x1b[35m', args: ['run', 'dev', '-w', '@codeject/server'] },
  { name: 'web', color: '\x1b[33m', args: ['run', 'dev', '-w', '@codeject/web'] },
];

const children = new Map();
let shuttingDown = false;
let shutdownPromise = null;
let rawModeEnabled = false;

function getProcessGroupId() {
  try {
    return execFileSync('ps', ['-o', 'pgid=', '-p', String(process.pid)], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

function log(message) {
  process.stdout.write(`[dev-supervisor] ${message}\n`);
}

function teardownInput() {
  if (!rawModeEnabled || !process.stdin.isTTY) {
    return;
  }

  process.stdin.setRawMode(false);
  process.stdin.pause();
  rawModeEnabled = false;
}

function writePrefixed(stream, prefix, output) {
  const normalized = output.replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const trailing = lines.pop() ?? '';

  for (const line of lines) {
    if (line.length === 0) {
      stream.write(`${prefix}\n`);
      continue;
    }

    stream.write(`${prefix} ${line}\n`);
  }

  return trailing;
}

function pipeChildOutput(child, runtime) {
  const prefix = `${runtime.color}[${runtime.name}]\x1b[0m`;

  for (const [stream, target] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    let pending = '';

    stream.on('data', (chunk) => {
      pending += chunk.toString();
      pending = writePrefixed(target, prefix, pending);
    });

    stream.on('end', () => {
      if (pending.length > 0) {
        target.write(`${prefix} ${pending}\n`);
      }
    });
  }
}

function spawnRuntime(runtime) {
  // Detached children keep Ctrl+C owned by this supervisor, not by the workspace runners.
  const child = spawn(npmCommand, runtime.args, {
    cwd: repoRoot,
    detached: true,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  children.set(runtime.name, child);
  pipeChildOutput(child, runtime);

  child.once('error', (error) => {
    log(`${runtime.name} failed to start: ${error.message}`);
    void shutdown(1);
  });

  child.once('exit', (code, signal) => {
    children.delete(runtime.name);

    if (shuttingDown) {
      return;
    }

    const detail = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    log(`${runtime.name} exited unexpectedly with ${detail}`);
    void shutdown(code && code !== 0 ? code : 1);
  });
}

function runSafeStop() {
  const processGroupId = getProcessGroupId();

  return new Promise((resolve) => {
    const child = spawn(npmCommand, ['run', 'safe-stop'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...(processGroupId ? { SAFE_STOP_EXCLUDE_PGIDS: processGroupId } : {}),
      },
      stdio: 'inherit',
    });

    child.once('error', (error) => {
      log(`Failed to run safe-stop: ${error.message}`);
      resolve(1);
    });

    child.once('exit', (code, signal) => {
      if (signal) {
        log(`safe-stop exited from signal ${signal}`);
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });
  });
}

function shutdown(requestedExitCode = 0) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shuttingDown = true;
  teardownInput();
  log('Stopping runtime with safe-stop');

  shutdownPromise = (async () => {
    const stopCode = await runSafeStop();
    process.exit(stopCode === 0 ? requestedExitCode : 1);
  })();

  return shutdownPromise;
}

process.once('SIGINT', () => {
  log('Received SIGINT');
  void shutdown(0);
});

process.once('SIGTERM', () => {
  log('Received SIGTERM');
  void shutdown(0);
});

process.once('exit', () => {
  teardownInput();
});

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  rawModeEnabled = true;

  process.stdin.on('data', (chunk) => {
    if (!Buffer.isBuffer(chunk) || shuttingDown) {
      return;
    }

    if (chunk.includes(0x03)) {
      log('Received Ctrl+C');
      void shutdown(0);
    }
  });
}

log('Starting Codeject dev runtime');
log('Press Ctrl+C to stop cleanly');

for (const runtime of runtimes) {
  spawnRuntime(runtime);
}
