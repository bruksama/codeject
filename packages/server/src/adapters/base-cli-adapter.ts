import os from 'node:os';
import path from 'node:path';
import type { IPtyForkOptions } from 'node-pty';
import { type CliProgram, type CliSessionOptions, type TerminalSize } from '@codeject/shared';

export interface CliSpawnConfig {
  args: string[];
  command: string;
  env?: Record<string, string>;
  ptyOptions?: Partial<IPtyForkOptions>;
}

export abstract class BaseCliAdapter {
  abstract readonly name: string;

  canHandle(program: CliProgram) {
    return this.name === program.id || path.basename(program.command.trim().split(/\s+/, 1)[0] ?? '') === this.name;
  }

  createSpawnConfig(program: CliProgram, sessionOptions?: CliSessionOptions): CliSpawnConfig {
    return {
      args: this.buildArgs(program, sessionOptions),
      command: this.getCommand(program),
    };
  }

  protected buildArgs(program: CliProgram, _sessionOptions?: CliSessionOptions) {
    return splitCommandLine(program.command).slice(1);
  }

  protected getCommand(program: CliProgram) {
    return splitCommandLine(program.command)[0] ?? program.command;
  }

  protected withDefaultPtyOptions(size?: Partial<TerminalSize>): Partial<IPtyForkOptions> {
    return {
      cols: size?.cols ?? 120,
      rows: size?.rows ?? 32,
      cwd: os.homedir(),
      name: 'xterm-256color',
    };
  }
}

export function expandHomePath(input: string) {
  if (input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return input;
}

export function splitCommandLine(command: string) {
  const tokens = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  return tokens.map((token) => token.replace(/^['"]|['"]$/g, ''));
}
