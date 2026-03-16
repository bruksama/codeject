import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import {
  type CliProgram,
  type ConnectionStatus,
  type Session,
  type TerminalKey,
  type TerminalSnapshot,
  type TerminalSize,
} from '@codeject/shared';
import { ClaudeCodeAdapter } from '../adapters/claude-code-adapter.js';
import { CodexAdapter } from '../adapters/codex-adapter.js';
import { GenericCliAdapter } from '../adapters/generic-cli-adapter.js';
import { type BaseCliAdapter } from '../adapters/base-cli-adapter.js';
import { logger } from '../utils/logger.js';
import { type SessionStore } from './session-store.js';
import { MissingTmuxError, TmuxBridge, type TmuxSessionTarget } from './tmux-bridge.js';

interface RuntimeState {
  idleTimer: NodeJS.Timeout | null;
  lastDigest: string | null;
  observers: number;
  pollTimer: NodeJS.Timeout | null;
  seq: number;
  target: TmuxSessionTarget;
}

interface TerminalSessionManagerEvents {
  error: [sessionId: string, message: string];
  status: [sessionId: string, status: ConnectionStatus];
  update: [sessionId: string, snapshot: TerminalSnapshot];
}

const POLL_INTERVAL_MS = 700;

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
      const runtime = this.runtimes.get(session.id);
      if (runtime && (await this.tmuxBridge.hasPane(runtime.target.paneId))) {
        return runtime.target;
      }

      const persistedTarget = await this.restorePersistedTarget(session);
      if (persistedTarget) {
        this.runtimes.set(session.id, {
          idleTimer: runtime?.idleTimer ?? null,
          lastDigest: null,
          observers: runtime?.observers ?? 0,
          pollTimer: runtime?.pollTimer ?? null,
          seq: runtime?.seq ?? 0,
          target: persistedTarget,
        });
        this.touchRuntime(session.id, this.runtimes.get(session.id)!);
        return persistedTarget;
      }

      const adapter = this.resolveAdapter(session.cliProgram);
      const spawnConfig = adapter.createSpawnConfig(session.cliProgram, session.sessionOptions);
      const size = normalizeSize(session.sessionOptions?.terminal);
      const target = await this.tmuxBridge.createDetachedSession({
        cols: size.cols,
        command: buildShellCommand(spawnConfig.command, spawnConfig.args),
        rows: size.rows,
        sessionName: buildTmuxSessionName(session.id),
        workspacePath: session.workspacePath,
      });
      this.runtimes.set(session.id, {
        idleTimer: null,
        lastDigest: null,
        observers: runtime?.observers ?? 0,
        pollTimer: runtime?.pollTimer ?? null,
        seq: 0,
        target,
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
    if (!runtime.pollTimer) {
      runtime.pollTimer = setInterval(() => {
        void this.pollSession(session.id);
      }, POLL_INTERVAL_MS);
    }
  }

  unobserve(sessionId: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return;
    runtime.observers = Math.max(0, runtime.observers - 1);
    if (runtime.observers === 0 && runtime.pollTimer) {
      clearInterval(runtime.pollTimer);
      runtime.pollTimer = null;
    }
  }

  async resize(sessionId: string, size: Partial<TerminalSize>) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return false;
    const nextSize = normalizeSize(size);
    try {
      await this.tmuxBridge.resizePane(runtime.target.paneId, nextSize.cols, nextSize.rows);
    } catch (error) {
      if (isMissingTargetError(error)) {
        await this.handleDeadPane(sessionId, runtime);
        return false;
      }
      throw error;
    }
    await this.touchSession(sessionId, runtime);
    return true;
  }

  async sendInput(sessionId: string, input: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return false;
    try {
      await this.tmuxBridge.sendText(runtime.target.paneId, input);
    } catch (error) {
      if (isMissingTargetError(error)) {
        await this.handleDeadPane(sessionId, runtime);
        return false;
      }
      throw error;
    }
    await this.touchSession(sessionId, runtime);
    await this.pollSession(sessionId);
    return true;
  }

  async sendKey(sessionId: string, key: TerminalKey) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return false;
    try {
      await this.tmuxBridge.sendKey(runtime.target.paneId, mapTerminalKey(key));
    } catch (error) {
      if (isMissingTargetError(error)) {
        await this.handleDeadPane(sessionId, runtime);
        return false;
      }
      throw error;
    }
    await this.touchSession(sessionId, runtime);
    await this.pollSession(sessionId);
    return true;
  }

  async stopSession(sessionId: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return;
    this.clearRuntimeTimers(runtime);
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

  private async captureSnapshot(sessionId: string, runtime: RuntimeState) {
    const snapshot = await this.tmuxBridge.getPaneSnapshot(runtime.target.paneId);
    if (snapshot.dead) {
      await this.handleDeadPane(sessionId, runtime);
      return {
        cols: snapshot.cols,
        content: '',
        rows: snapshot.rows,
        seq: runtime.seq,
      };
    }

    runtime.seq += 1;
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
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
      seq: runtime.seq,
    };
  }

  private async handleDeadPane(sessionId: string, runtime: RuntimeState) {
    this.clearRuntimeTimers(runtime);
    this.runtimes.delete(sessionId);
    await this.sessionStore.updateSession(sessionId, {
      lastMessageAt: new Date(),
      status: 'idle',
      terminal: undefined,
    });
    this.emit('status', sessionId, 'idle');
  }

  private async pollSession(sessionId: string) {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) return;

    try {
      const snapshot = await this.captureSnapshot(sessionId, runtime);
      const digest = createHash('sha1').update(snapshot.content).digest('hex');
      if (runtime.lastDigest === digest) {
        return;
      }
      runtime.lastDigest = digest;
      this.touchRuntime(sessionId, runtime);
      this.emit('update', sessionId, snapshot);
    } catch (error) {
      if (isMissingTargetError(error)) {
        await this.handleDeadPane(sessionId, runtime);
        return;
      }
      const message = error instanceof Error ? error.message : 'Failed to capture terminal state';
      this.emit('error', sessionId, message);
      await this.sessionStore.updateSession(sessionId, {
        lastMessageAt: new Date(),
        status: 'error',
      });
      this.emit('status', sessionId, 'error');
    }
  }

  private resolveAdapter(program: CliProgram) {
    return this.adapters.find((adapter) => adapter.canHandle(program)) ?? this.adapters[this.adapters.length - 1]!;
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

  private async stopSessionByName(sessionId: string, sessionName: string) {
    try {
      await this.tmuxBridge.killSession(sessionName);
    } finally {
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
    if (runtime.pollTimer) {
      clearInterval(runtime.pollTimer);
      runtime.pollTimer = null;
    }
    if (runtime.idleTimer) {
      clearTimeout(runtime.idleTimer);
      runtime.idleTimer = null;
    }
  }
}

export function buildTmuxSessionName(sessionId: string) {
  return `codeject-${sessionId}`;
}

function mapTerminalKey(key: TerminalKey) {
  switch (key) {
    case 'ArrowDown':
      return 'Down';
    case 'ArrowLeft':
      return 'Left';
    case 'ArrowRight':
      return 'Right';
    case 'ArrowUp':
      return 'Up';
    case 'Backspace':
      return 'BSpace';
    case 'Ctrl+C':
      return 'C-c';
    case 'Ctrl+D':
      return 'C-d';
    case 'Ctrl+L':
      return 'C-l';
    case 'Enter':
      return 'Enter';
    case 'Escape':
      return 'Escape';
    case 'Tab':
      return 'Tab';
  }
}

function normalizeSize(size: Partial<TerminalSize> | undefined): TerminalSize {
  return {
    cols: Math.max(40, size?.cols ?? 120),
    rows: Math.max(12, size?.rows ?? 32),
  };
}

function isMissingTargetError(error: unknown) {
  return error instanceof Error && /can't find session|can't find pane/i.test(error.message);
}

function buildShellCommand(command: string, args: string[]) {
  return [command, ...args].map(quoteShellArg).join(' ');
}

function quoteShellArg(value: string) {
  if (/^[a-zA-Z0-9_./:-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
