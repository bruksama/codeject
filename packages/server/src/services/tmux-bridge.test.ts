import assert from 'node:assert/strict';
import test from 'node:test';
import { TmuxBridge } from './tmux-bridge.js';

test('getPaneSnapshot strips ANSI escape sequences from captured tmux content', async () => {
  const bridge = new TmuxBridge();
  const bridgeWithPatchedRun = bridge as unknown as {
    run: (args: string[]) => Promise<{ stdout: string }>;
  };

  bridgeWithPatchedRun.run = async (args: string[]) => {
    if (args[0] === '-V') {
      return { stdout: 'tmux 3.4' };
    }

    if (args[0] === 'capture-pane') {
      return { stdout: '\u001b[39mworking\u001b[0m\r\n\u001b]0;codex\u0007$ ready' };
    }

    if (args[0] === 'display-message') {
      return { stdout: '120\t32\t0' };
    }

    throw new Error(`Unexpected tmux command: ${args.join(' ')}`);
  };

  const snapshot = await bridge.getPaneSnapshot('%1');

  assert.equal(snapshot.content, 'working\r\n$ ready');
  assert.equal(snapshot.cols, 120);
  assert.equal(snapshot.rows, 32);
  assert.equal(snapshot.dead, false);
});
