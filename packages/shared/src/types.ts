export type ConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error'
  | 'idle'
  | 'starting';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface CliProgram {
  id: string;
  name: string;
  command: string;
  icon: string;
  defaultWorkingDir?: string;
}

export type SurfaceMode = 'chat' | 'terminal';

export type SurfaceRequirement =
  | 'chat-safe'
  | 'terminal-available'
  | 'terminal-required';

export type ChatStatePhase =
  | 'idle'
  | 'awaiting-assistant'
  | 'streaming-assistant'
  | 'terminal-required';

export interface TerminalSize {
  cols: number;
  rows: number;
}

export interface TerminalRuntime {
  lastSnapshotAt?: Date;
  paneId?: string;
  sessionName?: string;
  windowId?: string;
}

export interface TerminalSnapshot {
  cols: number;
  content: string;
  rows: number;
  seq: number;
}

export interface CliSessionOptions {
  terminal?: Partial<TerminalSize>;
}

export interface ChatState {
  lastAssistantMessageId?: string;
  lastPrompt?: string;
  phase: ChatStatePhase;
  terminalRequiredReason?: string;
  transcriptUpdatedAt?: Date;
}

export interface Session {
  id: string;
  name: string;
  cliProgram: CliProgram;
  workspacePath: string;
  sessionOptions?: CliSessionOptions;
  messages: Message[];
  chatState?: ChatState;
  status: ConnectionStatus;
  surfaceMode: SurfaceMode;
  surfaceRequirement: SurfaceRequirement;
  terminal?: TerminalRuntime;
  createdAt: Date;
  lastMessageAt: Date;
}

export type ClientWebSocketMessage =
  | { type: 'chat:prompt'; content: string }
  | { type: 'surface:set-mode'; mode: SurfaceMode }
  | { type: 'terminal:init'; cols: number; rows: number }
  | { type: 'terminal:input'; data: string }
  | { type: 'terminal:key'; key: TerminalKey }
  | { type: 'terminal:ping' }
  | { type: 'terminal:resize'; cols: number; rows: number };

export type ServerWebSocketMessage =
  | {
      type: 'chat:bootstrap';
      chatState?: ChatState;
      messages: Message[];
    }
  | { type: 'chat:message'; message: Message }
  | {
      type: 'chat:update';
      content: string;
      isStreaming?: boolean;
      messageId: string;
    }
  | {
      type: 'surface:update';
      chatState?: ChatState;
      mode: SurfaceMode;
      reason?: string;
      requirement: SurfaceRequirement;
    }
  | { type: 'terminal:error'; message: string }
  | {
      type: 'terminal:ready';
      chatState?: ChatState;
      sessionId: string;
      status: ConnectionStatus;
      surfaceMode: SurfaceMode;
      surfaceRequirement: SurfaceRequirement;
      terminal?: TerminalRuntime;
    }
  | { type: 'terminal:snapshot'; snapshot: TerminalSnapshot }
  | { type: 'terminal:status'; status: ConnectionStatus }
  | { type: 'terminal:update'; snapshot: TerminalSnapshot }
  | { type: 'terminal:pong'; sessionId: string };

export type TerminalKey =
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'Backspace'
  | 'Ctrl+C'
  | 'Ctrl+D'
  | 'Ctrl+L'
  | 'Enter'
  | 'Escape'
  | 'Tab';

export interface RemoteAccessSettings {
  enabled: boolean;
  tunnelStatus: 'active' | 'inactive' | 'connecting' | 'error';
  authKey: string;
  tunnelUrl?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  remoteAccess: RemoteAccessSettings;
  hapticFeedback: boolean;
  streamingEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface AppState {
  sessions: Session[];
  activeSessionId: string | null;
  cliPrograms: CliProgram[];
  settings: AppSettings;
  addSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (
    sessionId: string,
    messageId: string,
    updates: Partial<Message>
  ) => void;
  addCliProgram: (program: CliProgram) => void;
  updateCliProgram: (id: string, updates: Partial<CliProgram>) => void;
  deleteCliProgram: (id: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateRemoteAccess: (updates: Partial<RemoteAccessSettings>) => void;
}
