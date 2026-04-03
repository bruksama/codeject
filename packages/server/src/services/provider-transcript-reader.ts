import fs from 'node:fs/promises';
import path from 'node:path';
import { type Session } from '@codeject/shared';
import { expandHomePath } from '../adapters/base-cli-adapter.js';
import { parseClaudeTranscriptFile } from './claude-transcript-parser.js';
import { cliTranscriptPaths, encodeWorkspacePath } from './cli-transcript-paths.js';
import { parseCodexRolloutFile } from './codex-rollout-parser.js';
import { type SessionStore } from './session-store.js';

interface ResolvedTranscript {
  filePath: string;
  kind: 'claude' | 'codex';
}

interface ProviderRuntimeMetadata {
  provider: 'claude' | 'codex';
  providerSessionId?: string;
  transcriptPath?: string;
}

export type ProviderTranscriptState =
  | { provider: 'claude' | 'codex'; status: 'none'; updatedAt?: Date }
  | {
      provider: 'claude' | 'codex';
      status: 'working';
      providerMessageId?: string;
      updatedAt?: Date;
    }
  | {
      content: string;
      provider: 'claude' | 'codex';
      providerMessageId?: string;
      status: 'final';
      updatedAt?: Date;
    };

interface ProviderTranscriptResult {
  didPersistMetadata: boolean;
  state: ProviderTranscriptState | null;
}

export class ProviderTranscriptReader {
  private readonly resolvedPaths = new Map<string, ResolvedTranscript>();

  constructor(private readonly sessionStore: SessionStore) {}

  async readTranscriptState(session: Session) {
    const provider = getTranscriptProvider(session);
    if (!provider) {
      return {
        didPersistMetadata: false,
        state: null,
      } satisfies ProviderTranscriptResult;
    }

    const resolved = await this.resolveTranscriptPath(session);
    if (!resolved) {
      return {
        didPersistMetadata: false,
        state: {
          provider,
          status: 'none',
        },
      } satisfies ProviderTranscriptResult;
    }

    const stats = await fs.stat(resolved.filePath).catch(() => null);
    const updatedAt = stats ? new Date(stats.mtimeMs) : undefined;

    if (resolved.kind === 'claude') {
      const transcript = await parseClaudeTranscriptFile(resolved.filePath).catch(() => null);
      const didPersistMetadata = await this.persistMetadata(session, {
        provider: 'claude',
        providerSessionId: transcript?.sessionId,
        transcriptPath: resolved.filePath,
      });
      const state = downgradeStaleFinalState(session, mapClaudeTranscriptState(transcript, updatedAt));
      return {
        didPersistMetadata,
        state,
      } satisfies ProviderTranscriptResult;
    }

    const rollout = await parseCodexRolloutFile(resolved.filePath).catch(() => null);
    const didPersistMetadata = await this.persistMetadata(session, {
      provider: 'codex',
      providerSessionId: rollout?.sessionId,
      transcriptPath: resolved.filePath,
    });
    const state = downgradeStaleFinalState(session, mapCodexTranscriptState(rollout, updatedAt));
    return {
      didPersistMetadata,
      state,
    } satisfies ProviderTranscriptResult;
  }

  private async resolveTranscriptPath(session: Session) {
    const persisted = session.providerRuntime?.transcriptPath;
    const persistedResolved =
      persisted && (await fileExists(persisted))
        ? ({
            filePath: persisted,
            kind: session.providerRuntime?.provider === 'codex' ? 'codex' : 'claude',
          } satisfies ResolvedTranscript)
        : null;

    const cached = this.resolvedPaths.get(session.id);
    const cachedResolved = cached && (await fileExists(cached.filePath)) ? cached : null;
    const current = persistedResolved ?? cachedResolved;

    if (current && !(await shouldRefreshTranscriptPath(session, current.filePath))) {
      return current;
    }

    const next =
      (await this.resolveClaudeTranscriptPath(session)) ??
      (await this.resolveCodexRolloutPath(session, current?.filePath));

    if (next) {
      this.resolvedPaths.set(session.id, next);
    }

    return next ?? current;
  }

  private async persistMetadata(session: Session, metadata: ProviderRuntimeMetadata) {
    const nextProviderRuntime = {
      ...session.providerRuntime,
      ...metadata,
    };
    if (
      session.providerRuntime?.provider === nextProviderRuntime.provider &&
      session.providerRuntime?.providerSessionId === nextProviderRuntime.providerSessionId &&
      session.providerRuntime?.transcriptPath === nextProviderRuntime.transcriptPath &&
      session.providerRuntime?.hookToken === nextProviderRuntime.hookToken
    ) {
      return false;
    }

    await this.sessionStore.updateSession(session.id, {
      providerRuntime: nextProviderRuntime,
    });
    return true;
  }

  private async resolveClaudeTranscriptPath(session: Session) {
    if (!isClaudeSession(session)) return null;
    const projectDir = path.join(
      cliTranscriptPaths.claudeProjectsDir,
      encodeWorkspacePath(normalizeWorkspacePath(session.workspacePath))
    );
    const files = await listJsonlFiles(projectDir);
    const filePath = await pickLatestFile(files, session.createdAt);
    return filePath ? { filePath, kind: 'claude' as const } : null;
  }

  private async resolveCodexRolloutPath(session: Session, currentFilePath?: string) {
    if (!isCodexSession(session)) return null;
    const files = await listJsonlFiles(cliTranscriptPaths.codexSessionsDir, true);
    let best: { filePath: string; mtimeMs: number } | null = null;
    const workspacePath = normalizeWorkspacePath(session.workspacePath);
    const currentMtimeMs = currentFilePath
      ? (await fs.stat(currentFilePath).catch(() => null))?.mtimeMs ?? 0
      : 0;

    for (const filePath of files) {
      const meta = await readCodexSessionMeta(filePath);
      if (meta?.cwd !== workspacePath) continue;
      if (meta.mtimeMs < session.createdAt.getTime()) continue;
      if (meta.mtimeMs <= currentMtimeMs) continue;
      if (!best || meta.mtimeMs > best.mtimeMs) {
        best = { filePath, mtimeMs: meta.mtimeMs };
      }
    }

    return best ? { filePath: best.filePath, kind: 'codex' as const } : null;
  }
}

async function listJsonlFiles(rootDir: string, recursive = false) {
  try {
    const entries = await fs.readdir(rootDir, { recursive, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
      .map((entry) => path.join(entry.parentPath, entry.name));
  } catch {
    return [];
  }
}

async function pickLatestFile(files: string[], minTimestamp: Date) {
  let best: { filePath: string; mtimeMs: number } | null = null;
  for (const filePath of files) {
    const stats = await fs.stat(filePath).catch(() => null);
    if (!stats || stats.mtimeMs < minTimestamp.getTime()) continue;
    if (!best || stats.mtimeMs > best.mtimeMs) {
      best = { filePath, mtimeMs: stats.mtimeMs };
    }
  }
  return best?.filePath ?? null;
}

async function readCodexSessionMeta(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf8').catch(() => null);
  const firstLine = raw?.split('\n').find(Boolean);
  if (!firstLine) return null;
  try {
    const parsed = JSON.parse(firstLine) as { payload?: { cwd?: string } };
    const stats = await fs.stat(filePath);
    return { cwd: parsed.payload?.cwd, mtimeMs: stats.mtimeMs };
  } catch {
    return null;
  }
}

async function fileExists(filePath: string) {
  return Boolean(await fs.stat(filePath).catch(() => null));
}

function isClaudeSession(session: Session) {
  return getTranscriptProvider(session) === 'claude';
}

function isCodexSession(session: Session) {
  return getTranscriptProvider(session) === 'codex';
}

export function getTranscriptProvider(session: Session) {
  if (session.providerRuntime?.provider === 'claude' || session.providerRuntime?.provider === 'codex') {
    return session.providerRuntime.provider;
  }

  if (session.cliProgram.id === 'claude-code' || session.cliProgram.command.includes('claude')) {
    return 'claude';
  }

  if (session.cliProgram.id === 'codex' || /\bcodex\b/.test(session.cliProgram.command)) {
    return 'codex';
  }

  return null;
}

function normalizeWorkspacePath(workspacePath: string) {
  return path.resolve(expandHomePath(workspacePath));
}

async function shouldRefreshTranscriptPath(session: Session, filePath: string) {
  if (session.providerRuntime?.provider !== 'codex') {
    return false;
  }

  const phase = session.chatState?.phase;
  if (phase !== 'awaiting-assistant' && phase !== 'streaming-assistant') {
    return false;
  }

  const transcriptUpdatedAt = session.chatState?.transcriptUpdatedAt?.getTime();
  if (!transcriptUpdatedAt) {
    return false;
  }

  const stats = await fs.stat(filePath).catch(() => null);
  if (!stats) {
    return true;
  }

  return stats.mtimeMs <= transcriptUpdatedAt;
}

function mapClaudeTranscriptState(
  transcript:
    | {
        finalAssistantMessage: string;
        hasAssistantActivity: boolean;
        lastAssistantMessageId: string | null;
        lastFinalMessageId: string | null;
      }
    | null,
  updatedAt?: Date
): ProviderTranscriptState {
  if (!transcript?.hasAssistantActivity) {
    return {
      provider: 'claude',
      status: 'none',
      updatedAt,
    };
  }

  const finalContent = transcript.finalAssistantMessage.trim();
  if (
    finalContent &&
    transcript.lastFinalMessageId &&
    transcript.lastFinalMessageId === transcript.lastAssistantMessageId
  ) {
    return {
      content: finalContent,
      provider: 'claude',
      providerMessageId: transcript.lastFinalMessageId ?? undefined,
      status: 'final',
      updatedAt,
    };
  }

  return {
    provider: 'claude',
    providerMessageId: transcript.lastAssistantMessageId ?? undefined,
    status: 'working',
    updatedAt,
  };
}

function mapCodexTranscriptState(
  transcript:
    | {
        finalAssistantMessage: string;
        hasAssistantActivity: boolean;
        lastAssistantMessageId: string | null;
        lastFinalMessageId: string | null;
      }
    | null,
  updatedAt?: Date
): ProviderTranscriptState {
  if (!transcript?.hasAssistantActivity) {
    return {
      provider: 'codex',
      status: 'none',
      updatedAt,
    };
  }

  const finalContent = transcript.finalAssistantMessage.trim();
  if (
    finalContent &&
    transcript.lastFinalMessageId &&
    transcript.lastFinalMessageId === transcript.lastAssistantMessageId
  ) {
    return {
      content: finalContent,
      provider: 'codex',
      providerMessageId: transcript.lastFinalMessageId ?? undefined,
      status: 'final',
      updatedAt,
    };
  }

  return {
    provider: 'codex',
    providerMessageId: transcript.lastAssistantMessageId ?? undefined,
    status: 'working',
    updatedAt,
  };
}

function downgradeStaleFinalState(session: Session, state: ProviderTranscriptState): ProviderTranscriptState {
  if (state.status !== 'final') {
    return state;
  }

  const stateUpdatedAt = state.updatedAt?.getTime();
  const sessionTranscriptUpdatedAt = session.chatState?.transcriptUpdatedAt?.getTime();
  if (!stateUpdatedAt || !sessionTranscriptUpdatedAt || stateUpdatedAt >= sessionTranscriptUpdatedAt) {
    return state;
  }

  return {
    provider: state.provider,
    status: 'none',
    updatedAt: state.updatedAt,
  };
}
