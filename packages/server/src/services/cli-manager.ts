import { EventEmitter } from 'node:events';
import { spawn, type IPty } from 'node-pty';
import { type CliProgram, type CliSessionOptions, type Session, type TerminalSize } from '@codeject/shared';
import { ClaudeCodeAdapter } from '../adapters/claude-code-adapter.js';
import { CodexAdapter } from '../adapters/codex-adapter.js';
import { GenericCliAdapter } from '../adapters/generic-cli-adapter.js';
import { expandHomePath, type BaseCliAdapter } from '../adapters/base-cli-adapter.js';
import { logger } from '../utils/logger.js';
import { sanitizeOutput } from '../utils/output-sanitizer.js';

interface CliSessionRuntime {
  buffer: string[];
  idleTimer: NodeJS.Timeout | null;
  lastActivityAt: number;
  pty: IPty;
  session: Session;
}

interface CliManagerEvents {
  exit: [sessionId: string, code: number | null, signal?: number | null];
  output: [sessionId: string, chunk: string];
}

const MAX_BUFFER_CHUNKS = 200;

export class CliManager extends EventEmitter<CliManagerEvents> {
  private readonly adapters: BaseCliAdapter[] = [
    new ClaudeCodeAdapter(),
    new CodexAdapter(),
    new GenericCliAdapter(),
  ];

  private readonly runtimes = new Map<string, CliSessionRuntime>();

  constructor(private readonly idleTimeoutMs: number) {
    super();
  }

  ensureSession(session: Session) {
    const runtime = this.runtimes.get(session.id);
    if (runtime) {
      runtime.session = session;
      this.touch(session.id);
      return runtime;
    }

    const adapter = this.resolveAdapter(session.cliProgram);
    const spawnConfig = adapter.createSpawnConfig(session.cliProgram, session.sessionOptions);
    const pty = spawn(spawnConfig.command, spawnConfig.args, {
      cols: spawnConfig.ptyOptions?.cols ?? session.sessionOptions?.terminal?.cols ?? 120,
      cwd: expandHomePath(session.workspacePath),
      env: {
        ...process.env,
        ...spawnConfig.env,
      },
      name: spawnConfig.ptyOptions?.name ?? 'xterm-256color',
      rows: spawnConfig.ptyOptions?.rows ?? session.sessionOptions?.terminal?.rows ?? 32,
    });

    const nextRuntime: CliSessionRuntime = {
      buffer: [],
      idleTimer: null,
      lastActivityAt: Date.now(),
      pty,
      session,
    };
    this.runtimes.set(session.id, nextRuntime);

    pty.onData((rawChunk) => {
      const chunk = sanitizeOutput(rawChunk);
      if (!chunk) return;
      nextRuntime.buffer.push(chunk);
      if (nextRuntime.buffer.length > MAX_BUFFER_CHUNKS) {
        nextRuntime.buffer.shift();
      }
      this.touch(session.id);
      this.emit('output', session.id, chunk);
    });

    pty.onExit(({ exitCode, signal }) => {
      this.clearIdleTimer(nextRuntime);
      this.runtimes.delete(session.id);
      this.emit('exit', session.id, exitCode, signal);
    });

    this.touch(session.id);
    logger.info(`Spawned CLI session ${session.id}`, {
      adapter: adapter.name,
      command: spawnConfig.command,
      workspacePath: session.workspacePath,
    });

    return nextRuntime;
  }

  getBufferedOutput(sessionId: string) {
    return this.runtimes.get(sessionId)?.buffer.join('') ?? '';
  }

  resize(sessionId: string, size: Partial<TerminalSize>) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return;
    runtime.pty.resize(size.cols ?? 120, size.rows ?? 32);
    this.touch(sessionId);
  }

  sendInput(sessionId: string, input: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return false;
    runtime.pty.write(input);
    this.touch(sessionId);
    return true;
  }

  sendSignal(sessionId: string, signal: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return false;
    runtime.pty.kill(signal);
    this.touch(sessionId);
    return true;
  }

  stopSession(sessionId: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return;
    this.clearIdleTimer(runtime);
    runtime.pty.kill();
    this.runtimes.delete(sessionId);
  }

  hasSession(sessionId: string) {
    return this.runtimes.has(sessionId);
  }

  private resolveAdapter(program: CliProgram) {
    return this.adapters.find((adapter) => adapter.canHandle(program)) ?? this.adapters[this.adapters.length - 1]!;
  }

  private touch(sessionId: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return;
    runtime.lastActivityAt = Date.now();
    this.clearIdleTimer(runtime);
    runtime.idleTimer = setTimeout(() => {
      logger.info(`Stopping idle CLI session ${sessionId}`);
      this.stopSession(sessionId);
    }, this.idleTimeoutMs);
  }

  private clearIdleTimer(runtime: CliSessionRuntime) {
    if (!runtime.idleTimer) return;
    clearTimeout(runtime.idleTimer);
    runtime.idleTimer = null;
  }
}
