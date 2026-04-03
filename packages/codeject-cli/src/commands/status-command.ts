import { readInstallState, resolveInstallPaths } from '../install-state.js';
import { getClaudeHookStatus } from '../providers/claude-hook-installer.js';
import { getCodexHookStatus } from '../providers/codex-hook-installer.js';

export async function runStatusCommand() {
  const paths = resolveInstallPaths();
  const state = await readInstallState(paths);
  const statuses = await Promise.all([
    getClaudeHookStatus(paths, state?.providers.claude),
    getCodexHookStatus(paths, state?.providers.codex),
  ]);

  console.log(`Codeject home: ${paths.codejectHome}`);
  console.log(`Install state: ${state ? 'present' : 'missing'}`);

  for (const status of statuses) {
    const headline = `${status.provider}: ${
      status.healthy ? 'healthy' : status.installed ? 'drifted' : 'not installed'
    }`;
    console.log(headline);
    for (const issue of status.issues) {
      console.log(`  - ${issue}`);
    }
  }

  if (state && statuses.some((status) => status.installed && !status.healthy)) {
    process.exitCode = 1;
  }
}
