# WebSocket Protocol (LLM)

Single WebSocket endpoint per session:

- URL: `/ws/:sessionId`
- Transport: text messages with a simple `{ type, payload }` style structure (see server code for exact shapes).

## Client → Server events

- `chat:prompt`
  - Purpose: send a new user prompt to the underlying CLI assistant.
- `terminal:input`
  - Purpose: send text input to the tmux-backed CLI runtime.
- `terminal:key`
  - Purpose: send supported special keys (`Enter`, `Escape`) for action submission or interrupt.

## Server → Client events

- `chat:bootstrap`
  - Purpose: send initial chat state when a session is opened.
- `chat:message`
  - Purpose: send a new chat message.
- `chat:update`
  - Purpose: update existing chat message(s) or chat state.
- `surface:update`
  - Purpose: inform client about current action-request / terminal-required state.
  - Notes: `chatState.actionRequest` may be `confirm`, `single-select`, or `free-input`; clients should treat the action as complete only when the action id changes, disappears, or the connection drops.
- `terminal:ready`
  - Purpose: signal that the tmux-backed session is ready and share runtime metadata.
- `terminal:status`
  - Purpose: send status information about the tmux-backed runtime.
- `terminal:error`
  - Purpose: report runtime or action-submission errors.
