import {
  engineerKitStableCommands,
  type EngineerKitStableCommand,
} from '@/lib/engineer-kit-stable-commands';
import {
  resolveProviderCommandPrefix,
  type ProviderCommandPrefix,
} from '@/lib/provider-command-prefix';

const COMMAND_NAMESPACE = 'ck:';

export interface FirstTokenMatch {
  leadingWhitespace: string;
  token: string;
  remainder: string;
}

export interface ProviderAwareCommandQueryResult {
  normalizedQuery: string;
  providerPrefix: ProviderCommandPrefix;
  suggestions: EngineerKitStableCommand[];
}

export function parseFirstToken(value: string): FirstTokenMatch {
  const leadingWhitespace = value.match(/^\s*/)?.[0] ?? '';
  const content = value.slice(leadingWhitespace.length);
  const firstWhitespaceIndex = content.search(/\s/);

  if (firstWhitespaceIndex === -1) {
    return {
      leadingWhitespace,
      token: content,
      remainder: '',
    };
  }

  return {
    leadingWhitespace,
    token: content.slice(0, firstWhitespaceIndex),
    remainder: content.slice(firstWhitespaceIndex),
  };
}

export function getProviderAwareCommandQueryResult(
  cliProgramId: string | null | undefined,
  draft: string,
  limit = 6
): ProviderAwareCommandQueryResult | null {
  const providerPrefix = resolveProviderCommandPrefix(cliProgramId);
  if (!providerPrefix) {
    return null;
  }

  const { token } = parseFirstToken(draft);
  const normalizedQuery = normalizeProviderAwareCommandQuery(token, providerPrefix);
  if (normalizedQuery === null) {
    return null;
  }

  return {
    normalizedQuery,
    providerPrefix,
    suggestions: rankEngineerKitCommands(normalizedQuery, limit),
  };
}

export function replaceFirstTokenWithProviderCommand(
  draft: string,
  providerPrefix: ProviderCommandPrefix,
  commandId: string
): string {
  const { leadingWhitespace, remainder } = parseFirstToken(draft);
  const insertedCommand = `${providerPrefix}${commandId}`;
  return `${leadingWhitespace}${insertedCommand}${remainder || ' '}`;
}

export function normalizeProviderAwareCommandQuery(
  token: string,
  providerPrefix: ProviderCommandPrefix
): string | null {
  if (!token) {
    return null;
  }

  if (token === providerPrefix) {
    return COMMAND_NAMESPACE;
  }

  const namespacePrefix = `${providerPrefix}${COMMAND_NAMESPACE}`;
  if (namespacePrefix.startsWith(token)) {
    return COMMAND_NAMESPACE;
  }

  if (!token.startsWith(namespacePrefix)) {
    return null;
  }

  return `${COMMAND_NAMESPACE}${token.slice(namespacePrefix.length)}`;
}

function rankEngineerKitCommands(
  normalizedQuery: string,
  limit: number
): EngineerKitStableCommand[] {
  const querySuffix = normalizedQuery.slice(COMMAND_NAMESPACE.length).toLowerCase();

  return engineerKitStableCommands
    .map((command) => ({
      command,
      score: getCommandScore(command, normalizedQuery, querySuffix),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.command.id.localeCompare(right.command.id);
    })
    .slice(0, limit)
    .map((entry) => entry.command);
}

function getCommandScore(
  command: EngineerKitStableCommand,
  normalizedQuery: string,
  querySuffix: string
): number {
  if (normalizedQuery === COMMAND_NAMESPACE) {
    return 100;
  }

  const normalizedId = command.id.toLowerCase();
  const normalizedTitle = command.title.toLowerCase();
  const normalizedDescription = command.description.toLowerCase();
  const normalizedArgsHint = command.argsHint?.toLowerCase() ?? '';

  if (normalizedId === normalizedQuery) {
    return 500;
  }

  if (normalizedId.startsWith(normalizedQuery)) {
    return 400 - normalizedId.length;
  }

  if (normalizedTitle.startsWith(querySuffix)) {
    return 300 - normalizedTitle.length;
  }

  if (normalizedId.includes(querySuffix)) {
    return 220 - normalizedId.indexOf(querySuffix);
  }

  if (normalizedArgsHint.includes(querySuffix)) {
    return 160 - normalizedArgsHint.indexOf(querySuffix);
  }

  if (normalizedDescription.includes(querySuffix)) {
    return 120 - normalizedDescription.indexOf(querySuffix);
  }

  return 0;
}
