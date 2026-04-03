import os from 'node:os';
import path from 'node:path';
import {
  readJsonFile,
  writeJsonFile,
} from './file-utils.js';

const INSTALL_STATE_VERSION = 1;
const INSTALLER_VERSION = '1.1.0';

export interface InstallPaths {
  codejectHome: string;
  installStateFile: string;
  binDir: string;
  claudeSettingsFile: string;
  codexConfigFile: string;
  codexHooksFile: string;
}

export interface ClaudeHookInstallRecord {
  createdSettingsFile: boolean;
  hookCommand: string;
  provider: 'claude';
  settingsFilePath: string;
  wrapperPath: string;
}

export interface CodexFeatureFlagState {
  mode: 'added-key' | 'created-file' | 'created-section' | 'unchanged' | 'updated-existing';
  previousValue?: 'false' | 'true';
}

export interface CodexHookInstallRecord {
  configFilePath: string;
  createdHooksFile: boolean;
  featureFlag: CodexFeatureFlagState;
  hookCommand: string;
  hooksFilePath: string;
  provider: 'codex';
  wrapperPath: string;
}

export interface InstallState {
  components: {
    hooks: boolean;
  };
  createdPaths: string[];
  installerVersion: string;
  lastInstalledAt?: string;
  lastRepairedAt?: string;
  providers: {
    claude?: ClaudeHookInstallRecord;
    codex?: CodexHookInstallRecord;
  };
  version: number;
}

export function resolveInstallPaths(overrides: Partial<InstallPaths> = {}): InstallPaths {
  const codejectHome = overrides.codejectHome ?? path.join(os.homedir(), '.codeject');
  return {
    binDir: overrides.binDir ?? path.join(codejectHome, 'bin'),
    claudeSettingsFile: overrides.claudeSettingsFile ?? path.join(os.homedir(), '.claude', 'settings.json'),
    codejectHome,
    codexConfigFile: overrides.codexConfigFile ?? path.join(os.homedir(), '.codex', 'config.toml'),
    codexHooksFile: overrides.codexHooksFile ?? path.join(os.homedir(), '.codex', 'hooks.json'),
    installStateFile: overrides.installStateFile ?? path.join(codejectHome, 'install-state.json'),
  };
}

export function createEmptyInstallState(): InstallState {
  return {
    components: { hooks: false },
    createdPaths: [],
    installerVersion: INSTALLER_VERSION,
    providers: {},
    version: INSTALL_STATE_VERSION,
  };
}

export async function readInstallState(paths: InstallPaths) {
  const state = await readJsonFile<InstallState | null>(paths.installStateFile, null);
  if (!state || state.version !== INSTALL_STATE_VERSION) {
    return null;
  }
  return state;
}

export async function writeInstallState(paths: InstallPaths, state: InstallState) {
  await writeJsonFile(paths.installStateFile, {
    ...state,
    installerVersion: INSTALLER_VERSION,
    version: INSTALL_STATE_VERSION,
  });
}

export function withTrackedPath(state: InstallState, targetPath: string) {
  if (!state.createdPaths.includes(targetPath)) {
    state.createdPaths.push(targetPath);
  }
}
