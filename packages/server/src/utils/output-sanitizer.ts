const ANSI_ESCAPE_PATTERN =
  // CSI, OSC, DCS and a few stray control chars that break mobile rendering.
  /(?:\u001B\][^\u0007]*(?:\u0007|\u001B\\))|(?:\u001B[P^_][\s\S]*?\u001B\\)|(?:\u001B\[[0-?]*[ -/]*[@-~])|[\u0000\u0007\u0008\u000B\u000C]/g;

const CHAT_NOISE_PATTERNS = [
  /^[\u2500-\u257f\s]+$/, // Box-drawing horizontal lines
  /^❯/, // Shell prompt
  /^[^@\s]+@[^:\s]+:/, // user@host: prompt
  /^\s*\d+\s+tokens?\b/i, // Token counters
  /\b(current:|latest:|bypass permissions on)\b/i, // Status labels
  /\bSautéed for\b/i, // Claude decorative text
  /^\s*✻\s+/, // Decorative bullets
  /^\s*[╭╮╰╯│┌┐└┘├┤┬┴┼─═]+\s*$/, // TUI box borders
  /^\s*\[.*\]\s*$/, // Bracketed labels like [Status], [Tool]
  /^\s*⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏\s*/, // Spinner characters
  /^\s*╭+|╮+|╯+|╰+\s*$/, // Rounded corners
  /^\s*│.*│\s*$/, // Boxed content lines
  /^▁+|▂+|▃+|▄+|▅+|▆+|▇+|█+$/, // Progress bars
  /^\s*\(?thinking\)?|processing|waiting|\.+\s*$/i, // Thinking indicators
  /^\s*press\s+|hit\s+|type\s+|select\s+/i, // Key hints
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
