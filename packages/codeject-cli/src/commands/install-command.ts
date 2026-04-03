import {
  createEmptyInstallState,
  readInstallState,
  resolveInstallPaths,
  withTrackedPath,
  writeInstallState,
} from '../install-state.js';
import { installClaudeHook } from '../providers/claude-hook-installer.js';
import { installCodexHook } from '../providers/codex-hook-installer.js';

export async function runInstallCommand() {
  const paths = resolveInstallPaths();
  const state = (await readInstallState(paths)) ?? createEmptyInstallState();
  state.providers.claude = await installClaudeHook(paths, state.providers.claude);
  state.providers.codex = await installCodexHook(paths, state.providers.codex);
  state.components.hooks = true;
  state.lastInstalledAt = state.lastInstalledAt ?? new Date().toISOString();
  withTrackedPath(state, paths.codejectHome);
  withTrackedPath(state, paths.installStateFile);
  withTrackedPath(state, state.providers.claude.wrapperPath);
  withTrackedPath(state, state.providers.codex.wrapperPath);
  await writeInstallState(paths, state);

  console.log('Installed Codeject hooks for Claude Code and Codex.');
  console.log(`Codeject home: ${paths.codejectHome}`);
  console.log('Uninstall will remove hook integration and ~/.codeject.');
}
