import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import {
  type ChatActionRequest,
  type ChatState,
  type Message,
  type ProviderStopSignal,
  type Session,
  type SurfaceRequirement,
  type TerminalSnapshot,
} from '@codeject/shared';
import {
  getTranscriptProvider,
  ProviderTranscriptReader,
  type ProviderTranscriptState,
} from './provider-transcript-reader.js';
import { type SessionStore } from './session-store.js';
import { extractChatResponseFromTerminal } from '../utils/output-sanitizer.js';
import { analyzeTerminalInteraction } from '../utils/action-request-extractor.js';

interface SupervisorEvents {
  'chat:message': [sessionId: string, message: Message];
  'chat:update': [sessionId: string, messageId: string, content: string, isStreaming: boolean];
  'surface:update': [sessionId: string, payload: { chatState?: ChatState; reason?: string; requirement: SurfaceRequirement }];
}

const ASSISTANT_IDLE_MS = 1200;
const FINAL_TRANSCRIPT_SETTLE_RETRY_COUNT = 3;
const FINAL_TRANSCRIPT_SETTLE_RETRY_MS = 120;
const PROVIDER_STOP_SETTLE_RETRY_COUNT = 6;
const PROVIDER_STOP_SETTLE_RETRY_MS = 150;
const PROVIDER_STOP_DEDUPE_TTL_MS = 5_000;

export class SessionSupervisor extends EventEmitter<SupervisorEvents> {
  private readonly assistantTimers = new Map<string, NodeJS.Timeout>();
  private readonly providerStopSignals = new Map<string, number>();
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
      surfaceRequirement: 'terminal-available',
    });
    this.emit('chat:message', sessionId, userMessage);
    this.emit('chat:message', sessionId, assistantMessage);
    this.emit('surface:update', sessionId, {
      chatState,
      requirement: 'terminal-available',
    });
    return userMessage;
  }

  async handleStatus(sessionId: string, status: Session['status']) {
    if (status !== 'idle' && status !== 'error' && status !== 'disconnected') return;
    if (await this.trySettleFinalOnlyProviderStatus(sessionId)) {
      return;
    }

    await this.finalizeAssistantMessage(sessionId);
  }

  async handleActionSubmission(sessionId: string) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session?.chatState?.actionRequest) return;
    const trackedAssistantMessage = session.chatState.lastAssistantMessageId
      ? session.messages.find((message) => message.id === session.chatState?.lastAssistantMessageId)
      : undefined;

    const timestamp = new Date();
    const chatState: ChatState = {
      ...session.chatState,
      actionRequest: undefined,
      lastAssistantMessageId: trackedAssistantMessage?.isStreaming ? trackedAssistantMessage.id : undefined,
      phase: 'idle',
      terminalRequiredReason: undefined,
      transcriptUpdatedAt: session.chatState.transcriptUpdatedAt ?? timestamp,
    };
    await this.sessionStore.updateSession(sessionId, {
      chatState,
      surfaceRequirement: 'terminal-available',
    });
    this.emit('surface:update', sessionId, {
      chatState,
      requirement: 'terminal-available',
    });
  }

  async handleProviderStopSignal(sessionId: string, signal: ProviderStopSignal) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session || !isFinalOnlyProviderSession(session) || getTranscriptProvider(session) !== signal.provider) {
      return false;
    }

    if (this.isDuplicateProviderStopSignal(signal)) {
      return false;
    }

    if (
      signal.providerSessionId &&
      session.providerRuntime?.providerSessionId !== signal.providerSessionId
    ) {
      await this.sessionStore.updateSession(sessionId, {
        providerRuntime: {
          ...session.providerRuntime,
          provider: signal.provider,
          providerSessionId: signal.providerSessionId,
        },
      });
    }

    for (let attempt = 0; attempt < PROVIDER_STOP_SETTLE_RETRY_COUNT; attempt += 1) {
      const nextSession = await this.sessionStore.getSession(sessionId);
      if (!nextSession || !isFinalOnlyProviderSession(nextSession)) {
        return false;
      }

      const transcriptResult = await this.transcriptReader.readTranscriptState(nextSession).catch(() => null);
      const transcriptState = transcriptResult?.state ?? null;
      if (shouldAcceptTranscriptFinal(nextSession, transcriptState)) {
        await this.settleAssistantMessage(sessionId, transcriptState.content);
        return true;
      }

      if (attempt < PROVIDER_STOP_SETTLE_RETRY_COUNT - 1) {
        await wait(PROVIDER_STOP_SETTLE_RETRY_MS);
      }
    }

    return false;
  }

  async handleTerminalSnapshot(sessionId: string, snapshot: TerminalSnapshot) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    const transcriptResult = await this.transcriptReader.readTranscriptState(session).catch(() => null);
    const transcriptState = transcriptResult?.state ?? null;
    const interaction = analyzeTerminalInteraction({
      snapshotText: snapshot.content,
    });
    const nextRequirement: SurfaceRequirement = interaction.requirement;
    const nextChatState = deriveChatState(session, {
      actionRequest: interaction.actionRequest,
      reason: interaction.reason,
      transcriptState,
    });
    const assistantContent = deriveAssistantMessageContent(session, transcriptState, snapshot.content);

    if (
      nextRequirement !== session.surfaceRequirement ||
      nextChatState.phase !== session.chatState?.phase ||
      nextChatState.transcriptUpdatedAt?.getTime() !== session.chatState?.transcriptUpdatedAt?.getTime() ||
      nextChatState.terminalRequiredReason !== session.chatState?.terminalRequiredReason ||
      nextChatState.actionRequest?.id !== session.chatState?.actionRequest?.id
    ) {
      await this.sessionStore.updateSession(sessionId, {
        chatState: nextChatState,
        surfaceRequirement: nextRequirement,
      });
      this.emit('surface:update', sessionId, {
        chatState: nextChatState,
        reason: interaction.reason,
        requirement: nextRequirement,
      });
    }

    if (!assistantContent) return;
    if (isFinalOnlyProviderSession(session)) {
      await this.settleAssistantMessage(sessionId, assistantContent);
      return;
    }

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
      reason: chatState.terminalRequiredReason,
      requirement: session.surfaceRequirement,
    });
    this.scheduleAssistantFinalize(session.id);
  }

  private async settleAssistantMessage(sessionId: string, content: string) {
    this.clearAssistantTimer(sessionId);
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;

    const settledAssistantUpdate = deriveSettledAssistantUpdate(session, content);
    if (!settledAssistantUpdate) return;

    await this.sessionStore.updateSession(session.id, {
      chatState: settledAssistantUpdate.chatState,
      lastMessageAt: settledAssistantUpdate.lastMessageAt,
      messages: settledAssistantUpdate.messages,
    });

    if (settledAssistantUpdate.emitKind === 'message') {
      this.emit('chat:message', session.id, settledAssistantUpdate.message);
    }

    if (settledAssistantUpdate.emitKind === 'update') {
      this.emit('chat:update', session.id, settledAssistantUpdate.message.id, settledAssistantUpdate.message.content, false);
    }

    this.emit('surface:update', session.id, {
      chatState: settledAssistantUpdate.chatState,
      reason: settledAssistantUpdate.chatState.terminalRequiredReason,
      requirement: session.surfaceRequirement,
    });
  }

  private async trySettleFinalOnlyProviderStatus(sessionId: string) {
    for (let attempt = 0; attempt < FINAL_TRANSCRIPT_SETTLE_RETRY_COUNT; attempt += 1) {
      const session = await this.sessionStore.getSession(sessionId);
      if (!session || !isFinalOnlyProviderSession(session)) {
        return false;
      }

      const transcriptResult = await this.transcriptReader.readTranscriptState(session).catch(() => null);
      const transcriptState = transcriptResult?.state ?? null;
      if (shouldAcceptTranscriptFinal(session, transcriptState)) {
        await this.settleAssistantMessage(sessionId, transcriptState.content);
        return true;
      }

      if (attempt < FINAL_TRANSCRIPT_SETTLE_RETRY_COUNT - 1) {
        await wait(FINAL_TRANSCRIPT_SETTLE_RETRY_MS);
      }
    }

    return false;
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

  private isDuplicateProviderStopSignal(signal: ProviderStopSignal) {
    const now = Date.now();
    for (const [key, seenAt] of this.providerStopSignals) {
      if (now - seenAt > PROVIDER_STOP_DEDUPE_TTL_MS) {
        this.providerStopSignals.delete(key);
      }
    }

    const key = [
      signal.sessionId,
      signal.provider,
      signal.providerTurnId ?? signal.providerSessionId ?? 'stop',
    ].join(':');
    const existing = this.providerStopSignals.get(key);
    this.providerStopSignals.set(key, now);
    return typeof existing === 'number' && now - existing <= PROVIDER_STOP_DEDUPE_TTL_MS;
  }

  private async syncBootstrapTranscript(session: Session) {
    const transcriptResult = await this.transcriptReader.readTranscriptState(session).catch(() => null);
    const transcriptState = transcriptResult?.state ?? null;
    if (!shouldAcceptTranscriptFinal(session, transcriptState)) {
      return session;
    }

    const settledAssistantUpdate = deriveSettledAssistantUpdate(session, transcriptState.content);
    if (!settledAssistantUpdate) {
      return session;
    }

    return (
      (await this.sessionStore.updateSession(session.id, {
        chatState: settledAssistantUpdate.chatState,
        lastMessageAt: settledAssistantUpdate.lastMessageAt,
        messages: settledAssistantUpdate.messages,
      })) ?? session
    );
  }

  private async finalizeAssistantMessage(sessionId: string) {
    this.clearAssistantTimer(sessionId);
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    const resolvedPhase =
      session.surfaceRequirement === 'terminal-required' ? 'terminal-required' : 'idle';
    const messageId = session?.chatState?.lastAssistantMessageId;
    const message = messageId
      ? session.messages.find((entry) => entry.id === messageId)
      : undefined;

    if (!messageId || !message?.isStreaming) {
      if (
        session.chatState?.phase !== 'awaiting-assistant' &&
        session.chatState?.phase !== 'streaming-assistant'
      ) {
        return;
      }

      const chatState: ChatState = {
        ...session.chatState,
        lastAssistantMessageId: message?.content.trim() ? message.id : undefined,
        phase: resolvedPhase,
      };
      await this.sessionStore.updateSession(sessionId, { chatState });
      this.emit('surface:update', sessionId, {
        chatState,
        reason: chatState.terminalRequiredReason,
        requirement: session.surfaceRequirement,
      });
      return;
    }

    const chatState: ChatState = {
      ...session.chatState,
      lastAssistantMessageId: message.content.trim() ? messageId : undefined,
      phase: resolvedPhase,
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

interface SettledAssistantUpdate {
  chatState: ChatState;
  lastMessageAt: Date;
  message: Message;
  messages: Message[];
  emitKind: 'message' | 'none' | 'update';
}

function deriveSettledAssistantUpdate(session: Session, content: string): SettledAssistantUpdate | null {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return null;
  }

  const resolvedPhase = resolveSettledAssistantPhase(session);
  const trackedAssistantMessage = session.chatState?.lastAssistantMessageId
    ? session.messages.find((message) => message.id === session.chatState?.lastAssistantMessageId)
    : undefined;
  const latestAssistant = [...session.messages].reverse().find((message) => message.role === 'assistant');
  const targetMessage =
    trackedAssistantMessage?.role === 'assistant'
      ? trackedAssistantMessage
      : latestAssistant?.role === 'assistant' && !latestAssistant.isStreaming && latestAssistant.content.trim() === trimmedContent
        ? latestAssistant
        : undefined;

  if (isStaleAssistantCarryover(session, targetMessage, trimmedContent)) {
    return null;
  }

  const timestamp = new Date();
  if (!targetMessage) {
    const message: Message = {
      content: trimmedContent,
      id: uuidv4(),
      isStreaming: false,
      role: 'assistant',
      timestamp,
    };
    return {
      chatState: {
        ...session.chatState,
        lastAssistantMessageId: message.id,
        phase: resolvedPhase,
        transcriptUpdatedAt: timestamp,
      },
      emitKind: 'message',
      lastMessageAt: timestamp,
      message,
      messages: [...session.messages, message],
    };
  }

  const nextMessage =
    targetMessage.content !== trimmedContent || targetMessage.isStreaming
      ? { ...targetMessage, content: trimmedContent, isStreaming: false, timestamp }
      : targetMessage;
  const emitKind =
    nextMessage.id !== targetMessage.id
      ? 'message'
      : nextMessage === targetMessage
        ? 'none'
        : 'update';
  const chatState: ChatState = {
    ...session.chatState,
    lastAssistantMessageId: nextMessage.id,
    phase: resolvedPhase,
    transcriptUpdatedAt: timestamp,
  };

  if (
    emitKind === 'none' &&
    session.chatState?.lastAssistantMessageId === nextMessage.id &&
    session.chatState?.phase === resolvedPhase
  ) {
    return null;
  }

  return {
    chatState,
    emitKind,
    lastMessageAt: timestamp,
    message: nextMessage,
    messages:
      emitKind === 'none'
        ? session.messages
        : session.messages.map((message) => (message.id === nextMessage.id ? nextMessage : message)),
  };
}

function deriveTerminalAssistantFallback(session: Session, snapshotContent: string) {
  if (isFinalOnlyProviderSession(session)) {
    return '';
  }

  return deriveAssistantContent(snapshotContent, session.chatState?.lastPrompt);
}

function deriveChatState(
  session: Session,
  {
    actionRequest,
    reason,
    transcriptState,
  }: {
    actionRequest?: ChatActionRequest;
    reason: string | undefined;
    transcriptState: ProviderTranscriptState | null;
  }
): ChatState {
  if (reason) {
    return {
      ...session.chatState,
      actionRequest,
      phase: 'terminal-required',
      terminalRequiredReason: reason,
    };
  }
  return {
    ...session.chatState,
    actionRequest: undefined,
    phase: deriveNextChatPhase(session, transcriptState),
    terminalRequiredReason: undefined,
    transcriptUpdatedAt: resolveTranscriptCursor(session, transcriptState),
  };
}

function deriveAssistantMessageContent(
  session: Session,
  transcriptState: ProviderTranscriptState | null,
  snapshotContent: string
) {
  if (isFinalOnlyProviderSession(session)) {
    return shouldAcceptTranscriptFinal(session, transcriptState) ? transcriptState.content : '';
  }

  return deriveTerminalAssistantFallback(session, snapshotContent);
}

function deriveNextChatPhase(session: Session, transcriptState: ProviderTranscriptState | null): ChatState['phase'] {
  if (isFinalOnlyProviderSession(session)) {
    if (shouldAcceptTranscriptFinal(session, transcriptState)) {
      return resolveSettledAssistantPhase(session);
    }

    if (transcriptState?.status === 'working') {
      return 'awaiting-assistant';
    }

    if (
      session.chatState?.phase === 'awaiting-assistant' ||
      session.chatState?.phase === 'streaming-assistant'
    ) {
      return 'awaiting-assistant';
    }
  }

  return session.chatState?.phase === 'terminal-required' ? 'idle' : (session.chatState?.phase ?? 'idle');
}

function shouldAcceptTranscriptFinal(
  session: Session,
  transcriptState: ProviderTranscriptState | null
): transcriptState is Extract<ProviderTranscriptState, { status: 'final' }> {
  if (transcriptState?.status !== 'final' || !transcriptState.content.trim()) {
    return false;
  }

  const transcriptUpdatedAt = transcriptState.updatedAt?.getTime();
  const sessionTranscriptUpdatedAt = session.chatState?.transcriptUpdatedAt?.getTime();

  if (!transcriptUpdatedAt || !sessionTranscriptUpdatedAt) {
    return true;
  }

  return transcriptUpdatedAt >= sessionTranscriptUpdatedAt;
}

function resolveTranscriptCursor(session: Session, transcriptState: ProviderTranscriptState | null) {
  if (transcriptState?.status === 'working' && transcriptState.updatedAt) {
    return transcriptState.updatedAt;
  }

  return session.chatState?.transcriptUpdatedAt;
}

function resolveSettledAssistantPhase(session: Session) {
  return session.surfaceRequirement === 'terminal-required' ? 'terminal-required' : 'idle';
}

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function isFinalOnlyProviderSession(session: Session) {
  return Boolean(getTranscriptProvider(session));
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
