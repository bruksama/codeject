import fs from 'node:fs/promises';

interface ClaudeTranscriptEntry {
  sessionId?: string;
  summary?: string;
  type?: string;
  message?: {
    content?: Array<{ text?: string; type?: string }>;
    model?: string;
    role?: string;
  };
}

export interface ClaudeTranscriptSummary {
  lastAssistantMessage: string;
  model: string;
  sessionId: string;
}

export async function parseClaudeTranscriptFile(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  let model = '';
  let lastAssistantMessage = '';
  let sessionId = '';
  let summary = '';

  for (const line of lines) {
    const entry = safeJsonParse<ClaudeTranscriptEntry>(line);
    if (entry?.sessionId) {
      sessionId = entry.sessionId;
    }
    if (entry?.type === 'summary' && entry.summary) {
      summary = entry.summary;
    }
    if (!entry?.message || entry.message.role !== 'assistant') continue;

    const text = (entry.message.content ?? [])
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (text) {
      lastAssistantMessage = text;
    }

    if (entry.message.model) {
      model = entry.message.model;
    }
  }

  return {
    lastAssistantMessage: lastAssistantMessage || summary,
    model,
    sessionId,
  } satisfies ClaudeTranscriptSummary;
}

function safeJsonParse<T>(raw: string) {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
