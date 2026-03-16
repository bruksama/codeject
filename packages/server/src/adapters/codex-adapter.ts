import { type CliProgram, type CliSessionOptions } from '@codeject/shared';
import { BaseCliAdapter } from './base-cli-adapter.js';

export class CodexAdapter extends BaseCliAdapter {
  readonly name = 'codex';

  override createSpawnConfig(program: CliProgram, sessionOptions?: CliSessionOptions) {
    return {
      ...super.createSpawnConfig(program, sessionOptions),
      ptyOptions: this.withDefaultPtyOptions(sessionOptions?.terminal),
    };
  }
}
