import { type CliProgram, type CliSessionOptions } from '@codeject/shared';
import { BaseCliAdapter } from './base-cli-adapter.js';

export class GenericCliAdapter extends BaseCliAdapter {
  readonly name = 'generic';

  override canHandle() {
    return true;
  }

  override createSpawnConfig(program: CliProgram, sessionOptions?: CliSessionOptions) {
    return {
      args: ['-lc', program.command],
      command: process.env.SHELL || 'bash',
      ptyOptions: this.withDefaultPtyOptions(sessionOptions?.terminal),
    };
  }
}
