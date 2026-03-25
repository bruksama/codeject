# Architecture (LLM)

## Components

### Web (`packages/web`)

- Role: mobile-first React UI for listing sessions, creating sessions, viewing chat, and responding to CLI prompts via inline action cards.
- Technology: Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand.
- Verification: Vitest + jsdom + React Testing Library for frontend logic.
- Notes:
  - Browser notification support is opt-in per browser via `AppSettings.notifications`.
  - Permission state is synced against the real browser permission when the app regains focus/visibility.
  - Viewport-locked page shells keep headers fixed on mobile; chat keeps the header and composer dock static while only the transcript scrolls.
  - Session view keeps persistent runtime controls inside a two-row header: top row for back/title/icon-only reconnect, bottom row for connection status, a truncated tmux badge, and compact icon-only `Chat` / `Terminal` switching.
  - The terminal tab is a lightweight tmux snapshot viewer with an input bar and virtual special-key keyboard, not a full emulator.
  - Font-size scaling also updates shell clearances for bottom navigation and the chat command-menu dock so large mobile text does not break header/action alignment.
- Talks to server via:
  - HTTP REST API under `/api/*`.
  - WebSocket under `/ws/:sessionId`.

### Server (`packages/server`)

- Role: REST API, WebSocket handler, auth, persistence, tmux and tunnel orchestration.
- Technology: Express 5, `ws`, Node.js.
- Responsibilities:
  - Serve static frontend from `packages/web/out`.
  - Expose `/api/*` routes for health, auth, sessions, config, tunnel.
  - Manage per-session mapping to tmux runtimes.
  - Read and write config and sessions under `~/.codeject`.
  - Validate incoming client WebSocket frames with shared Zod schemas.
  - In development, assert outgoing server WebSocket frames against the same shared schema.
  - Broadcast `terminal:snapshot` frames so the web terminal tab can mirror tmux pane content.
  - Derive chat action cards in this order: snapshot structured prompt -> snapshot generic free-input prompt -> terminal-required reason-only fallback when no safe card can be inferred.
  - Gate `Claude Code` and `OpenAI Codex` assistant content on transcript final-answer state; terminal snapshots stay action-only for those providers.
  - Manage a single Cloudflare Tunnel process for remote access.

### Shared (`packages/shared`)

- Role: central TypeScript types shared between web and server:
  - `Session`, `Message`, `ChatState`, `ChatActionRequest`
  - `CliProgram`, `AppSettings`
  - `TerminalRuntime`, `TerminalSnapshot`
  - Zod schemas for `ClientWebSocketMessage`, `ServerWebSocketMessage`, and nested wire payloads

### tmux runtime

- Role: runtime source of truth for terminal state and CLI processes.
- Code: managed via `tmux` bridge and `terminal-session-manager` in the server.
- Key operations:
  - Create / kill tmux sessions.
  - Send keys.
  - Resize panes.
  - Capture pane contents.

### Cloudflare Tunnel

- Role: provide a public URL for the local web server.
- Managed by a dedicated tunnel manager service in the server.
- Supports two modes:
  - `quick`: ephemeral `trycloudflare.com` URL discovered from runtime output
  - `named-token`: fixed hostname derived from saved config, started with a saved tunnel token
- Named-tunnel mode may also auto-start when persisted config enables it.
- Exposed via `/api/tunnel` endpoints for status, start, stop, restart, and config update.

## Data and persistence

- Default root: `~/.codeject` (overridable via `CODEJECT_HOME`).
- Files:
  - `config.json`: auth key and app configuration.
  - `sessions/*.json`: persisted session metadata.
- Terminal scrollback is kept inside tmux history, not in JSON files.
- Per-device remote bearer keys are not stored in `~/.codeject`; they live in each browser's local storage.

## Request / data flows

### Typical chat flow

1. User opens a session in the web UI.
2. Web connects to `/ws/:sessionId`.
3. Both sides validate wire frames against shared Zod schemas before trusting payload shape.
4. User sends a prompt (`chat:prompt` event).
5. Server forwards to the underlying CLI program via tmux.
6. Transcript reader and terminal snapshot logic update chat messages and action-card state.
7. For `Claude Code` and `OpenAI Codex`, the UI stays in loading until transcript state is `final`; intermediate commentary is not rendered as assistant chat content.
8. Generic tail prompts such as `Project name:` or `Paste token:` become `free-input` cards in chat.
9. If browser notifications are enabled and the tab is unfocused, the web app can emit notifications for action-needed, reply-ready, terminal-error, and session-finished events.
10. When a previously connected WebSocket drops, the web UI tracks the disconnect cycle to show reconnect/disconnect status, elapsed disconnect time, and a manual reconnect action.
11. If no safe card can be derived, the server still marks the session `terminal-required`; the UI shows a warning/banner state and can route the user to the terminal tab for direct input.

### Remote access flow

1. User enables tunnel via `/api/tunnel/start`.
2. Server starts a `cloudflared` process in either quick or named-token mode.
3. Tunnel state, auto-start flag, and public URL are exposed via `/api/tunnel`.
4. Non-local REST requests coming through the tunnel must present `Authorization: Bearer <key>`; non-local WebSocket connections use `?token=<key>`.

## Important constraints

- Host **must** have `tmux` installed.
- Remote access **requires** `cloudflared` on the host.
- Tunnel auto-start is intentionally limited to named-token mode.
- Runtime source of truth is tmux; chat transcript is derived UX state.
- `Claude Code` and `OpenAI Codex` currently use final-only chat rendering, not visible token-by-token streaming.
- Local requests bypass auth; non-local REST and WebSocket connections both require the same API key, but transport it differently.
- The terminal tab is still snapshot-based, so opaque arrow-key or full-screen TUIs are not first-class emulated terminals yet.
- Root workspace verification now expects `npm test` to run both server `node:test` and web Vitest suites.
