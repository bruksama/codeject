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
  lastAssistantMessage: string;
  sessionId: string;
}

export async function parseCodexRolloutFile(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  let lastAssistantMessage = '';
  let fallbackAssistantMessage = '';
  let sessionId = '';

  for (const line of lines) {
    const entry = safeJsonParse<CodexRolloutEntry>(line);
    const payload = entry?.payload;
    if (entry?.type === 'session_meta' && payload?.id) {
      sessionId = payload.id;
    }
    if (entry?.type !== 'response_item' || payload?.type !== 'message' || payload.role !== 'assistant') {
      continue;
    }

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
      lastAssistantMessage = text;
      continue;
    }

    if (payload.phase !== 'commentary') {
      fallbackAssistantMessage = text;
    }
  }

  return {
    lastAssistantMessage: lastAssistantMessage || fallbackAssistantMessage,
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
