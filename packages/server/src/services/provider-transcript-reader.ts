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

interface ProviderTranscriptResult {
  content: string | null;
  didPersistMetadata: boolean;
}

interface ProviderRuntimeMetadata {
  provider: 'claude' | 'codex';
  providerSessionId?: string;
  transcriptPath?: string;
}

export class ProviderTranscriptReader {
  private readonly resolvedPaths = new Map<string, ResolvedTranscript>();

  constructor(private readonly sessionStore: SessionStore) {}

  async readAssistantMessage(session: Session) {
    const resolved = await this.resolveTranscriptPath(session);
    if (!resolved) {
      return {
        content: null,
        didPersistMetadata: false,
      } satisfies ProviderTranscriptResult;
    }

    if (resolved.kind === 'claude') {
      const transcript = await parseClaudeTranscriptFile(resolved.filePath).catch(() => null);
      const didPersistMetadata = await this.persistMetadata(session, {
        provider: 'claude',
        providerSessionId: transcript?.sessionId,
        transcriptPath: resolved.filePath,
      });
      return {
        content: transcript?.lastAssistantMessage || null,
        didPersistMetadata,
      } satisfies ProviderTranscriptResult;
    }

    const rollout = await parseCodexRolloutFile(resolved.filePath).catch(() => null);
    const didPersistMetadata = await this.persistMetadata(session, {
      provider: 'codex',
      providerSessionId: rollout?.sessionId,
      transcriptPath: resolved.filePath,
    });
    return {
      content: rollout?.lastAssistantMessage || null,
      didPersistMetadata,
    } satisfies ProviderTranscriptResult;
  }

  private async resolveTranscriptPath(session: Session) {
    const persisted = session.providerRuntime?.transcriptPath;
    if (persisted && (await fileExists(persisted))) {
      return {
        filePath: persisted,
        kind: session.providerRuntime?.provider === 'codex' ? 'codex' : 'claude',
      } satisfies ResolvedTranscript;
    }

    const cached = this.resolvedPaths.get(session.id);
    if (cached && (await fileExists(cached.filePath))) {
      return cached;
    }

    const next =
      (await this.resolveClaudeTranscriptPath(session)) ?? (await this.resolveCodexRolloutPath(session));

    if (next) {
      this.resolvedPaths.set(session.id, next);
    }

    return next;
  }

  private async persistMetadata(session: Session, metadata: ProviderRuntimeMetadata) {
    if (
      session.providerRuntime?.provider === metadata.provider &&
      session.providerRuntime?.providerSessionId === metadata.providerSessionId &&
      session.providerRuntime?.transcriptPath === metadata.transcriptPath
    ) {
      return false;
    }

    await this.sessionStore.updateSession(session.id, {
      providerRuntime: metadata,
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

  private async resolveCodexRolloutPath(session: Session) {
    if (!isCodexSession(session)) return null;
    const files = await listJsonlFiles(cliTranscriptPaths.codexSessionsDir, true);
    let best: { filePath: string; mtimeMs: number } | null = null;
    const workspacePath = normalizeWorkspacePath(session.workspacePath);

    for (const filePath of files) {
      const meta = await readCodexSessionMeta(filePath);
      if (meta?.cwd !== workspacePath) continue;
      if (meta.mtimeMs < session.createdAt.getTime()) continue;
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
  return session.cliProgram.id === 'claude-code' || session.cliProgram.command.includes('claude');
}

function isCodexSession(session: Session) {
  return session.cliProgram.id === 'codex' || /\bcodex\b/.test(session.cliProgram.command);
}

function normalizeWorkspacePath(workspacePath: string) {
  return path.resolve(expandHomePath(workspacePath));
}
