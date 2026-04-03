import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createEmptyInstallState,
  readInstallState,
  resolveInstallPaths,
  writeInstallState,
} from './install-state.js';

test('install-state round-trips under CODEJECT_HOME', async () => {
  const codejectHome = await fs.mkdtemp(path.join(os.tmpdir(), 'codeject-cli-state-'));
  const paths = resolveInstallPaths({ codejectHome });
  const state = createEmptyInstallState();
  state.components.hooks = true;
  state.lastInstalledAt = '2026-04-03T03:30:00.000Z';

  await writeInstallState(paths, state);

  const next = await readInstallState(paths);
  assert.equal(next?.components.hooks, true);
  assert.equal(next?.lastInstalledAt, '2026-04-03T03:30:00.000Z');
});
