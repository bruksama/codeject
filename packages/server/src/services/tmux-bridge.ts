import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expandHomePath } from '../adapters/base-cli-adapter.js';

const execFileAsync = promisify(execFile);
const SNAPSHOT_HISTORY_LINES = '-2000';

export interface TmuxSessionTarget {
  paneId: string;
  sessionName: string;
  windowId: string;
}

export interface TmuxPaneSnapshot {
  cols: number;
  content: string;
  dead: boolean;
  rows: number;
}

export class MissingTmuxError extends Error {
  constructor() {
    super('tmux is required for terminal sessions. Install tmux on the host machine and restart Codeject.');
  }
}

export class TmuxBridge {
  private availabilityCheck: Promise<void> | null = null;

  async ensureAvailable() {
    this.availabilityCheck ??= this.run(['-V'])
      .then(() => undefined)
      .catch((error: unknown) => {
        throw this.normalizeError(error);
      });
    return this.availabilityCheck;
  }

  async createDetachedSession(input: {
    cols: number;
    command: string;
    rows: number;
    sessionName: string;
    workspacePath: string;
  }) {
    await this.ensureAvailable();
    const { stdout } = await this.run([
      'new-session',
      '-d',
      '-P',
      '-F',
      '#{session_name}\t#{window_id}\t#{pane_id}',
      '-s',
      input.sessionName,
      '-x',
      String(input.cols),
      '-y',
      String(input.rows),
      '-c',
      expandHomePath(input.workspacePath),
    ]);
    const target = parseTarget(stdout);
    await this.sendText(target.paneId, input.command);
    await this.sendKey(target.paneId, 'Enter');
    return target;
  }

  async getPaneSnapshot(paneId: string): Promise<TmuxPaneSnapshot> {
    await this.ensureAvailable();
    let content = '';
    let sizeLine = '120\t32\t1';
    try {
      [{ stdout: content }, { stdout: sizeLine }] = await Promise.all([
        this.run(['capture-pane', '-p', '-e', '-J', '-S', SNAPSHOT_HISTORY_LINES, '-t', paneId]),
        this.run(['display-message', '-p', '-t', paneId, '#{pane_width}\t#{pane_height}\t#{pane_dead}']),
      ]);
    } catch (error) {
      if (!isMissingTargetError(error)) {
        throw error;
      }
    }
    const [colsText = '120', rowsText = '32', deadText = '0'] = sizeLine.trim().split('\t');
    return {
      cols: Number.parseInt(colsText, 10) || 120,
      content,
      dead: deadText === '1',
      rows: Number.parseInt(rowsText, 10) || 32,
    };
  }

  async hasPane(paneId: string) {
    await this.ensureAvailable();
    try {
      await this.run(['display-message', '-p', '-t', paneId, '#{pane_id}']);
      return true;
    } catch {
      return false;
    }
  }

  async hasSession(sessionName: string) {
    await this.ensureAvailable();
    try {
      await this.run(['has-session', '-t', sessionName]);
      return true;
    } catch {
      return false;
    }
  }

  async killSession(sessionName: string) {
    await this.ensureAvailable();
    try {
      await this.run(['kill-session', '-t', sessionName]);
    } catch (error) {
      if (!isMissingTargetError(error)) {
        throw this.normalizeError(error);
      }
    }
  }

  async resizePane(paneId: string, cols: number, rows: number) {
    await this.ensureAvailable();
    await this.run(['resize-pane', '-t', paneId, '-x', String(cols), '-y', String(rows)]);
  }

  async sendKey(paneId: string, key: string) {
    await this.ensureAvailable();
    await this.run(['send-keys', '-t', paneId, key]);
  }

  async sendText(paneId: string, text: string) {
    if (!text) return;
    await this.ensureAvailable();
    await this.run(['send-keys', '-t', paneId, '-l', text]);
  }

  private async run(args: string[]) {
    try {
      return await execFileAsync('tmux', args, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 8,
      });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeError(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ENOENT'
    ) {
      return new MissingTmuxError();
    }
    return error instanceof Error ? error : new Error('Unknown tmux error');
  }
}

function isMissingTargetError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /can't find session|can't find pane/i.test(error.message);
}

function parseTarget(stdout: string): TmuxSessionTarget {
  const [sessionName, windowId, paneId] = stdout.trim().split('\t');
  if (!sessionName || !windowId || !paneId) {
    throw new Error('Failed to parse tmux target metadata');
  }
  return { paneId, sessionName, windowId };
}
