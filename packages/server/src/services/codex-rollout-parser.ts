import fs from 'node:fs/promises';

interface CodexRolloutEntry {
  payload?: {
    content?: Array<{ text?: string; type?: string }>;
    id?: string;
    phase?: string;
    role?: string;
    type?: string;
  };
  type?: string;
}

export interface CodexRolloutSummary {
  finalAssistantMessage: string;
  hasAssistantActivity: boolean;
  lastAssistantMessageId: string | null;
  lastFinalMessageId: string | null;
  sessionId: string;
}

export async function parseCodexRolloutFile(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  let finalAssistantMessage = '';
  let hasAssistantActivity = false;
  let lastAssistantMessageId: string | null = null;
  let lastFinalMessageId: string | null = null;
  let sessionId = '';

  for (const [index, line] of lines.entries()) {
    const entry = safeJsonParse<CodexRolloutEntry>(line);
    const payload = entry?.payload;
    if (entry?.type === 'session_meta' && payload?.id) {
      sessionId = payload.id;
    }
    if (entry?.type !== 'response_item' || payload?.type !== 'message' || payload.role !== 'assistant') {
      continue;
    }

    hasAssistantActivity = true;
    lastAssistantMessageId = payload.id || `line:${index}`;

    const text = (payload.content ?? [])
      .filter((part) => part.type === 'output_text' && part.text)
      .map((part) => part.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (!text) {
      continue;
    }

    if (payload.phase === 'final_answer') {
      finalAssistantMessage = text;
      lastFinalMessageId = lastAssistantMessageId;
    }
  }

  return {
    finalAssistantMessage,
    hasAssistantActivity,
    lastAssistantMessageId,
    lastFinalMessageId,
    sessionId,
  } satisfies CodexRolloutSummary;
}

function safeJsonParse<T>(raw: string) {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
