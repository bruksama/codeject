import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseCodexRolloutFile } from './codex-rollout-parser.js';

async function writeRolloutFile(content: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeject-codex-parser-'));
  const filePath = path.join(dir, 'rollout.jsonl');
  await fs.writeFile(filePath, content);
  return filePath;
}

test('parseCodexRolloutFile only keeps final_answer content and ignores partial trailing lines', async () => {
  const filePath = await writeRolloutFile(
    [
      JSON.stringify({ type: 'session_meta', payload: { id: 'codex-session' } }),
      JSON.stringify({
        type: 'response_item',
        payload: {
          content: [{ text: 'Thinking out loud', type: 'output_text' }],
          id: 'assistant-1',
          phase: 'commentary',
          role: 'assistant',
          type: 'message',
        },
      }),
      JSON.stringify({
        type: 'response_item',
        payload: {
          content: [{ text: 'Final answer', type: 'output_text' }],
          id: 'assistant-2',
          phase: 'final_answer',
          role: 'assistant',
          type: 'message',
        },
      }),
      '{"type":"response_item"',
    ].join('\n')
  );

  const summary = await parseCodexRolloutFile(filePath);

  assert.equal(summary.sessionId, 'codex-session');
  assert.equal(summary.hasAssistantActivity, true);
  assert.equal(summary.finalAssistantMessage, 'Final answer');
  assert.equal(summary.lastAssistantMessageId, 'assistant-2');
  assert.equal(summary.lastFinalMessageId, 'assistant-2');
});

test('parseCodexRolloutFile leaves stale finals detectable when newer commentary appears', async () => {
  const filePath = await writeRolloutFile(
    [
      JSON.stringify({
        type: 'response_item',
        payload: {
          content: [{ text: 'Older final', type: 'output_text' }],
          id: 'assistant-final',
          phase: 'final_answer',
          role: 'assistant',
          type: 'message',
        },
      }),
      JSON.stringify({
        type: 'response_item',
        payload: {
          content: [{ text: 'Working again', type: 'output_text' }],
          id: 'assistant-working',
          phase: 'commentary',
          role: 'assistant',
          type: 'message',
        },
      }),
    ].join('\n')
  );

  const summary = await parseCodexRolloutFile(filePath);

  assert.equal(summary.finalAssistantMessage, 'Older final');
  assert.equal(summary.lastFinalMessageId, 'assistant-final');
  assert.equal(summary.lastAssistantMessageId, 'assistant-working');
});
