import {
  createEmptyInstallState,
  readInstallState,
  resolveInstallPaths,
  withTrackedPath,
  writeInstallState,
} from '../install-state.js';
import { installClaudeHook } from '../providers/claude-hook-installer.js';
import { installCodexHook } from '../providers/codex-hook-installer.js';

export async function runRepairCommand() {
  const paths = resolveInstallPaths();
  const existing = await readInstallState(paths);
  if (!existing?.components.hooks) {
    throw new Error('No Codeject hook install-state found. Run `codeject install` first.');
  }

  const state = createEmptyInstallState();
  state.components.hooks = true;
  state.lastInstalledAt = existing.lastInstalledAt;
  state.lastRepairedAt = new Date().toISOString();
  state.createdPaths = [...existing.createdPaths];
  state.providers.claude = await installClaudeHook(paths, existing.providers.claude);
  state.providers.codex = await installCodexHook(paths, existing.providers.codex);
  withTrackedPath(state, paths.codejectHome);
  withTrackedPath(state, paths.installStateFile);
  withTrackedPath(state, state.providers.claude.wrapperPath);
  withTrackedPath(state, state.providers.codex.wrapperPath);
  await writeInstallState(paths, state);

  console.log('Repaired Codeject hook integration.');
}
