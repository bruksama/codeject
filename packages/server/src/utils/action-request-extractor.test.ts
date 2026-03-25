import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeTerminalInteraction } from './action-request-extractor.js';

test('analyzeTerminalInteraction ignores long narrative questions that mention input-like keywords', () => {
  const result = analyzeTerminalInteraction({
    snapshotText:
      'Using ck:ask for an architecture/codebase assessment.\nI need you to inspect the current codebase and tell me which directory should I inspect first?',
  });

  assert.equal(result.requirement, 'terminal-available');
  assert.equal(result.actionRequest, undefined);
  assert.equal(result.reason, undefined);
});

test('analyzeTerminalInteraction still extracts short generic free-input prompts', () => {
  const result = analyzeTerminalInteraction({
    snapshotText: 'Some context line\nPaste token:',
  });

  assert.equal(result.requirement, 'terminal-required');
  assert.equal(result.actionRequest?.kind, 'free-input');
  assert.equal(result.actionRequest?.prompt, 'Paste token:');
});

test('analyzeTerminalInteraction still accepts short question-style prompts', () => {
  const result = analyzeTerminalInteraction({
    snapshotText: 'Some context line\nWhich path?',
  });

  assert.equal(result.requirement, 'terminal-required');
  assert.equal(result.actionRequest?.kind, 'free-input');
  assert.equal(result.actionRequest?.prompt, 'Which path?');
});
