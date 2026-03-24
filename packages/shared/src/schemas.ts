import { z } from 'zod';

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);

export const MessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.coerce.date(),
  isStreaming: z.boolean().optional(),
});

export const ConnectionStatusSchema = z.enum([
  'connected',
  'connecting',
  'disconnected',
  'error',
  'idle',
  'starting',
]);

export const SurfaceModeSchema = z.literal('chat');

export const SurfaceRequirementSchema = z.enum([
  'chat-safe',
  'terminal-available',
  'terminal-required',
]);

export const ChatStatePhaseSchema = z.enum([
  'idle',
  'awaiting-assistant',
  'streaming-assistant',
  'terminal-required',
]);

export const ChatActionSourceSchema = z.enum(['terminal', 'transcript']);

export const ChatActionOptionSchema = z.object({
  label: z.string(),
  submit: z.string(),
  value: z.string(),
});

export const ChatActionRequestSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string(),
    kind: z.literal('confirm'),
    prompt: z.string(),
    options: z.tuple([ChatActionOptionSchema, ChatActionOptionSchema]),
    source: ChatActionSourceSchema,
  }),
  z.object({
    id: z.string(),
    kind: z.literal('single-select'),
    options: z.array(ChatActionOptionSchema),
    prompt: z.string(),
    source: ChatActionSourceSchema,
  }),
  z.object({
    id: z.string(),
    kind: z.literal('free-input'),
    prompt: z.string(),
    context: z.string(),
    source: z.literal('terminal'),
  }),
]);

export const ChatStateSchema = z.object({
  actionRequest: ChatActionRequestSchema.optional(),
  lastAssistantMessageId: z.string().optional(),
  lastPrompt: z.string().optional(),
  phase: ChatStatePhaseSchema,
  terminalRequiredReason: z.string().optional(),
  transcriptUpdatedAt: z.coerce.date().optional(),
});

export const TerminalRuntimeSchema = z.object({
  lastSnapshotAt: z.coerce.date().optional(),
  paneId: z.string().optional(),
  sessionName: z.string().optional(),
  windowId: z.string().optional(),
});

export const TerminalKeySchema = z.enum([
  'Enter',
  'Escape',
  'Tab',
  'Up',
  'Down',
  'Left',
  'Right',
  'BSpace',
  'DC',
  'C-c',
  'C-d',
  'C-z',
  'C-l',
]);

export const ClientWebSocketMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('chat:prompt'), content: z.string() }),
  z.object({ type: z.literal('terminal:input'), data: z.string() }),
  z.object({ type: z.literal('terminal:key'), key: TerminalKeySchema }),
]);

export const ServerWebSocketMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chat:bootstrap'),
    chatState: ChatStateSchema.optional(),
    messages: z.array(MessageSchema),
  }),
  z.object({
    type: z.literal('chat:message'),
    message: MessageSchema,
  }),
  z.object({
    type: z.literal('chat:update'),
    content: z.string(),
    isStreaming: z.boolean().optional(),
    messageId: z.string(),
  }),
  z.object({
    type: z.literal('surface:update'),
    chatState: ChatStateSchema.optional(),
    mode: SurfaceModeSchema,
    reason: z.string().optional(),
    requirement: SurfaceRequirementSchema,
  }),
  z.object({
    type: z.literal('terminal:error'),
    message: z.string(),
  }),
  z.object({
    type: z.literal('terminal:snapshot'),
    content: z.string(),
    cols: z.number(),
    rows: z.number(),
    seq: z.number(),
  }),
  z.object({
    type: z.literal('terminal:ready'),
    chatState: ChatStateSchema.optional(),
    sessionId: z.string(),
    status: ConnectionStatusSchema,
    surfaceMode: SurfaceModeSchema,
    surfaceRequirement: SurfaceRequirementSchema,
    terminal: TerminalRuntimeSchema.optional(),
  }),
  z.object({
    type: z.literal('terminal:status'),
    status: ConnectionStatusSchema,
  }),
]);
