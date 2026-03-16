import { type CliProgram, type CliSessionOptions } from '@codeject/shared';
import { BaseCliAdapter } from './base-cli-adapter.js';

export class ClaudeCodeAdapter extends BaseCliAdapter {
  readonly name = 'claude';

  override canHandle(program: CliProgram) {
    return super.canHandle(program) || program.id === 'claude-code';
  }

  override createSpawnConfig(program: CliProgram, sessionOptions?: CliSessionOptions) {
    const base = super.createSpawnConfig(program, sessionOptions);
    const args = new Set(base.args);
    args.add('--verbose');
    return {
      ...base,
      args: [...args],
      ptyOptions: this.withDefaultPtyOptions(sessionOptions?.terminal),
    };
  }
}
