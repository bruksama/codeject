import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseClaudeTranscriptFile } from './claude-transcript-parser.js';

async function writeTranscriptFile(content: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeject-claude-parser-'));
  const filePath = path.join(dir, 'transcript.jsonl');
  await fs.writeFile(filePath, content);
  return filePath;
}

test('parseClaudeTranscriptFile only accepts assistant text that ends the turn', async () => {
  const filePath = await writeTranscriptFile(
    [
      JSON.stringify({ sessionId: 'claude-session' }),
      JSON.stringify({
        message: {
          content: [{ text: "I'll inspect the codebase first", type: 'text' }],
          id: 'assistant-1',
          model: 'claude-sonnet-4',
          role: 'assistant',
          stop_reason: null,
        },
      }),
      JSON.stringify({
        message: {
          content: [{ type: 'tool_use' }],
          id: 'assistant-2',
          role: 'assistant',
          stop_reason: null,
        },
      }),
      JSON.stringify({
        message: {
          content: [{ text: 'Final answer', type: 'text' }],
          id: 'assistant-3',
          model: 'claude-sonnet-4',
          role: 'assistant',
          stop_reason: 'end_turn',
        },
      }),
      '{"message":',
    ].join('\n')
  );

  const summary = await parseClaudeTranscriptFile(filePath);

  assert.equal(summary.sessionId, 'claude-session');
  assert.equal(summary.model, 'claude-sonnet-4');
  assert.equal(summary.hasAssistantActivity, true);
  assert.equal(summary.finalAssistantMessage, 'Final answer');
  assert.equal(summary.lastAssistantMessageId, 'assistant-3');
  assert.equal(summary.lastFinalMessageId, 'assistant-3');
});

test('parseClaudeTranscriptFile leaves stale finals detectable when later assistant activity appears', async () => {
  const filePath = await writeTranscriptFile(
    [
      JSON.stringify({
        message: {
          content: [{ text: 'Older final', type: 'text' }],
          id: 'assistant-final',
          role: 'assistant',
          stop_reason: 'end_turn',
        },
      }),
      JSON.stringify({
        message: {
          content: [{ text: 'Working again', type: 'text' }],
          id: 'assistant-working',
          role: 'assistant',
          stop_reason: null,
        },
      }),
    ].join('\n')
  );

  const summary = await parseClaudeTranscriptFile(filePath);

  assert.equal(summary.finalAssistantMessage, 'Older final');
  assert.equal(summary.lastFinalMessageId, 'assistant-final');
  assert.equal(summary.lastAssistantMessageId, 'assistant-working');
});
