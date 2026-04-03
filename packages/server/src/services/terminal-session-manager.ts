import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { spawn, type IPty } from 'node-pty';
import {
  type CliProgram,
  type ConnectionStatus,
  type Session,
  type TerminalKey,
  type TerminalSnapshot,
  type TerminalSize,
} from '@codeject/shared';
import {
  expandHomePath,
  type BaseCliAdapter,
} from '../adapters/base-cli-adapter.js';
import { ClaudeCodeAdapter } from '../adapters/claude-code-adapter.js';
import { CodexAdapter } from '../adapters/codex-adapter.js';
import { GenericCliAdapter } from '../adapters/generic-cli-adapter.js';
import { logger } from '../utils/logger.js';
import { getTranscriptProvider } from './provider-transcript-reader.js';
import { type SessionStore } from './session-store.js';
import { MissingTmuxError, TmuxBridge, type TmuxSessionTarget } from './tmux-bridge.js';

interface RuntimeState {
  idleTimer: NodeJS.Timeout | null;
  lastSnapshotSeq: number;
  observers: number;
  pty: IPty | null;
  target: TmuxSessionTarget;
  terminalSize: TerminalSize;
}

interface TerminalSessionManagerEvents {
  error: [sessionId: string, message: string];
  output: [sessionId: string, chunk: string];
  status: [sessionId: string, status: ConnectionStatus];
  update: [sessionId: string, snapshot: TerminalSnapshot];
}

export class TerminalSessionManager extends EventEmitter<TerminalSessionManagerEvents> {
  private readonly adapters: BaseCliAdapter[] = [
    new ClaudeCodeAdapter(),
    new CodexAdapter(),
    new GenericCliAdapter(),
  ];

  private readonly runtimes = new Map<string, RuntimeState>();

  constructor(
    private readonly sessionStore: SessionStore,
    private readonly tmuxBridge: TmuxBridge,
    private readonly idleTimeoutMs: number
  ) {
    super();
  }

  async ensureSession(session: Session) {
    try {
      const existingRuntime = this.runtimes.get(session.id);
      if (existingRuntime && (await this.tmuxBridge.hasSession(existingRuntime.target.sessionName))) {
        existingRuntime.terminalSize = normalizeSize(session.sessionOptions?.terminal, existingRuntime.terminalSize);
        return existingRuntime.target;
      }

      const persistedTarget = await this.restorePersistedTarget(session);
      if (persistedTarget) {
        this.runtimes.set(session.id, {
          idleTimer: existingRuntime?.idleTimer ?? null,
          lastSnapshotSeq: existingRuntime?.lastSnapshotSeq ?? 0,
          observers: existingRuntime?.observers ?? 0,
          pty: existingRuntime?.pty ?? null,
          target: persistedTarget,
          terminalSize: normalizeSize(session.sessionOptions?.terminal, existingRuntime?.terminalSize),
        });
        this.touchRuntime(session.id, this.runtimes.get(session.id)!);
        return persistedTarget;
      }

      const preparedSession = await this.ensureHookRuntimeSession(session);
      const adapter = this.resolveAdapter(session.cliProgram);
      const spawnConfig = adapter.createSpawnConfig(
        preparedSession.cliProgram,
        preparedSession.sessionOptions,
        preparedSession
      );
      const size = normalizeSize(preparedSession.sessionOptions?.terminal);
      const target = await this.tmuxBridge.createDetachedSession({
        cols: size.cols,
        command: buildShellCommand(spawnConfig.command, spawnConfig.args, spawnConfig.env),
        rows: size.rows,
        sessionName: buildTmuxSessionName(session.id),
        workspacePath: preparedSession.workspacePath,
      });

      this.runtimes.set(session.id, {
        idleTimer: existingRuntime?.idleTimer ?? null,
        lastSnapshotSeq: 0,
        observers: existingRuntime?.observers ?? 0,
        pty: existingRuntime?.pty ?? null,
        target,
        terminalSize: size,
      });

      this.touchRuntime(session.id, this.runtimes.get(session.id)!);
      await this.sessionStore.updateSession(session.id, {
        lastMessageAt: new Date(),
        status: 'starting',
        terminal: {
          lastSnapshotAt: undefined,
          paneId: target.paneId,
          sessionName: target.sessionName,
          windowId: target.windowId,
        },
      });
      logger.info(`Attached tmux session ${target.sessionName} for ${session.id}`, {
        adapter: adapter.name,
        workspacePath: session.workspacePath,
      });
      return target;
    } catch (error) {
      const message =
        error instanceof MissingTmuxError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to initialize terminal session';
      this.emit('error', session.id, message);
      await this.sessionStore.updateSession(session.id, {
        lastMessageAt: new Date(),
        status: 'error',
      });
      throw error;
    }
  }

  async getSnapshot(sessionId: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) {
      throw new Error('Terminal session is not active');
    }
    return this.captureSnapshot(sessionId, runtime);
  }

  async observe(session: Session) {
    await this.ensureSession(session);
    const runtime = this.runtimes.get(session.id);
    if (!runtime) {
      throw new Error('Terminal session is not active');
    }
    runtime.observers += 1;
    await this.ensureAttachedPty(session, runtime);
    await this.touchSession(session.id, runtime);
  }

  unobserve(sessionId: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return;
    runtime.observers = Math.max(0, runtime.observers - 1);
    if (runtime.observers === 0) {
      this.detachPty(runtime);
    }
  }

  async resize(sessionId: string, size: Partial<TerminalSize>) {
    const runtime = await this.getRuntimeForInteraction(sessionId);
    if (!runtime) return false;
    runtime.terminalSize = normalizeSize(size, runtime.terminalSize);
    try {
      await this.tmuxBridge.resizePane(
        runtime.target.paneId,
        runtime.terminalSize.cols,
        runtime.terminalSize.rows
      );
    } catch (error) {
      if (isMissingTargetError(error)) {
        await this.handleDeadSession(sessionId, runtime);
        return false;
      }
      throw error;
    }
    runtime.pty?.resize(runtime.terminalSize.cols, runtime.terminalSize.rows);
    await this.touchSession(sessionId, runtime);
    return true;
  }

  async sendInput(sessionId: string, input: string) {
    const runtime = await this.getRuntimeForInteraction(sessionId);
    if (!runtime) return false;
    try {
      await this.tmuxBridge.sendText(runtime.target.paneId, input);
    } catch (error) {
      if (isMissingTargetError(error)) {
        await this.handleDeadSession(sessionId, runtime);
        return false;
      }
      throw error;
    }
    await this.touchSession(sessionId, runtime);
    return true;
  }

  async sendKey(sessionId: string, key: TerminalKey) {
    const runtime = await this.getRuntimeForInteraction(sessionId);
    if (!runtime) return false;
    try {
      await this.tmuxBridge.sendKey(runtime.target.paneId, mapTerminalKeyToTmux(key));
    } catch (error) {
      if (isMissingTargetError(error)) {
        await this.handleDeadSession(sessionId, runtime);
        return false;
      }
      throw error;
    }
    await this.touchSession(sessionId, runtime);
    return true;
  }

  async stopSession(sessionId: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return;
    this.clearRuntimeTimers(runtime);
    this.detachPty(runtime);
    this.runtimes.delete(sessionId);
    await this.tmuxBridge.killSession(runtime.target.sessionName);
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
      status: 'idle',
      terminal: undefined,
    });
    this.emit('status', sessionId, 'idle');
  }

  async stopSessions(sessions: Session[]) {
    await Promise.all(
      sessions
        .filter((session) => session.terminal?.sessionName)
        .map((session) => this.stopSessionByName(session.id, session.terminal!.sessionName!))
    );
  }

  async cleanupSession(sessionId: string, persistedSessionName?: string) {
    const runtime = this.runtimes.get(sessionId);
    if (runtime) {
      this.clearRuntimeTimers(runtime);
      this.detachPty(runtime);
      this.runtimes.delete(sessionId);
      await this.tmuxBridge.killSession(runtime.target.sessionName);
    } else if (persistedSessionName) {
      await this.tmuxBridge.killSession(persistedSessionName);
    }

    const canonicalSessionName = buildTmuxSessionName(sessionId);
    if (
      canonicalSessionName !== persistedSessionName &&
      (!runtime || runtime.target.sessionName !== canonicalSessionName)
    ) {
      await this.tmuxBridge.killSession(canonicalSessionName);
    }

    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
      status: 'idle',
      terminal: undefined,
    });
    this.emit('status', sessionId, 'idle');
  }

  private async ensureAttachedPty(session: Session, runtime: RuntimeState) {
    if (runtime.pty) {
      return runtime.pty;
    }

    await this.tmuxBridge.ensureAvailable();
    const shell = process.env.SHELL || '/bin/bash';
    const tmuxCommand = `exec tmux new -A -s ${quoteShellArg(runtime.target.sessionName)}`;
    const pty = spawn(shell, ['-lc', tmuxCommand], {
      cols: runtime.terminalSize.cols,
      cwd: expandHomePath(session.workspacePath),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      },
      name: 'xterm-256color',
      rows: runtime.terminalSize.rows,
    });

    runtime.pty = pty;

    pty.onData((chunk) => {
      if (!chunk) return;
      this.touchRuntime(session.id, runtime);
      this.emit('output', session.id, chunk);
    });

    pty.onExit(() => {
      runtime.pty = null;
      void this.handlePtyExit(session, runtime);
    });

    return pty;
  }

  private detachPty(runtime: RuntimeState) {
    if (!runtime.pty) return;
    try {
      runtime.pty.kill();
    } catch {
      // ignore; PTY may already be gone
    }
    runtime.pty = null;
  }

  private async captureSnapshot(sessionId: string, runtime: RuntimeState) {
    const snapshot = await this.tmuxBridge.getPaneSnapshot(runtime.target.paneId);
    if (snapshot.dead) {
      await this.handleDeadSession(sessionId, runtime);
      return {
        cols: snapshot.cols,
        content: '',
        rows: snapshot.rows,
        seq: runtime.lastSnapshotSeq,
      };
    }

    runtime.lastSnapshotSeq += 1;
    await this.sessionStore.updateSession(sessionId, {
      status: 'connected',
      terminal: {
        ...runtime.target,
        lastSnapshotAt: new Date(),
      },
    });

    return {
      cols: snapshot.cols,
      content: snapshot.content,
      rows: snapshot.rows,
      seq: runtime.lastSnapshotSeq,
    };
  }

  private async handlePtyExit(session: Session, runtime: RuntimeState) {
    if (runtime.observers > 0 && (await this.tmuxBridge.hasSession(runtime.target.sessionName))) {
      try {
        await this.ensureAttachedPty(session, runtime);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reattach terminal PTY';
        this.emit('error', session.id, message);
      }
    }

    if (!(await this.tmuxBridge.hasSession(runtime.target.sessionName))) {
      await this.handleDeadSession(session.id, runtime);
    }
  }

  private async handleDeadSession(sessionId: string, runtime: RuntimeState) {
    this.clearRuntimeTimers(runtime);
    this.detachPty(runtime);
    this.runtimes.delete(sessionId);
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
      status: 'idle',
      terminal: undefined,
    });
    this.emit('status', sessionId, 'idle');
  }

  private resolveAdapter(program: CliProgram) {
    return this.adapters.find((adapter) => adapter.canHandle(program)) ?? this.adapters[this.adapters.length - 1]!;
  }

  private async ensureHookRuntimeSession(session: Session) {
    const provider = getTranscriptProvider(session);
    if (!provider) {
      return session;
    }

    if (
      session.providerRuntime?.provider === provider &&
      session.providerRuntime?.hookToken
    ) {
      return session;
    }

    const providerRuntime = {
      ...session.providerRuntime,
      hookToken: session.providerRuntime?.hookToken ?? randomUUID(),
      provider,
    };
    return (
      (await this.sessionStore.updateSession(session.id, {
        providerRuntime,
      })) ?? {
        ...session,
        providerRuntime,
      }
    );
  }

  private async restorePersistedTarget(session: Session) {
    const terminal = session.terminal;
    if (!terminal?.sessionName || !terminal.paneId || !(await this.tmuxBridge.hasSession(terminal.sessionName))) {
      return null;
    }
    if (!(await this.tmuxBridge.hasPane(terminal.paneId))) {
      return null;
    }
    return {
      paneId: terminal.paneId,
      sessionName: terminal.sessionName,
      windowId: terminal.windowId ?? '@0',
    };
  }

  private async getRuntimeForInteraction(sessionId: string) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) {
      return null;
    }

    await this.ensureSession(session);
    return this.runtimes.get(sessionId) ?? null;
  }

  private async stopSessionByName(sessionId: string, sessionName: string) {
    try {
      await this.tmuxBridge.killSession(sessionName);
    } finally {
      const runtime = this.runtimes.get(sessionId);
      if (runtime) {
        this.clearRuntimeTimers(runtime);
        this.detachPty(runtime);
      }
      this.runtimes.delete(sessionId);
    }
  }

  private async touchSession(sessionId: string, runtime: RuntimeState) {
    this.touchRuntime(sessionId, runtime);
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
      status: 'connected',
    });
  }

  private touchRuntime(sessionId: string, runtime: RuntimeState) {
    if (runtime.idleTimer) {
      clearTimeout(runtime.idleTimer);
    }
    runtime.idleTimer = setTimeout(() => {
      logger.info(`Stopping idle terminal session ${sessionId}`);
      void this.stopSession(sessionId);
    }, this.idleTimeoutMs);
  }

  private clearRuntimeTimers(runtime: RuntimeState) {
    if (runtime.idleTimer) {
      clearTimeout(runtime.idleTimer);
      runtime.idleTimer = null;
    }
  }
}

export function buildTmuxSessionName(sessionId: string) {
  return `codeject-${sessionId}`;
}

export function mapTerminalKeyToTmux(key: TerminalKey) {
  return key;
}

function normalizeSize(size: Partial<TerminalSize> | undefined, fallback?: TerminalSize): TerminalSize {
  return {
    cols: Math.max(40, size?.cols ?? fallback?.cols ?? 120),
    rows: Math.max(12, size?.rows ?? fallback?.rows ?? 32),
  };
}

function isMissingTargetError(error: unknown) {
  return error instanceof Error && /can't find session|can't find pane/i.test(error.message);
}

function buildShellCommand(command: string, args: string[], env?: Record<string, string>) {
  const assignments = Object.entries(env ?? {}).map(([key, value]) => `${key}=${quoteShellArg(value)}`);
  return [...assignments, quoteShellArg(command), ...args.map(quoteShellArg)].join(' ');
}

function quoteShellArg(value: string) {
  if (/^[a-zA-Z0-9_./:-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
