import { z } from 'zod';
import {
  ChatActionOptionSchema,
  ChatActionRequestSchema,
  ChatActionSourceSchema,
  ChatStatePhaseSchema,
  ChatStateSchema,
  ClientWebSocketMessageSchema,
  ConnectionStatusSchema,
  MessageRoleSchema,
  MessageSchema,
  ProviderStopSignalSchema,
  ServerWebSocketMessageSchema,
  SurfaceModeSchema,
  SurfaceRequirementSchema,
  TerminalKeySchema,
  TerminalRuntimeSchema,
} from './schemas';

export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export type MessageRole = z.infer<typeof MessageRoleSchema>;

export type Message = z.infer<typeof MessageSchema>;

export interface CliProgram {
  id: string;
  name: string;
  command: string;
  icon: string;
  defaultWorkingDir?: string;
}

export type SurfaceMode = z.infer<typeof SurfaceModeSchema>;

export type SurfaceRequirement = z.infer<typeof SurfaceRequirementSchema>;

export type ChatStatePhase = z.infer<typeof ChatStatePhaseSchema>;

export interface TerminalSize {
  cols: number;
  rows: number;
}

export type TerminalRuntime = z.infer<typeof TerminalRuntimeSchema>;

export interface TerminalSnapshot {
  cols: number;
  content: string;
  rows: number;
  seq: number;
}

export interface CliSessionOptions {
  terminal?: Partial<TerminalSize>;
}

export type ChatState = z.infer<typeof ChatStateSchema>;

export type ChatActionSource = z.infer<typeof ChatActionSourceSchema>;

export type ChatActionRequest = z.infer<typeof ChatActionRequestSchema>;

export type ChatActionOption = z.infer<typeof ChatActionOptionSchema>;

export interface ProviderRuntime {
  provider: 'claude' | 'codex' | 'generic';
  hookToken?: string;
  providerSessionId?: string;
  transcriptPath?: string;
}

export interface Session {
  id: string;
  name: string;
  cliProgram: CliProgram;
  workspacePath: string;
  sessionOptions?: CliSessionOptions;
  messages: Message[];
  chatState?: ChatState;
  providerRuntime?: ProviderRuntime;
  status: ConnectionStatus;
  surfaceMode: SurfaceMode;
  surfaceRequirement: SurfaceRequirement;
  terminal?: TerminalRuntime;
  createdAt: Date;
  lastMessageAt: Date;
}

export type TerminalKey = z.infer<typeof TerminalKeySchema>;
export type ClientWebSocketMessage = z.infer<typeof ClientWebSocketMessageSchema>;
export type ServerWebSocketMessage = z.infer<typeof ServerWebSocketMessageSchema>;
export type ProviderStopSignal = z.infer<typeof ProviderStopSignalSchema>;

export type TunnelLifecycleState = 'active' | 'inactive' | 'starting' | 'stopping' | 'error';

export type TunnelMode = 'quick' | 'named-token';

export interface RemoteAccessSettings {
  autoStart: boolean;
  enabled: boolean;
  authKey: string;
  namedTunnelHostname?: string;
  namedTunnelTokenConfigured?: boolean;
  tunnelMode: TunnelMode;
  tunnelStatus: TunnelLifecycleState;
  tunnelUrl?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  remoteAccess: RemoteAccessSettings;
  fontSize: 'small' | 'medium' | 'large';
  notifications: boolean;
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
