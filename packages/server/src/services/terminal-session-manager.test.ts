import assert from 'node:assert/strict';
import test from 'node:test';
import { mapTerminalKeyToTmux } from './terminal-session-manager.js';

test('mapTerminalKeyToTmux passes supported terminal keys through unchanged', () => {
  const keys = [
    'Enter',
    'Escape',
    'Tab',
    'Up',
    'Down',
    'Left',
    'Right',
    'BSpace',
    'DC',
    'C-c',
    'C-d',
    'C-z',
    'C-l',
  ] as const;

  for (const key of keys) {
    assert.equal(mapTerminalKeyToTmux(key), key);
  }
});
