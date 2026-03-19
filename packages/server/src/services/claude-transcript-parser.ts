import fs from 'node:fs/promises';

interface ClaudeTranscriptEntry {
  sessionId?: string;
  type?: string;
  message?: {
    content?: Array<{ text?: string; type?: string }>;
    id?: string;
    model?: string;
    role?: string;
    stop_reason?: string | null;
  };
}

export interface ClaudeTranscriptSummary {
  finalAssistantMessage: string;
  hasAssistantActivity: boolean;
  lastAssistantMessageId: string | null;
  lastFinalMessageId: string | null;
  model: string;
  sessionId: string;
}

export async function parseClaudeTranscriptFile(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  let model = '';
  let finalAssistantMessage = '';
  let hasAssistantActivity = false;
  let lastAssistantMessageId: string | null = null;
  let lastFinalMessageId: string | null = null;
  let sessionId = '';

  for (const [index, line] of lines.entries()) {
    const entry = safeJsonParse<ClaudeTranscriptEntry>(line);
    if (entry?.sessionId) {
      sessionId = entry.sessionId;
    }
    if (!entry?.message || entry.message.role !== 'assistant') continue;
    hasAssistantActivity = true;
    lastAssistantMessageId = entry.message.id || `line:${index}`;

    const text = (entry.message.content ?? [])
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (entry.message.model) {
      model = entry.message.model;
    }

    if (text && entry.message.stop_reason === 'end_turn') {
      finalAssistantMessage = text;
      lastFinalMessageId = lastAssistantMessageId;
    }
  }

  return {
    finalAssistantMessage,
    hasAssistantActivity,
    lastAssistantMessageId,
    lastFinalMessageId,
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
