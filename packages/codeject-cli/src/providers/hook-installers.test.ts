import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readJsonFile, readTextFile } from '../file-utils.js';
import { resolveInstallPaths } from '../install-state.js';
import {
  getClaudeHookStatus,
  installClaudeHook,
  uninstallClaudeHook,
} from './claude-hook-installer.js';
import {
  getCodexHookStatus,
  installCodexHook,
  uninstallCodexHook,
} from './codex-hook-installer.js';

test('Claude installer merges and removes only Codeject-managed Stop hooks', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codeject-claude-hooks-'));
  const paths = resolveInstallPaths({
    claudeSettingsFile: path.join(root, '.claude', 'settings.json'),
    codejectHome: path.join(root, '.codeject'),
  });

  await fs.mkdir(path.dirname(paths.claudeSettingsFile), { recursive: true });
  await fs.writeFile(
    paths.claudeSettingsFile,
    JSON.stringify({
      hooks: {
        Stop: [
          {
            hooks: [{ command: 'echo existing', type: 'command' }],
          },
        ],
      },
    })
  );

  const record = await installClaudeHook(paths);
  const installed = await readJsonFile<Record<string, unknown>>(paths.claudeSettingsFile, {});
  const stopEntries = ((installed.hooks as Record<string, unknown>).Stop as unknown[]).flatMap(
    (entry) => ((entry as { hooks?: unknown[] }).hooks ?? []) as Array<Record<string, unknown>>
  );

  assert.ok(stopEntries.some((hook) => hook.command === 'echo existing'));
  assert.ok(stopEntries.some((hook) => hook.command === record.hookCommand));
  assert.equal((await getClaudeHookStatus(paths, record)).healthy, true);

  await uninstallClaudeHook(record, paths);
  const removed = await readJsonFile<Record<string, unknown>>(paths.claudeSettingsFile, {});
  const removedEntries = ((removed.hooks as Record<string, unknown>).Stop as unknown[]).flatMap(
    (entry) => ((entry as { hooks?: unknown[] }).hooks ?? []) as Array<Record<string, unknown>>
  );

  assert.ok(removedEntries.some((hook) => hook.command === 'echo existing'));
  assert.ok(!removedEntries.some((hook) => hook.command === record.hookCommand));
});

test('Codex installer enables hooks feature, merges hooks.json, and restores config on uninstall', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codeject-codex-hooks-'));
  const paths = resolveInstallPaths({
    codejectHome: path.join(root, '.codeject'),
    codexConfigFile: path.join(root, '.codex', 'config.toml'),
    codexHooksFile: path.join(root, '.codex', 'hooks.json'),
  });

  await fs.mkdir(path.dirname(paths.codexConfigFile), { recursive: true });
  await fs.writeFile(paths.codexConfigFile, '[features]\ncodex_hooks = false\n');
  await fs.writeFile(
    paths.codexHooksFile,
    JSON.stringify({
      Stop: [
        {
          hooks: [{ command: 'echo existing', type: 'command' }],
        },
      ],
    })
  );

  const record = await installCodexHook(paths);
  const installedHooks = await readJsonFile<Record<string, unknown>>(paths.codexHooksFile, {});
  const installedEntries = (installedHooks.Stop as unknown[]).flatMap(
    (entry) => ((entry as { hooks?: unknown[] }).hooks ?? []) as Array<Record<string, unknown>>
  );

  assert.ok(installedEntries.some((hook) => hook.command === 'echo existing'));
  assert.ok(installedEntries.some((hook) => hook.command === record.hookCommand));
  assert.match((await readTextFile(paths.codexConfigFile)) ?? '', /codex_hooks = true/);
  assert.equal((await getCodexHookStatus(paths, record)).healthy, true);

  await uninstallCodexHook(record, paths);
  const removedHooks = await readJsonFile<Record<string, unknown>>(paths.codexHooksFile, {});
  const removedEntries = (removedHooks.Stop as unknown[]).flatMap(
    (entry) => ((entry as { hooks?: unknown[] }).hooks ?? []) as Array<Record<string, unknown>>
  );

  assert.ok(removedEntries.some((hook) => hook.command === 'echo existing'));
  assert.ok(!removedEntries.some((hook) => hook.command === record.hookCommand));
  assert.match((await readTextFile(paths.codexConfigFile)) ?? '', /codex_hooks = false/);
});

test('reinstall preserves uninstall provenance for Claude and Codex', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codeject-reinstall-hooks-'));
  const paths = resolveInstallPaths({
    claudeSettingsFile: path.join(root, '.claude', 'settings.json'),
    codejectHome: path.join(root, '.codeject'),
    codexConfigFile: path.join(root, '.codex', 'config.toml'),
    codexHooksFile: path.join(root, '.codex', 'hooks.json'),
  });

  await fs.mkdir(path.dirname(paths.codexConfigFile), { recursive: true });
  await fs.writeFile(paths.codexConfigFile, '[features]\ncodex_hooks = false\n');

  const firstClaude = await installClaudeHook(paths);
  const firstCodex = await installCodexHook(paths);
  const secondClaude = await installClaudeHook(paths, firstClaude);
  const secondCodex = await installCodexHook(paths, firstCodex);

  await uninstallClaudeHook(secondClaude, paths);
  await uninstallCodexHook(secondCodex, paths);

  assert.equal(await readTextFile(paths.claudeSettingsFile), null);
  assert.equal(await readTextFile(paths.codexHooksFile), null);
  assert.match((await readTextFile(paths.codexConfigFile)) ?? '', /codex_hooks = false/);
});
