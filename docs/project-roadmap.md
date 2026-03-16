# Project Roadmap

## Status

- Phase 1: complete
- Phase 2: complete
- Phase 3: complete
- Phase 4: complete
- Phase 5: pending
- Terminal remote tmux bridge: complete
- Hybrid chat-terminal supervisor: complete

## Phase 1

Completed:

- workspace monorepo setup
- frontend import
- shared types package
- minimal server package
- root build/dev/start scripts

## Phase 2

Completed:

- backend route structure
- auth service and middleware
- session persistence
- config persistence
- WebSocket handshake and heartbeat

## Phase 3

Completed:

- tmux-backed terminal session manager with reconnect-safe runtime ownership
- CLI adapters reused for launch command construction
- session persistence for terminal metadata and terminal size
- missing-tmux failure path with actionable error messaging
- tmux session cleanup on stale-session removal and explicit delete

## Phase 4

Completed:

- frontend store now hydrates sessions and CLI programs from the backend
- chat route now defaults to a derived transcript view while keeping terminal one tap away
- new session flow creates real sessions on the server
- CLI program editor persists CRUD changes through backend config routes
- settings page uses auth/config APIs and keeps tunnel control deferred to phase 5
- websocket reconnect restores the latest tmux snapshot instead of replaying transcript messages
- mobile terminal controls now provide enter, backspace, ctrl, escape, tab, and arrow keys
- conservative backend detection can mark sessions as terminal-required for approvals and menus
- hybrid websocket frames now carry chat, surface, and terminal state together
- provider transcript readers now resolve Claude and Codex local transcript files when available
- chat bootstrap now prefers parsed provider messages over raw tmux TUI dumps
- terminal reconnect now clears stale pane metadata and recreates tmux sessions instead of crashing on missing panes
- websocket terminal command failures now surface as runtime errors instead of being mislabeled as invalid frames

## Phase 5

Later:

- tunnel process manager
- tunnel routes
- QR flow
- remote auth UX

Delivered before tunnel work:

- one persistent tmux runtime per app session
- tmux pane history remains the source of truth for runtime content
- derived chat transcript is rebuilt from websocket bootstrap plus supervisor updates
- terminal remains the guaranteed recovery path when chat extraction is ambiguous
