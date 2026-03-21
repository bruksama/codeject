export type ProviderCommandPrefix = '/' | '$';

export function resolveProviderCommandPrefix(
  cliProgramId?: string | null
): ProviderCommandPrefix | null {
  if (cliProgramId === 'claude-code') {
    return '/';
  }

  if (cliProgramId === 'codex') {
    return '$';
  }

  return null;
}
