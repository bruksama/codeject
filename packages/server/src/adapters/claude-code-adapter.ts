import { type CliProgram, type CliSessionOptions, type Session } from '@codeject/shared';
import { BaseCliAdapter } from './base-cli-adapter.js';

export class ClaudeCodeAdapter extends BaseCliAdapter {
  readonly name = 'claude';

  override canHandle(program: CliProgram) {
    return super.canHandle(program) || program.id === 'claude-code';
  }

  override createSpawnConfig(program: CliProgram, sessionOptions?: CliSessionOptions, session?: Session) {
    const base = super.createSpawnConfig(program, sessionOptions, session);
    const args = new Set(base.args);
    args.add('--verbose');
    return {
      ...base,
      args: [...args],
      env: {
        ...base.env,
        ...this.buildProviderHookEnv(session, 'claude'),
      },
      ptyOptions: this.withDefaultPtyOptions(sessionOptions?.terminal),
    };
  }
}
