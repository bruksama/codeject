# Architecture (LLM)

## Components

### Web (`packages/web`)

- Role: mobile-first React UI for listing sessions, creating sessions, viewing chat, and responding to CLI prompts via inline action cards.
- Technology: Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand.
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
  - Derive chat action cards in this order: snapshot structured prompt -> snapshot generic free-input prompt -> terminal-required reason-only fallback when no safe card can be inferred.
  - Gate `Claude Code` and `OpenAI Codex` assistant content on transcript final-answer state; terminal snapshots stay action-only for those providers.
  - Manage a single Cloudflare Tunnel process for remote access.

### Shared (`packages/shared`)

- Role: central TypeScript types shared between web and server:
  - `Session`, `Message`, `ChatState`, `ChatActionRequest`
  - `CliProgram`, `AppSettings`
  - `TerminalRuntime`, `TerminalSnapshot`

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
- Exposed via `/api/tunnel` endpoints for status, start, stop, restart, and config update.

## Data and persistence

- Default root: `~/.codeject` (overridable via `CODEJECT_HOME`).
- Files:
  - `config.json`: auth key and app configuration.
  - `sessions/*.json`: persisted session metadata.
- Terminal scrollback is kept inside tmux history, not in JSON files.

## Request / data flows

### Typical chat flow

1. User opens a session in the web UI.
2. Web connects to `/ws/:sessionId`.
3. User sends a prompt (`chat:prompt` event).
4. Server forwards to the underlying CLI program via tmux.
5. Transcript reader and terminal snapshot logic update chat messages and action-card state.
6. For `Claude Code` and `OpenAI Codex`, the UI stays in loading until transcript state is `final`; intermediate commentary is not rendered as assistant chat content.
7. Generic tail prompts such as `Project name:` or `Paste token:` become `free-input` cards in chat.
8. If no safe card can be derived, the server still marks the session `terminal-required` and the UI shows a warning banner instead of a raw terminal viewport.

### Remote access flow

1. User enables tunnel via `/api/tunnel/start`.
2. Server starts a `cloudflared` process in either quick or named-token mode.
3. Tunnel state and public URL are exposed via `/api/tunnel`.
4. Non-local REST requests coming through the tunnel must present `Authorization: Bearer <key>`; non-local WebSocket connections use `?token=<key>`.

## Important constraints

- Host **must** have `tmux` installed.
- Remote access **requires** `cloudflared` on the host.
- Runtime source of truth is tmux; chat transcript is derived UX state.
- `Claude Code` and `OpenAI Codex` currently use final-only chat rendering, not visible token-by-token streaming.
- Local requests bypass auth; non-local REST and WebSocket connections both require the same API key, but transport it differently.
- Opaque arrow-key or full-screen TUIs are still not first-class chat cards.
