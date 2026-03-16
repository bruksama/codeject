import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import {
  type ChatActionRequest,
  type ChatState,
  type Message,
  type Session,
  type SurfaceMode,
  type SurfaceRequirement,
  type TerminalSnapshot,
} from '@codeject/shared';
import { ProviderTranscriptReader } from './provider-transcript-reader.js';
import { type SessionStore } from './session-store.js';
import { extractChatResponseFromTerminal, sanitizeOutput } from '../utils/output-sanitizer.js';
import { extractActionRequest } from '../utils/action-request-extractor.js';

interface SupervisorEvents {
  'chat:message': [sessionId: string, message: Message];
  'chat:update': [sessionId: string, messageId: string, content: string, isStreaming: boolean];
  'surface:update': [
    sessionId: string,
    payload: { chatState?: ChatState; mode: SurfaceMode; reason?: string; requirement: SurfaceRequirement },
  ];
}

const ASSISTANT_IDLE_MS = 1200;
const TERMINAL_REQUIRED_PATTERNS = [
  /(press|hit)\s+(enter|return)\s+to\s+(continue|approve|confirm)/i,
  /\b(approve|approval required|confirm action|confirm execution|allow tool)\b/i,
  /\b(use (the )?arrow keys|select an option|choose an option|pick an option)\b/i,
  /\b(y\/n|yes\/no)\b/i,
];

export class SessionSupervisor extends EventEmitter<SupervisorEvents> {
  private readonly assistantTimers = new Map<string, NodeJS.Timeout>();
  private readonly transcriptReader: ProviderTranscriptReader;

  constructor(private readonly sessionStore: SessionStore) {
    super();
    this.transcriptReader = new ProviderTranscriptReader(sessionStore);
  }

  async getBootstrap(sessionId: string) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return null;
    const syncedSession = await this.syncBootstrapTranscript(session);
    return {
      chatState: syncedSession.chatState,
      messages: syncedSession.messages,
      surfaceMode: syncedSession.surfaceMode,
      surfaceRequirement: syncedSession.surfaceRequirement,
    };
  }

  async handleChatPrompt(sessionId: string, content: string) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session || !content.trim()) return null;
    this.clearAssistantTimer(sessionId);
    const timestamp = new Date();
    const userMessage: Message = {
      content: content.trim(),
      id: uuidv4(),
      role: 'user',
      timestamp,
    };
    const assistantMessage: Message = {
      content: '',
      id: uuidv4(),
      isStreaming: true,
      role: 'assistant',
      timestamp,
    };
    const chatState: ChatState = {
      actionRequest: undefined,
      lastAssistantMessageId: assistantMessage.id,
      lastPrompt: userMessage.content,
      phase: 'awaiting-assistant',
      transcriptUpdatedAt: timestamp,
    };
    await this.sessionStore.updateSession(sessionId, {
      chatState,
      lastMessageAt: timestamp,
      messages: [...session.messages, userMessage, assistantMessage],
      surfaceMode: 'chat',
      surfaceRequirement: 'terminal-available',
    });
    this.emit('chat:message', sessionId, userMessage);
    this.emit('chat:message', sessionId, assistantMessage);
    this.emit('surface:update', sessionId, {
      chatState,
      mode: 'chat',
      requirement: 'terminal-available',
    });
    return userMessage;
  }

  async handleSurfaceModeChange(sessionId: string, mode: SurfaceMode) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return null;
    const nextSession = await this.sessionStore.updateSession(sessionId, { surfaceMode: mode });
    if (!nextSession) return null;
    this.emit('surface:update', sessionId, {
      chatState: nextSession.chatState,
      mode,
      reason: nextSession.chatState?.terminalRequiredReason,
      requirement: nextSession.surfaceRequirement,
    });
    return nextSession;
  }

  async handleStatus(sessionId: string, status: Session['status']) {
    if (status !== 'idle' && status !== 'error' && status !== 'disconnected') return;
    await this.finalizeAssistantMessage(sessionId);
  }

  async handleTerminalSnapshot(sessionId: string, snapshot: TerminalSnapshot) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    const detection = detectTerminalRequirement(snapshot.content);
    const nextRequirement: SurfaceRequirement = detection ? 'terminal-required' : 'terminal-available';
    const transcriptResult = detection ? null : await this.transcriptReader.readAssistantMessage(session);
    const transcriptContent = shouldAcceptTranscriptResult(session, transcriptResult)
      ? transcriptResult?.content ?? null
      : null;
    const nextChatState = deriveChatState(session, {
      actionRequest: deriveActionRequest({
        detectionReason: detection?.reason,
        snapshot: snapshot.content,
        transcriptContent,
      }),
      reason: detection?.reason,
    });
    const terminalAssistantContent = deriveTerminalAssistantFallback(session, snapshot.content);
    const assistantContent =
      transcriptContent || (detection ? '' : terminalAssistantContent);

    if (
      nextRequirement !== session.surfaceRequirement ||
      nextChatState.phase !== session.chatState?.phase ||
      nextChatState.terminalRequiredReason !== session.chatState?.terminalRequiredReason ||
      nextChatState.actionRequest?.id !== session.chatState?.actionRequest?.id
    ) {
      await this.sessionStore.updateSession(sessionId, {
        chatState: nextChatState,
        surfaceRequirement: nextRequirement,
      });
      this.emit('surface:update', sessionId, {
        chatState: nextChatState,
        mode: session.surfaceMode,
        reason: detection?.reason,
        requirement: nextRequirement,
      });
    }

    if (!assistantContent) return;
    await this.upsertAssistantMessage(sessionId, assistantContent);
  }

  private async upsertAssistantMessage(sessionId: string, content: string) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    const currentMessage = session.chatState?.lastAssistantMessageId
      ? session.messages.find((message) => message.id === session.chatState?.lastAssistantMessageId)
      : undefined;
    if (isStaleAssistantCarryover(session, currentMessage, content)) {
      return;
    }
    if (currentMessage?.content === content) return;

    const timestamp = new Date();
    if (!currentMessage) {
      const message: Message = {
        content,
        id: uuidv4(),
        isStreaming: true,
        role: 'assistant',
        timestamp,
      };
      const chatState: ChatState = {
        actionRequest: session.chatState?.actionRequest,
        lastAssistantMessageId: message.id,
        lastPrompt: session.chatState?.lastPrompt,
        phase: 'streaming-assistant',
        transcriptUpdatedAt: timestamp,
      };
      await this.sessionStore.updateSession(session.id, {
        chatState,
        lastMessageAt: timestamp,
        messages: [...session.messages, message],
      });
      this.emit('chat:message', session.id, message);
      this.emit('surface:update', session.id, {
        chatState,
        mode: session.surfaceMode,
        reason: chatState.terminalRequiredReason,
        requirement: session.surfaceRequirement,
      });
      this.scheduleAssistantFinalize(session.id);
      return;
    }

    const chatState: ChatState = {
      ...session.chatState,
      phase: 'streaming-assistant',
      transcriptUpdatedAt: timestamp,
    };
    await this.sessionStore.updateSession(session.id, {
      chatState,
      lastMessageAt: timestamp,
      messages: session.messages.map((message) =>
        message.id === currentMessage.id ? { ...message, content, isStreaming: true, timestamp } : message
      ),
    });
    this.emit('chat:update', session.id, currentMessage.id, content, true);
    this.emit('surface:update', session.id, {
      chatState,
      mode: session.surfaceMode,
      reason: chatState.terminalRequiredReason,
      requirement: session.surfaceRequirement,
    });
    this.scheduleAssistantFinalize(session.id);
  }

  private scheduleAssistantFinalize(sessionId: string) {
    this.clearAssistantTimer(sessionId);
    this.assistantTimers.set(
      sessionId,
      setTimeout(() => void this.finalizeAssistantMessage(sessionId), ASSISTANT_IDLE_MS)
    );
  }

  private clearAssistantTimer(sessionId: string) {
    const timer = this.assistantTimers.get(sessionId);
    if (!timer) return;
    clearTimeout(timer);
    this.assistantTimers.delete(sessionId);
  }

  private async syncBootstrapTranscript(session: Session) {
    const transcriptResult = await this.transcriptReader.readAssistantMessage(session).catch(() => null);
    const transcriptContent = shouldAcceptTranscriptResult(session, transcriptResult)
      ? transcriptResult?.content?.trim()
      : undefined;
    if (!transcriptContent) return session;

    const trackedAssistantMessageId = session.chatState?.lastAssistantMessageId;
    const latestAssistant = [...session.messages].reverse().find((message) => message.role === 'assistant');
    const isAwaitingFreshAssistant =
      !trackedAssistantMessageId &&
      (session.chatState?.phase === 'awaiting-assistant' || session.chatState?.phase === 'streaming-assistant');

    if (isAwaitingFreshAssistant && latestAssistant?.content !== transcriptContent) {
      const timestamp = new Date();
      const message: Message = {
        content: transcriptContent,
        id: uuidv4(),
        isStreaming: false,
        role: 'assistant',
        timestamp,
      };

      return (
        (await this.sessionStore.updateSession(session.id, {
          chatState: {
            ...session.chatState,
            lastAssistantMessageId: message.id,
            phase: session.chatState?.phase ?? 'idle',
            transcriptUpdatedAt: timestamp,
          },
          lastMessageAt: timestamp,
          messages: [...session.messages, message],
        })) ?? session
      );
    }

    const lastAssistantMessageId = trackedAssistantMessageId ?? latestAssistant?.id;
    if (!lastAssistantMessageId) return session;

    const currentMessage = session.messages.find((message) => message.id === lastAssistantMessageId);
    if (currentMessage?.content === transcriptContent && !currentMessage.isStreaming) {
      return session;
    }

    const timestamp = new Date();
    return (
      (await this.sessionStore.updateSession(session.id, {
        chatState: {
          ...session.chatState,
          lastAssistantMessageId,
          phase: session.chatState?.phase ?? 'idle',
          transcriptUpdatedAt: timestamp,
        },
        lastMessageAt: timestamp,
        messages: session.messages.map((message) =>
          message.id === lastAssistantMessageId
            ? { ...message, content: transcriptContent, isStreaming: false, timestamp }
            : message
        ),
      })) ?? session
    );
  }

  private async finalizeAssistantMessage(sessionId: string) {
    this.clearAssistantTimer(sessionId);
    const session = await this.sessionStore.getSession(sessionId);
    const messageId = session?.chatState?.lastAssistantMessageId;
    if (!session || !messageId) return;
    const message = session.messages.find((entry) => entry.id === messageId);
    if (!message?.isStreaming) return;
    const chatState: ChatState = {
      ...session.chatState,
      lastAssistantMessageId: message.content.trim() ? messageId : undefined,
      phase: session.surfaceRequirement === 'terminal-required' ? 'terminal-required' : 'idle',
    };
    const nextMessages = message.content.trim()
      ? session.messages.map((entry) => (entry.id === messageId ? { ...entry, isStreaming: false } : entry))
      : session.messages.filter((entry) => entry.id !== messageId);
    await this.sessionStore.updateSession(sessionId, {
      chatState,
      messages: nextMessages,
    });
    this.emit('chat:update', sessionId, messageId, message.content, false);
    this.emit('surface:update', sessionId, {
      chatState,
      mode: session.surfaceMode,
      reason: chatState.terminalRequiredReason,
      requirement: session.surfaceRequirement,
    });
  }
}

function isStaleAssistantCarryover(
  session: Session,
  currentMessage: Message | undefined,
  content: string
) {
  const trimmedContent = content.trim();
  if (!trimmedContent) return false;

  const isFreshPlaceholder =
    currentMessage?.role === 'assistant' &&
    currentMessage.isStreaming === true &&
    !currentMessage.content.trim() &&
    (session.chatState?.phase === 'awaiting-assistant' ||
      session.chatState?.phase === 'streaming-assistant');

  if (!isFreshPlaceholder) {
    return false;
  }

  const previousSettledAssistant = [...session.messages]
    .reverse()
    .find(
      (message) =>
        message.id !== currentMessage.id &&
        message.role === 'assistant' &&
        !message.isStreaming &&
        message.content.trim()
    );

  return previousSettledAssistant?.content.trim() === trimmedContent;
}

function shouldAcceptTranscriptResult(
  session: Session,
  transcriptResult: { content: string | null; updatedAt?: Date } | null
) {
  if (!transcriptResult?.content?.trim()) return false;

  const transcriptUpdatedAt = transcriptResult.updatedAt?.getTime();
  const sessionTranscriptUpdatedAt = session.chatState?.transcriptUpdatedAt?.getTime();

  if (!transcriptUpdatedAt || !sessionTranscriptUpdatedAt) {
    return true;
  }

  return transcriptUpdatedAt > sessionTranscriptUpdatedAt;
}

function deriveTerminalAssistantFallback(session: Session, snapshotContent: string) {
  if (session.providerRuntime?.provider === 'claude') {
    return deriveClaudeTerminalAssistantContent(snapshotContent, session.chatState?.lastPrompt);
  }

  if (session.providerRuntime?.provider === 'codex') {
    return '';
  }

  return deriveAssistantContent(snapshotContent, session.chatState?.lastPrompt);
}

function deriveChatState(
  session: Session,
  {
    actionRequest,
    reason,
  }: {
    actionRequest?: ChatActionRequest;
    reason: string | undefined;
  }
): ChatState {
  if (reason) {
    return {
      ...session.chatState,
      actionRequest,
      phase: 'terminal-required',
      terminalRequiredReason: reason,
      transcriptUpdatedAt: new Date(),
    };
  }
  return {
    ...session.chatState,
    actionRequest: undefined,
    phase: session.chatState?.phase === 'terminal-required' ? 'idle' : (session.chatState?.phase ?? 'idle'),
    terminalRequiredReason: undefined,
    transcriptUpdatedAt: new Date(),
  };
}

function deriveActionRequest({
  detectionReason,
  snapshot,
  transcriptContent,
}: {
  detectionReason?: string;
  snapshot: string;
  transcriptContent: string | null;
}) {
  const transcriptRequest = transcriptContent ? extractActionRequest(transcriptContent, 'transcript') : undefined;
  if (transcriptRequest) return transcriptRequest;
  if (!detectionReason) return undefined;
  return extractActionRequest(snapshot, 'terminal');
}

function deriveAssistantContent(content: string, lastPrompt: string | undefined) {
  const sanitized = extractChatResponseFromTerminal(content);
  const lines = sanitized.split('\n').map((line) => line.trimEnd());
  const trimmedPrompt = lastPrompt?.trim();
  const anchorIndex = trimmedPrompt ? findLastPromptLine(lines, trimmedPrompt) : -1;
  if (trimmedPrompt && anchorIndex < 0) return '';
  let candidateLines = (anchorIndex >= 0 ? lines.slice(anchorIndex + 1) : lines)
    .filter((line) => line.trim());

  // Strip TUI chrome from the start (thinking, status bars, tool headers)
  candidateLines = stripTuiChrome(candidateLines);

  // Keep last 40 lines of actual content
  candidateLines = candidateLines.slice(-40);

  const text = candidateLines.join('\n').trim();
  return text && text !== trimmedPrompt ? text : '';
}

function deriveClaudeTerminalAssistantContent(content: string, lastPrompt: string | undefined) {
  if (!lastPrompt?.trim()) return '';

  const lines = sanitizeTerminalLines(content);
  const anchorIndex = findLastPromptLine(lines, lastPrompt.trim());
  if (anchorIndex < 0) return '';

  const candidateLines = lines.slice(anchorIndex + 1).map((line) => line.trim()).filter(Boolean);
  let answerLines: string[] = [];
  let collecting = false;

  for (const line of candidateLines) {
    if (/^❯\s/.test(line) || /^bruk@/.test(line) || /^current:/.test(line) || isTerminalDividerLine(line)) {
      break;
    }

    if (/^●\s+/.test(line)) {
      const next = line.replace(/^●\s+/, '').trim();
      if (!next || isClaudeToolInvocation(next)) {
        collecting = false;
        answerLines = [];
        continue;
      }
      collecting = true;
      answerLines = [next];
      continue;
    }

    if (collecting) {
      if (isClaudeMetaLine(line)) {
        break;
      }
      answerLines.push(line);
    }
  }

  return answerLines.join('\n').trim();
}

function sanitizeTerminalLines(content: string) {
  return sanitizeOutput(content)
    .split('\n')
    .map((line) => line.trimEnd());
}

function isClaudeToolInvocation(line: string) {
  return /^[A-Z][A-Za-z0-9_-]*\(/.test(line);
}

function isClaudeMetaLine(line: string) {
  return (
    /^∴\s/.test(line) ||
    /^⎿/.test(line) ||
    /^[-•]\s/.test(line) ||
    /^Status:/.test(line)
  );
}

function isTerminalDividerLine(line: string) {
  return /^[\u2500-\u257f─━]{10,}$/.test(line);
}

/**
 * Remove TUI structural chrome from start and end of content lines.
 * Strips thinking indicators, status bars, tool call headers, and footer hints.
 */
function stripTuiChrome(lines: string[]): string[] {
  // Reuse patterns from output-sanitizer to avoid duplication
  const TUI_START_MARKERS = [
    /^\s*(thinking|processing|waiting|loading|\.+)\s*$/i,
    /^\s*\[.*(?:status|tool|thinking|waiting|loading).*\]\s*$/i,
    /^\s*╭+|╮+|╯+|╰+\s*$/,
    /^\s*│.*(?:status|tool|thinking)\s*│\s*$/,
    /^\s*⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏\s*/,
  ];

  const TUI_END_MARKERS = [
    /^\s*(press|hit|type|select)\s+/i,
    /^\s*\[.*(?:help|hint|key|shortcut).*\]\s*$/i,
    /^\s*│.*(?:press|hit|key|ctrl|cmd).*│\s*$/i,
    /^[\u2500-\u257f\s]+$/, // Bottom border lines
  ];

  // Strip from start - find first non-matching line
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!TUI_START_MARKERS.some((pattern) => pattern.test(lines[i]))) {
      start = i;
      break;
    }
  }

  // Strip from end - find last non-matching line
  let end = lines.length;
  for (let i = lines.length - 1; i >= start; i--) {
    if (!TUI_END_MARKERS.some((pattern) => pattern.test(lines[i]))) {
      end = i + 1;
      break;
    }
  }

  return lines.slice(start, end);
}

function findLastPromptLine(lines: string[], prompt: string) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.includes(prompt)) {
      return index;
    }
  }
  return -1;
}

function detectTerminalRequirement(content: string) {
  const recentText = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-20)
    .join('\n');
  const pattern = TERMINAL_REQUIRED_PATTERNS.find((entry) => entry.test(recentText));
  return pattern ? { reason: recentText.split('\n').slice(-3).join(' ') } : null;
}
