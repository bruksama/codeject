# System Architecture

## Runtime Model

Production uses a single Node.js process for Express and WebSocket handling.

```text
Browser
  -> Express static files
  -> REST API under /api/*
  -> WebSocket under /ws/:sessionId
  -> chat, surface, and terminal frames

Express + WebSocket
  -> session store under ~/.codeject/sessions
  -> tmux bridge for per-session runtime ownership
  -> provider transcript readers for Claude/Codex message extraction
  -> session supervisor for derived chat bootstrap and terminal-required detection
```

The frontend is built as a static export and served by the backend.

## Components

### Frontend

- Next.js 16 app router
- Zustand store for local UI state plus backend-hydrated sessions/config
- mobile-focused chat-first, terminal fallback, and settings screens
- REST API client for sessions, auth, and CLI program config
- WebSocket client with reconnect and queued outbound chat, surface, and terminal frames
- xterm terminal viewport plus mobile key strip and input bar

### Backend

- Express 5 server
- route modules for health, auth, sessions, and config
- auth middleware that bypasses local requests
- file-backed stores under `~/.codeject`
- CLI adapters that still build the launch command for Claude Code, Codex, and generic shell programs
- provider transcript parsers for Claude transcript `.jsonl` files and Codex rollout `.jsonl` files
- tmux bridge service for session create, send-keys, resize, capture-pane, and kill-session
- terminal session manager that maps app session IDs to tmux targets
- session supervisor that prefers provider transcript content, falls back to sanitized tmux snapshots, derives conservative terminal-required signals, and emits high-confidence chat action requests for simple confirms and numbered selections
- WebSocket upgrade handler with ping/pong heartbeat plus chat bootstrap/update, surface mode, and terminal init/snapshot/update frames
- tmux runtimes stay alive across websocket disconnects until explicit delete or stale-session cleanup
- websocket session sync that persists connection state, terminal size, and tmux target metadata
- stale tmux pane/session errors now degrade to idle runtime state instead of crashing the server

### Shared

- `Session`
- `Message`
- `ChatState`
- `ChatActionRequest`
- `CliProgram`
- `AppSettings`
- `TerminalRuntime`
- `TerminalSnapshot`

## Persistence

- config: `~/.codeject/config.json`
- sessions: `~/.codeject/sessions/*.json`
- terminal scrollback: tmux pane history only, not disk-backed JSON
- derived transcript: stored in session JSON for UX bootstrap only
- provider runtime metadata: stored in session JSON to cache matched transcript path and provider session id

## Auth Model

- local requests allowed without bearer auth
- non-local requests require bearer auth
- stored API key is hashed on disk

## Current Gap

Frontend and backend now use a hybrid surface model over the same tmux runtime. Remote tunnel lifecycle and QR-based connection flow remain for phase 5.

Current constraints:

- host machine must have `tmux` installed
- snapshot mirroring currently refreshes whole terminal content instead of diff streaming
- chat extraction is best-effort: provider transcript first, sanitized tmux fallback second
- chat action extraction is intentionally narrow: yes/no confirms and numbered single-select only
- terminal remains the fallback path for approvals, menus, and raw TUI recovery
