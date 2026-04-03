import { type CliProgram, type CliSessionOptions, type Session } from '@codeject/shared';
import { BaseCliAdapter } from './base-cli-adapter.js';

export class CodexAdapter extends BaseCliAdapter {
  readonly name = 'codex';

  override createSpawnConfig(program: CliProgram, sessionOptions?: CliSessionOptions, session?: Session) {
    const base = super.createSpawnConfig(program, sessionOptions, session);
    return {
      ...base,
      env: {
        ...base.env,
        ...this.buildProviderHookEnv(session, 'codex'),
      },
      ptyOptions: this.withDefaultPtyOptions(sessionOptions?.terminal),
    };
  }
}
