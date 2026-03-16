const ANSI_ESCAPE_PATTERN =
  // CSI, OSC, DCS and a few stray control chars that break mobile rendering.
  /(?:\u001B\][^\u0007]*(?:\u0007|\u001B\\))|(?:\u001B[P^_][\s\S]*?\u001B\\)|(?:\u001B\[[0-?]*[ -/]*[@-~])|[\u0000\u0007\u0008\u000B\u000C]/g;

const CHAT_NOISE_PATTERNS = [
  /^[\u2500-\u257f\s]+$/,
  /^❯/,
  /^[^@\s]+@[^:\s]+:/,
  /^\s*\d+\s+tokens?\b/i,
  /\b(current:|latest:|bypass permissions on)\b/i,
  /\bSautéed for\b/i,
  /^\s*✻\s+/,
];

export function sanitizeOutput(raw: string) {
  return raw.replace(ANSI_ESCAPE_PATTERN, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function extractChatResponseFromTerminal(raw: string) {
  const cleaned = sanitizeOutput(raw);
  const lines = cleaned.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const normalized = line.trimEnd();
    if (!normalized.trim()) {
      if (result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    if (CHAT_NOISE_PATTERNS.some((pattern) => pattern.test(normalized))) {
      continue;
    }

    result.push(normalized);
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
