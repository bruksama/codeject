# WebSocket Protocol (LLM)

Single WebSocket endpoint per session:

- URL: `/ws/:sessionId`
- Transport: text messages with a simple `{ type, payload }` style structure (see server code for exact shapes).

## Client → Server events

- `chat:prompt`
  - Purpose: send a new user prompt to the underlying CLI assistant.
- `surface:set-mode`
  - Purpose: switch between chat surface and terminal surface.
- `terminal:init`
  - Purpose: initialize terminal for the current session.
- `terminal:input`
  - Purpose: send text input to the terminal.
- `terminal:key`
  - Purpose: send special key sequences to the terminal.
- `terminal:resize`
  - Purpose: inform server of terminal size changes.
- `terminal:ping`
  - Purpose: keep-alive / latency measurement.

## Server → Client events

- `chat:bootstrap`
  - Purpose: send initial chat state when a session is opened.
- `chat:message`
  - Purpose: send a new chat message.
- `chat:update`
  - Purpose: update existing chat message(s) or chat state.
- `surface:update`
  - Purpose: inform client about current surface mode and related state.
- `terminal:ready`
  - Purpose: signal that terminal for this session is ready.
- `terminal:snapshot`
  - Purpose: send a full terminal snapshot (current buffer).
- `terminal:update`
  - Purpose: send incremental terminal updates (if available).
- `terminal:status`
  - Purpose: send status information about the terminal runtime.
- `terminal:error`
  - Purpose: report terminal-related errors.
- `terminal:pong`
  - Purpose: respond to `terminal:ping`.

