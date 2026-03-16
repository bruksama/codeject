import { createHash } from 'node:crypto';
import type { ChatActionOption, ChatActionRequest } from '@codeject/shared';
import { sanitizeOutput } from './output-sanitizer.js';

const CONFIRM_PATTERN =
  /(?<prompt>.*?)(?:\s|\n)*(?:\((?<short>y\/n|n\/y)\)|(?<long>yes\/no|no\/yes)|\[(?<bracket>y\/n|n\/y|yes\/no|no\/yes)\])\??$/i;
const SELECT_LINE_PATTERN = /^(?<value>\d+)[.)]\s+(?<label>.+)$/;

export function extractActionRequest(
  sourceText: string,
  source: ChatActionRequest['source']
): ChatActionRequest | undefined {
  const normalized = normalizeSourceText(sourceText);
  if (!normalized) return undefined;

  const confirmRequest = extractConfirmRequest(normalized, source);
  if (confirmRequest) return confirmRequest;

  return extractSingleSelectRequest(normalized, source);
}

function extractConfirmRequest(
  text: string,
  source: ChatActionRequest['source']
): ChatActionRequest | undefined {
  const match = text.match(CONFIRM_PATTERN);
  if (!match?.groups) return undefined;

  const prompt = normalizePrompt(match.groups.prompt);
  if (!prompt || prompt.length < 4) return undefined;

  return {
    id: buildActionId('confirm', prompt),
    kind: 'confirm',
    options: [
      { label: 'Yes', submit: 'y', value: 'yes' },
      { label: 'No', submit: 'n', value: 'no' },
    ],
    prompt,
    source,
  };
}

function extractSingleSelectRequest(
  text: string,
  source: ChatActionRequest['source']
): ChatActionRequest | undefined {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const options: ChatActionOption[] = [];
  let promptLines: string[] = [];

  for (const line of lines) {
    const match = line.match(SELECT_LINE_PATTERN);
    if (!match?.groups) {
      if (options.length > 0) break;
      promptLines.push(line);
      continue;
    }

    options.push({
      label: normalizeOptionLabel(match.groups.label),
      submit: match.groups.value,
      value: match.groups.value,
    });
  }

  if (options.length < 2) return undefined;

  const prompt = normalizePrompt(promptLines.join(' '));
  if (!prompt || !/\b(select|choose|pick|which|option)\b/i.test(prompt)) {
    return undefined;
  }

  return {
    id: buildActionId('single-select', `${prompt}:${options.map((option) => option.value).join(',')}`),
    kind: 'single-select',
    options,
    prompt,
    source,
  };
}

function normalizeSourceText(text: string) {
  return sanitizeOutput(text).replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function normalizePrompt(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().replace(/[:\-]+$/, '').trim();
}

function normalizeOptionLabel(label: string) {
  return label.replace(/\s+/g, ' ').trim();
}

function buildActionId(kind: string, seed: string) {
  return createHash('sha1').update(`${kind}:${seed}`).digest('hex').slice(0, 12);
}
