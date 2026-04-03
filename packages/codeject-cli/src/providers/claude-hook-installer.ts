import path from 'node:path';
import {
  copyFile,
  deleteFileIfExists,
  fileExists,
  isObject,
  readJsonFile,
  shellQuote,
  writeJsonFile,
} from '../file-utils.js';
import type {
  ClaudeHookInstallRecord,
  InstallPaths,
} from '../install-state.js';

const WRAPPER_FILE_NAME = 'codeject-claude-stop-hook';
const TEMPLATE_PATH = path.resolve(import.meta.dirname, '../templates/codeject-claude-stop-hook');

type ClaudeSettings = Record<string, unknown> & {
  hooks?: Record<string, unknown>;
};

export interface ProviderStatus {
  healthy: boolean;
  installed: boolean;
  issues: string[];
  provider: 'claude' | 'codex';
}

export async function installClaudeHook(
  paths: InstallPaths,
  previous?: ClaudeHookInstallRecord
): Promise<ClaudeHookInstallRecord> {
  const wrapperPath = path.join(paths.binDir, WRAPPER_FILE_NAME);
  await copyFile(TEMPLATE_PATH, wrapperPath, 0o755);
  const hookCommand = shellQuote(wrapperPath);
  const settingsExisted = await fileExists(paths.claudeSettingsFile);
  const settings = await readJsonFile<ClaudeSettings>(paths.claudeSettingsFile, {});
  const hooks = ensureHookMap(settings);
  const stopEntries = Array.isArray(hooks.Stop) ? hooks.Stop : [];

  if (!hasHookCommand(stopEntries, hookCommand)) {
    stopEntries.push({
      hooks: [
        {
          command: hookCommand,
          timeout: 10,
          type: 'command',
        },
      ],
    });
  }

  hooks.Stop = stopEntries;
  settings.hooks = hooks;
  await writeJsonFile(paths.claudeSettingsFile, settings);

  return {
    createdSettingsFile: previous?.createdSettingsFile ?? !settingsExisted,
    hookCommand,
    provider: 'claude',
    settingsFilePath: paths.claudeSettingsFile,
    wrapperPath,
  };
}

export async function uninstallClaudeHook(
  record: ClaudeHookInstallRecord,
  paths: InstallPaths
) {
  const settings = await readJsonFile<ClaudeSettings | null>(record.settingsFilePath, null);
  if (settings) {
    const hooks = ensureHookMap(settings);
    const nextStopEntries = removeHookCommand(Array.isArray(hooks.Stop) ? hooks.Stop : [], record.hookCommand);
    if (nextStopEntries.length > 0) {
      hooks.Stop = nextStopEntries;
      settings.hooks = hooks;
      await writeJsonFile(record.settingsFilePath, settings);
    } else {
      delete hooks.Stop;
      if (Object.keys(hooks).length > 0) {
        settings.hooks = hooks;
        await writeJsonFile(record.settingsFilePath, settings);
      } else {
        delete settings.hooks;
        if (record.createdSettingsFile && Object.keys(settings).length === 0) {
          await deleteFileIfExists(record.settingsFilePath);
        } else {
          await writeJsonFile(record.settingsFilePath, settings);
        }
      }
    }
  }

  if (record.wrapperPath.startsWith(paths.codejectHome)) {
    await deleteFileIfExists(record.wrapperPath);
  }
}

export async function getClaudeHookStatus(
  paths: InstallPaths,
  record?: ClaudeHookInstallRecord
): Promise<ProviderStatus> {
  const expectedCommand = record?.hookCommand ?? shellQuote(path.join(paths.binDir, WRAPPER_FILE_NAME));
  const settings = await readJsonFile<ClaudeSettings | null>(paths.claudeSettingsFile, null);
  const stopEntries = ensureHookMap(settings ?? {}).Stop;
  const configInstalled = hasHookCommand(Array.isArray(stopEntries) ? stopEntries : [], expectedCommand);
  const wrapperExists = await fileExists(record?.wrapperPath ?? path.join(paths.binDir, WRAPPER_FILE_NAME));
  const issues: string[] = [];

  if (configInstalled && !wrapperExists) {
    issues.push('Claude wrapper is missing');
  }
  if (wrapperExists && !configInstalled) {
    issues.push('Claude hook config is missing');
  }

  return {
    healthy: issues.length === 0 && configInstalled && wrapperExists,
    installed: configInstalled || wrapperExists,
    issues,
    provider: 'claude',
  };
}

function ensureHookMap(settings: ClaudeSettings) {
  return isObject(settings.hooks) ? { ...settings.hooks } : {};
}

function hasHookCommand(entries: unknown[], hookCommand: string) {
  return entries.some((entry) =>
    isObject(entry) &&
    Array.isArray(entry.hooks) &&
    entry.hooks.some(
      (hook) => isObject(hook) && hook.type === 'command' && hook.command === hookCommand
    )
  );
}

function removeHookCommand(entries: unknown[], hookCommand: string) {
  return entries.flatMap((entry) => {
    if (!isObject(entry) || !Array.isArray(entry.hooks)) {
      return [entry];
    }

    const nextHooks = entry.hooks.filter(
      (hook) => !(isObject(hook) && hook.type === 'command' && hook.command === hookCommand)
    );
    return nextHooks.length > 0 ? [{ ...entry, hooks: nextHooks }] : [];
  });
}
