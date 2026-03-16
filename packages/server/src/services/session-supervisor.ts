import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import {
  type ChatState,
  type Message,
  type Session,
  type SurfaceMode,
  type SurfaceRequirement,
  type TerminalSnapshot,
} from '@codeject/shared';
import { type SessionStore } from './session-store.js';
import { extractChatResponseFromTerminal } from '../utils/output-sanitizer.js';

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

  constructor(private readonly sessionStore: SessionStore) {
    super();
  }

  async getBootstrap(sessionId: string) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return null;
    return {
      chatState: session.chatState,
      messages: session.messages,
      surfaceMode: session.surfaceMode,
      surfaceRequirement: session.surfaceRequirement,
    };
  }

  async handleChatPrompt(sessionId: string, content: string) {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session || !content.trim()) return null;
    this.clearAssistantTimer(sessionId);
    const timestamp = new Date();
    const message: Message = {
      content: content.trim(),
      id: uuidv4(),
      role: 'user',
      timestamp,
    };
    const chatState: ChatState = {
      lastPrompt: message.content,
      phase: 'awaiting-assistant',
      transcriptUpdatedAt: timestamp,
    };
    await this.sessionStore.updateSession(sessionId, {
      chatState,
      lastMessageAt: timestamp,
      messages: [...session.messages, message],
      surfaceMode: 'chat',
      surfaceRequirement: 'terminal-available',
    });
    this.emit('chat:message', sessionId, message);
    this.emit('surface:update', sessionId, {
      chatState,
      mode: 'chat',
      requirement: 'terminal-available',
    });
    return message;
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
    const nextChatState = deriveChatState(session, detection?.reason);
    const assistantContent = detection ? '' : deriveAssistantContent(snapshot.content, session.chatState?.lastPrompt);

    if (
      nextRequirement !== session.surfaceRequirement ||
      nextChatState.phase !== session.chatState?.phase ||
      nextChatState.terminalRequiredReason !== session.chatState?.terminalRequiredReason
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
    await this.upsertAssistantMessage(session, assistantContent);
  }

  private async upsertAssistantMessage(session: Session, content: string) {
    const currentMessage = session.chatState?.lastAssistantMessageId
      ? session.messages.find((message) => message.id === session.chatState?.lastAssistantMessageId)
      : undefined;
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
      this.scheduleAssistantFinalize(session.id);
      return;
    }

    await this.sessionStore.updateSession(session.id, {
      chatState: {
        ...session.chatState,
        phase: 'streaming-assistant',
        transcriptUpdatedAt: timestamp,
      },
      lastMessageAt: timestamp,
      messages: session.messages.map((message) =>
        message.id === currentMessage.id ? { ...message, content, isStreaming: true, timestamp } : message
      ),
    });
    this.emit('chat:update', session.id, currentMessage.id, content, true);
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

  private async finalizeAssistantMessage(sessionId: string) {
    this.clearAssistantTimer(sessionId);
    const session = await this.sessionStore.getSession(sessionId);
    const messageId = session?.chatState?.lastAssistantMessageId;
    if (!session || !messageId) return;
    const message = session.messages.find((entry) => entry.id === messageId);
    if (!message?.isStreaming) return;
    await this.sessionStore.updateSession(sessionId, {
      chatState: {
        ...session.chatState,
        phase: session.surfaceRequirement === 'terminal-required' ? 'terminal-required' : 'idle',
      },
      messages: session.messages.map((entry) =>
        entry.id === messageId ? { ...entry, isStreaming: false } : entry
      ),
    });
    this.emit('chat:update', sessionId, messageId, message.content, false);
  }
}

function deriveChatState(session: Session, reason: string | undefined): ChatState {
  if (reason) {
    return {
      ...session.chatState,
      phase: 'terminal-required',
      terminalRequiredReason: reason,
      transcriptUpdatedAt: new Date(),
    };
  }
  return {
    ...session.chatState,
    phase: session.chatState?.phase === 'terminal-required' ? 'idle' : (session.chatState?.phase ?? 'idle'),
    terminalRequiredReason: undefined,
  };
}

function deriveAssistantContent(content: string, lastPrompt: string | undefined) {
  const sanitized = extractChatResponseFromTerminal(content);
  const lines = sanitized.split('\n').map((line) => line.trimEnd());
  const anchorIndex =
    lastPrompt && lastPrompt.trim() ? findLastPromptLine(lines, lastPrompt.trim()) : -1;
  const candidateLines = (anchorIndex >= 0 ? lines.slice(anchorIndex + 1) : lines)
    .filter((line) => line.trim())
    .slice(-40);
  const text = candidateLines.join('\n').trim();
  return text && text !== lastPrompt?.trim() ? text : '';
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
