import { createHash } from 'node:crypto';
import type {
  ChatActionOption,
  ChatActionRequest,
  SurfaceRequirement,
} from '@codeject/shared';
import { sanitizeOutput } from './output-sanitizer.js';

const CONFIRM_PATTERN =
  /(?<prompt>.*?)(?:\s|\n)*(?:\((?<short>y\/n|n\/y)\)|(?<long>yes\/no|no\/yes)|\[(?<bracket>y\/n|n\/y|yes\/no|no\/yes)\])\??$/i;
const SELECT_LINE_PATTERN = /^(?<value>\d+)[.)]\s+(?<label>.+)$/;
const EXPLICIT_ENTER_PATTERN = /\b(press|hit)\s+(enter|return)\b/i;
const GENERIC_PROMPT_START_PATTERN = /^(enter|type|paste|provide|reply|input)\b/i;
const GENERIC_PROMPT_HINT_PATTERN =
  /\b(name|path|token|key|value|text|reply|message|input|answer|command|directory|folder|url|api)\b/i;
const NON_INPUT_LABEL_PATTERN =
  /^(steps?|note|summary|error|output|result|response|warning|tip|status|model|mode|session|workspace|context|branch|provider|profile|assistant|user|system|current|latest|directory)s?$/i;
const NON_INPUT_STATUS_PHRASE_PATTERN =
  /^(current|working|active|latest)\s+(directory|workspace|branch|session|model|status)$/i;
const CLAUSE_PUNCTUATION_PATTERN = /[.,;!]/;
const NARRATIVE_PRONOUN_PATTERN = /\b(i|you|we|they|he|she|it)\b/i;
const SHELL_PROMPT_PATTERN = /^(?:\$|#|>|❯|bruk@|current:)/i;
const UNSUPPORTED_TERMINAL_REQUIRED_PATTERNS = [
  /\b(approve|approval required|confirm action|confirm execution|allow tool)\b/i,
  /\b(use (the )?arrow keys|select an option|choose an option|pick an option)\b/i,
  /\b(y\/n|yes\/no)\b/i,
];

export interface TerminalInteractionAnalysis {
  actionRequest?: ChatActionRequest;
  reason?: string;
  requirement: SurfaceRequirement;
}

export function analyzeTerminalInteraction({
  snapshotText,
  transcriptText,
}: {
  snapshotText: string;
  transcriptText?: string | null;
}): TerminalInteractionAnalysis {
  const transcriptRequest = transcriptText
    ? extractActionRequest(transcriptText, 'transcript')
    : undefined;
  if (transcriptRequest) {
    return {
      actionRequest: transcriptRequest,
      reason: transcriptRequest.prompt,
      requirement: 'terminal-required',
    };
  }

  const snapshotRequest = extractActionRequest(snapshotText, 'terminal');
  if (snapshotRequest) {
    return {
      actionRequest: snapshotRequest,
      reason: snapshotRequest.prompt,
      requirement: 'terminal-required',
    };
  }

  const freeInputRequest = extractFreeInputRequest(snapshotText, 'terminal');
  if (freeInputRequest) {
    return {
      actionRequest: freeInputRequest,
      reason: freeInputRequest.prompt,
      requirement: 'terminal-required',
    };
  }

  const terminalRequiredReason = detectUnsupportedTerminalRequirement(snapshotText);
  if (terminalRequiredReason) {
    return {
      reason: terminalRequiredReason,
      requirement: 'terminal-required',
    };
  }

  return { requirement: 'terminal-available' };
}

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

export function extractFreeInputRequest(
  sourceText: string,
  source: Extract<ChatActionRequest, { kind: 'free-input' }>['source']
): ChatActionRequest | undefined {
  const normalized = normalizeSourceText(sourceText);
  if (!normalized) return undefined;

  const promptWindow = extractTailPromptWindow(normalized);
  if (!promptWindow) return undefined;

  return {
    context: promptWindow.context,
    id: buildActionId('free-input', `${promptWindow.prompt}:${promptWindow.context}`),
    kind: 'free-input',
    prompt: promptWindow.prompt,
    source,
  };
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
  const leadingPromptLines: string[] = [];
  const trailingPromptLines: string[] = [];
  let collectingOptions = false;
  let collectingTrailingPrompt = false;

  for (const line of lines) {
    const match = line.match(SELECT_LINE_PATTERN);
    if (match?.groups) {
      if (collectingTrailingPrompt) break;

      collectingOptions = true;
      options.push({
        label: normalizeOptionLabel(match.groups.label),
        submit: match.groups.value,
        value: match.groups.value,
      });
      continue;
    }

    if (!collectingOptions) {
      leadingPromptLines.push(line);
      continue;
    }

    collectingTrailingPrompt = true;
    trailingPromptLines.push(line);
  }

  if (options.length < 2) return undefined;

  const prompt = pickSingleSelectPrompt(leadingPromptLines, trailingPromptLines);
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

function pickSingleSelectPrompt(leadingPromptLines: string[], trailingPromptLines: string[]) {
  const promptCandidates = [
    normalizePrompt(trailingPromptLines.join(' ')),
    normalizePrompt(leadingPromptLines.join(' ')),
  ].filter(Boolean);

  return promptCandidates.find((prompt) => /\b(select|choose|pick|which|option)\b/i.test(prompt));
}

function detectUnsupportedTerminalRequirement(text: string) {
  const lines = normalizeSourceText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= Math.max(0, lines.length - 6); index -= 1) {
    if (!UNSUPPORTED_TERMINAL_REQUIRED_PATTERNS.some((pattern) => pattern.test(lines[index] ?? ''))) {
      continue;
    }

    return lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 2)).join(' ');
  }

  return undefined;
}

function extractTailPromptWindow(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const startIndex = Math.max(0, lines.length - 3);

  for (let index = lines.length - 1; index >= startIndex; index -= 1) {
    const line = lines[index];
    if (!isGenericPromptCandidate(line)) continue;

    return {
      context: lines.slice(Math.max(0, index - 2), index + 1).join('\n'),
      prompt: line,
    };
  }

  return undefined;
}

function isGenericPromptCandidate(line: string) {
  if (!line || line.length > 140) return false;
  if (SELECT_LINE_PATTERN.test(line)) return false;
  if (/^[-*•]\s+/.test(line) || /^#{1,6}\s/.test(line)) return false;
  if (/^```/.test(line) || /^[\u2500-\u257f\s]+$/.test(line)) return false;
  if (/^(?:https?:\/\/|www\.)/i.test(line) || SHELL_PROMPT_PATTERN.test(line)) return false;
  if (isLikelyNonInputLabel(line)) return false;

  const wordCount = line.split(/\s+/).length;
  const hasExplicitEnter = EXPLICIT_ENTER_PATTERN.test(line);
  const hasHint = GENERIC_PROMPT_HINT_PATTERN.test(line);
  const startsLikePrompt = GENERIC_PROMPT_START_PATTERN.test(line);
  const endsWithColon = /:$/.test(line);
  const endsWithQuestion = /\?$/.test(line);

  if (CLAUSE_PUNCTUATION_PATTERN.test(line.replace(/[:?]\s*$/, '')) && !hasExplicitEnter) {
    return false;
  }

  if (hasExplicitEnter) {
    return true;
  }

  if (startsLikePrompt && wordCount <= 6) {
    return true;
  }

  if (endsWithColon) {
    return hasHint && wordCount <= 5;
  }

  if (endsWithQuestion) {
    return hasHint && wordCount <= 4 && !NARRATIVE_PRONOUN_PATTERN.test(line);
  }

  return false;
}

function isLikelyNonInputLabel(line: string) {
  const normalizedLabel = line.replace(/[:?]\s*$/, '').trim();
  return (
    NON_INPUT_LABEL_PATTERN.test(normalizedLabel) ||
    NON_INPUT_STATUS_PHRASE_PATTERN.test(normalizedLabel)
  );
}

function buildActionId(kind: string, seed: string) {
  return createHash('sha1').update(`${kind}:${seed}`).digest('hex').slice(0, 12);
}
