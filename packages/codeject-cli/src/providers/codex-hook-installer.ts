import path from 'node:path';
import {
  copyFile,
  deleteFileIfExists,
  fileExists,
  isObject,
  readJsonFile,
  readTextFile,
  shellQuote,
  writeJsonFile,
  writeTextFile,
} from '../file-utils.js';
import type {
  CodexFeatureFlagState,
  CodexHookInstallRecord,
  InstallPaths,
} from '../install-state.js';
import type { ProviderStatus } from './claude-hook-installer.js';

const WRAPPER_FILE_NAME = 'codeject-codex-stop-hook';
const TEMPLATE_PATH = path.resolve(import.meta.dirname, '../templates/codeject-codex-stop-hook');

type CodexHooksConfig = Record<string, unknown> & {
  hooks?: Record<string, unknown>;
  Stop?: unknown[];
};

export async function installCodexHook(
  paths: InstallPaths,
  previous?: CodexHookInstallRecord
): Promise<CodexHookInstallRecord> {
  const wrapperPath = path.join(paths.binDir, WRAPPER_FILE_NAME);
  await copyFile(TEMPLATE_PATH, wrapperPath, 0o755);
  const hookCommand = shellQuote(wrapperPath);
  const hooksFileExisted = await fileExists(paths.codexHooksFile);
  const hooksConfig = await readJsonFile<CodexHooksConfig>(paths.codexHooksFile, {});
  const hookMap = ensureHookMap(hooksConfig);
  const stopEntries = Array.isArray(hookMap.Stop) ? hookMap.Stop : [];

  if (!hasHookCommand(stopEntries, hookCommand)) {
    stopEntries.push({
      hooks: [
        {
          command: hookCommand,
          type: 'command',
        },
      ],
    });
  }

  hookMap.Stop = stopEntries;
  removeLegacyTopLevelStopHook(hooksConfig, hookCommand);
  await writeJsonFile(paths.codexHooksFile, hooksConfig);

  const existingConfig = await readTextFile(paths.codexConfigFile);
  const enabledConfig = enableCodexHooksFeature(existingConfig);
  await writeTextFile(paths.codexConfigFile, enabledConfig.content);

  return {
    configFilePath: paths.codexConfigFile,
    createdHooksFile: previous?.createdHooksFile ?? !hooksFileExisted,
    featureFlag: previous?.featureFlag.mode && previous.featureFlag.mode !== 'unchanged'
      ? previous.featureFlag
      : enabledConfig.change,
    hookCommand,
    hooksFilePath: paths.codexHooksFile,
    provider: 'codex',
    wrapperPath,
  };
}

export async function uninstallCodexHook(
  record: CodexHookInstallRecord,
  paths: InstallPaths
) {
  const hooksConfig = await readJsonFile<CodexHooksConfig | null>(record.hooksFilePath, null);
  if (hooksConfig) {
    const hookMap = ensureHookMap(hooksConfig);
    const nextStopEntries = removeHookCommand(
      Array.isArray(hookMap.Stop) ? hookMap.Stop : [],
      record.hookCommand
    );
    if (nextStopEntries.length > 0) {
      hookMap.Stop = nextStopEntries;
    } else {
      delete hookMap.Stop;
      collapseEmptyHookMap(hooksConfig);
    }

    const nextLegacyEntries = removeHookCommand(
      Array.isArray(hooksConfig.Stop) ? hooksConfig.Stop : [],
      record.hookCommand
    );
    if (nextLegacyEntries.length > 0) {
      hooksConfig.Stop = nextLegacyEntries;
    } else {
      delete hooksConfig.Stop;
    }

    if (record.createdHooksFile && Object.keys(hooksConfig).length === 0) {
      await deleteFileIfExists(record.hooksFilePath);
    } else {
      await writeJsonFile(record.hooksFilePath, hooksConfig);
    }
  }

  const configContent = await readTextFile(record.configFilePath);
  if (configContent !== null) {
    const restored = restoreCodexHooksFeature(configContent, record.featureFlag);
    if (restored === null) {
      await deleteFileIfExists(record.configFilePath);
    } else {
      await writeTextFile(record.configFilePath, restored);
    }
  }

  if (record.wrapperPath.startsWith(paths.codejectHome)) {
    await deleteFileIfExists(record.wrapperPath);
  }
}

export async function getCodexHookStatus(
  paths: InstallPaths,
  record?: CodexHookInstallRecord
): Promise<ProviderStatus> {
  const expectedCommand = record?.hookCommand ?? shellQuote(path.join(paths.binDir, WRAPPER_FILE_NAME));
  const hooksConfig = await readJsonFile<CodexHooksConfig | null>(paths.codexHooksFile, null);
  const hookMap = isObject(hooksConfig?.hooks) ? hooksConfig.hooks : {};
  const hookInstalled = hasHookCommand(
    Array.isArray(hookMap.Stop) ? hookMap.Stop : [],
    expectedCommand
  );
  const legacyTopLevelInstalled = hasHookCommand(Array.isArray(hooksConfig?.Stop) ? hooksConfig.Stop : [], expectedCommand);
  const configText = await readTextFile(paths.codexConfigFile);
  const featureEnabled = configText ? isCodexHooksFeatureEnabled(configText) : false;
  const wrapperExists = await fileExists(record?.wrapperPath ?? path.join(paths.binDir, WRAPPER_FILE_NAME));
  const issues: string[] = [];

  if (hookInstalled && !wrapperExists) {
    issues.push('Codex wrapper is missing');
  }
  if (wrapperExists && !hookInstalled) {
    issues.push('Codex hooks.json entry is missing');
  }
  if (legacyTopLevelInstalled) {
    issues.push('Codex hook is installed in legacy top-level Stop format');
  }
  if ((hookInstalled || wrapperExists) && !featureEnabled) {
    issues.push('Codex hooks feature flag is disabled');
  }

  return {
    healthy: issues.length === 0 && hookInstalled && wrapperExists && featureEnabled,
    installed: hookInstalled || wrapperExists || featureEnabled,
    issues,
    provider: 'codex',
  };
}

export function isCodexHooksFeatureEnabled(configText: string) {
  let currentSection = '';
  for (const line of configText.split(/\r?\n/)) {
    const sectionMatch = line.match(/^\s*\[([^[\]]+)\]\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }
    if (currentSection === 'features' && /^\s*codex_hooks\s*=\s*true\b/.test(line)) {
      return true;
    }
  }
  return false;
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

function ensureHookMap(config: CodexHooksConfig) {
  const hooks = isObject(config.hooks) ? config.hooks : {};
  config.hooks = hooks;
  return hooks as Record<string, unknown> & { Stop?: unknown[] };
}

function removeLegacyTopLevelStopHook(config: CodexHooksConfig, hookCommand: string) {
  const nextStopEntries = removeHookCommand(Array.isArray(config.Stop) ? config.Stop : [], hookCommand);
  if (nextStopEntries.length > 0) {
    config.Stop = nextStopEntries;
  } else {
    delete config.Stop;
  }
}

function collapseEmptyHookMap(config: CodexHooksConfig) {
  if (isObject(config.hooks) && Object.keys(config.hooks).length === 0) {
    delete config.hooks;
  }
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

function enableCodexHooksFeature(content: string | null) {
  const source = content ?? '';
  const lines = source.split(/\r?\n/);
  let currentSection = '';
  let featuresSectionIndex = -1;
  let featuresSectionEnd = lines.length;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const sectionMatch = line.match(/^\s*\[([^[\]]+)\]\s*$/);
    if (sectionMatch) {
      if (currentSection === 'features' && featuresSectionEnd === lines.length) {
        featuresSectionEnd = index;
      }
      currentSection = sectionMatch[1].trim();
      if (currentSection === 'features' && featuresSectionIndex < 0) {
        featuresSectionIndex = index;
      }
      continue;
    }

    if (currentSection === 'features') {
      const flagMatch = line.match(/^(\s*codex_hooks\s*=\s*)(true|false)(\s*(?:#.*)?)$/);
      if (!flagMatch) {
        continue;
      }
      if (flagMatch[2] === 'true') {
        return { change: { mode: 'unchanged' } satisfies CodexFeatureFlagState, content: normalizeToml(lines) };
      }
      lines[index] = `${flagMatch[1]}true${flagMatch[3] ?? ''}`;
      return {
        change: { mode: 'updated-existing', previousValue: 'false' } satisfies CodexFeatureFlagState,
        content: normalizeToml(lines),
      };
    }
  }

  if (featuresSectionIndex >= 0) {
    lines.splice(featuresSectionEnd, 0, 'codex_hooks = true');
    return {
      change: { mode: 'added-key' } satisfies CodexFeatureFlagState,
      content: normalizeToml(lines),
    };
  }

  const nextLines = [...lines.filter((line, index) => !(index === lines.length - 1 && line === ''))];
  if (nextLines.length > 0) {
    nextLines.push('');
  }
  nextLines.push('[features]', 'codex_hooks = true');
  return {
    change: {
      mode: content === null ? 'created-file' : 'created-section',
    } satisfies CodexFeatureFlagState,
    content: normalizeToml(nextLines),
  };
}

function restoreCodexHooksFeature(content: string, change: CodexFeatureFlagState) {
  if (change.mode === 'unchanged') {
    return normalizeToml(content.split(/\r?\n/));
  }

  const lines = content.split(/\r?\n/);
  let currentSection = '';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const sectionMatch = line.match(/^\s*\[([^[\]]+)\]\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    if (currentSection !== 'features' || !/^\s*codex_hooks\s*=/.test(line)) {
      continue;
    }

    if (change.mode === 'updated-existing') {
      lines[index] = line.replace(/\btrue\b/, change.previousValue ?? 'false');
      return normalizeToml(lines);
    }

    lines.splice(index, 1);
    return collapseEmptyFeaturesSection(lines, change.mode === 'created-file');
  }

  return normalizeToml(lines);
}

function collapseEmptyFeaturesSection(lines: string[], deleteIfEmpty: boolean) {
  let currentSection = '';
  for (let index = 0; index < lines.length; index += 1) {
    const sectionMatch = lines[index]?.match(/^\s*\[([^[\]]+)\]\s*$/);
    if (!sectionMatch) {
      continue;
    }

    currentSection = sectionMatch[1].trim();
    if (currentSection !== 'features') {
      continue;
    }

    const nextSectionIndex = findNextSectionIndex(lines, index + 1);
    const bodyLines = lines.slice(index + 1, nextSectionIndex).filter((line) => line.trim() && !line.trim().startsWith('#'));
    if (bodyLines.length === 0) {
      lines.splice(index, nextSectionIndex - index);
    }
    break;
  }

  const normalized = normalizeToml(lines).trim();
  return deleteIfEmpty && normalized.length === 0 ? null : `${normalized}\n`;
}

function findNextSectionIndex(lines: string[], startIndex: number) {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (/^\s*\[([^[\]]+)\]\s*$/.test(lines[index] ?? '')) {
      return index;
    }
  }
  return lines.length;
}

function normalizeToml(lines: string[]) {
  const joined = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
  return joined ? `${joined}\n` : '';
}
