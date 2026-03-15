export type ConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error'
  | 'idle';

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

export interface Session {
  id: string;
  name: string;
  cliProgram: CliProgram;
  workspacePath: string;
  messages: Message[];
  status: ConnectionStatus;
  createdAt: Date;
  lastMessageAt: Date;
}

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
