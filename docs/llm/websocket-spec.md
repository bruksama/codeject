# WebSocket Protocol (LLM)

Single WebSocket endpoint per session:

- URL: `/ws/:sessionId`
- Auth: local clients may connect without a token; non-local clients must send `?token=<apiKey>` in the WebSocket URL.
- Transport: text JSON frames. Messages are flat objects keyed directly on the frame, not a nested `{ type, payload }` envelope.
- Runtime validation: both sides validate frames against shared Zod schemas exported from `@codeject/shared`.
- Client recovery: if a server frame is valid JSON but fails schema validation, the web client treats it as a transport failure, closes the socket, and reconnects instead of silently continuing with corrupted state.

## Frame shapes

Client frames:

- `{"type":"chat:prompt","content":"..."}`
- `{"type":"terminal:input","data":"..."}`
- `{"type":"terminal:key","key":"Enter"}` plus expanded keys such as `Escape`, `Tab`, `Up`, `Down`, `Left`, `Right`, `BSpace`, `DC`, `C-c`, `C-d`, `C-z`, `C-l`

Server frames:

- `{"type":"terminal:snapshot","content":"...","cols":120,"rows":32,"seq":7}`
- `{"type":"terminal:ready","sessionId":"...","status":"...","surfaceMode":"chat","surfaceRequirement":"...","chatState":{...},"terminal":{...}}`
- `{"type":"chat:bootstrap","messages":[...],"chatState":{...}}`
- `{"type":"chat:message","message":{...}}`
- `{"type":"chat:update","messageId":"...","content":"...","isStreaming":true}`
- `{"type":"surface:update","mode":"chat","requirement":"...","reason":"...","chatState":{...}}`
- `{"type":"terminal:status","status":"..."}`
- `{"type":"terminal:error","message":"..."}`

Typical connect sequence:

- `terminal:snapshot`
- `terminal:ready`
- `chat:bootstrap`

## Client → Server events

- `chat:prompt`
  - Purpose: send a new user prompt to the underlying CLI assistant.
- `terminal:input`
  - Purpose: send text input to the tmux-backed CLI runtime.
- `terminal:key`
  - Purpose: send supported special keys for action submission, interrupt, menu navigation, and common control combos.

## Server → Client events

- `chat:bootstrap`
  - Purpose: send initial chat state when a session is opened.
- `chat:message`
  - Purpose: send a new chat message.
  - Notes: Claude/Codex turns usually start with an empty streaming assistant placeholder so the UI can show loading without showing commentary text.
- `chat:update`
  - Purpose: patch one existing chat message by `messageId`.
  - Notes: chat-state changes arrive through `chat:bootstrap`, `surface:update`, and `terminal:ready`.
  - Notes: for Claude/Codex, the meaningful assistant content usually arrives here once with `isStreaming: false` when an empty pending placeholder already exists.
- `chat:message`
  - Purpose: send a new chat message.
  - Notes: for Claude/Codex, this can also carry the final assistant answer directly when there is no pending placeholder to patch, for example after action submission or reconnect recovery.
- `surface:update`
  - Purpose: inform client about current action-request / terminal-required state.
  - Notes: `chatState.actionRequest` may be `confirm`, `single-select`, or `free-input`; clients should treat the action as complete only when the action id changes, disappears, or the connection drops.
- `terminal:ready`
  - Purpose: signal that the tmux-backed session is ready and share runtime metadata.
- `terminal:snapshot`
  - Purpose: mirror the latest tmux pane capture so the client terminal tab can render a read-only terminal view.
- `terminal:status`
  - Purpose: send status information about the tmux-backed runtime.
- `terminal:error`
  - Purpose: report runtime or action-submission errors.
  - Also used for invalid client frames or unsupported message types.
