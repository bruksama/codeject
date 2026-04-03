import {
  readInstallState,
  resolveInstallPaths,
} from '../install-state.js';
import { removeDirectoryIfExists, shellQuote } from '../file-utils.js';
import { uninstallClaudeHook } from '../providers/claude-hook-installer.js';
import { uninstallCodexHook } from '../providers/codex-hook-installer.js';

export async function runUninstallCommand() {
  const paths = resolveInstallPaths();
  const state = await readInstallState(paths);
  const claudeRecord = state?.providers.claude ?? {
    createdSettingsFile: false,
    hookCommand: shellQuote(`${paths.binDir}/codeject-claude-stop-hook`),
    provider: 'claude' as const,
    settingsFilePath: paths.claudeSettingsFile,
    wrapperPath: `${paths.binDir}/codeject-claude-stop-hook`,
  };
  const codexRecord = state?.providers.codex ?? {
    configFilePath: paths.codexConfigFile,
    createdHooksFile: false,
    featureFlag: { mode: 'unchanged' as const },
    hookCommand: shellQuote(`${paths.binDir}/codeject-codex-stop-hook`),
    hooksFilePath: paths.codexHooksFile,
    provider: 'codex' as const,
    wrapperPath: `${paths.binDir}/codeject-codex-stop-hook`,
  };

  await uninstallClaudeHook(claudeRecord, paths);
  await uninstallCodexHook(codexRecord, paths);
  await removeDirectoryIfExists(paths.codejectHome);

  console.log(`Removed Codeject hook integration and ${paths.codejectHome}.`);
}
