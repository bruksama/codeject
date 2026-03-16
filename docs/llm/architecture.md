# Architecture (LLM)

## Components

### Web (`packages/web`)

- Role: mobile-first React UI for listing sessions, creating sessions, viewing chat, and interacting with the terminal.
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
- Exposed via `/api/tunnel` endpoints for status, start, stop, restart.

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
5. Transcript reader and terminal snapshot logic update chat messages and terminal view.

### Remote access flow

1. User enables tunnel via `/api/tunnel/start`.
2. Server starts a `cloudflared` process bound to the local server.
3. Tunnel state and public URL are exposed via `/api/tunnel`.
4. Non-local requests coming through the tunnel must present a valid bearer token.

## Important constraints

- Host **must** have `tmux` installed.
- Remote access **requires** `cloudflared` on the host.
- Runtime source of truth is tmux; chat transcript is derived UX state.
- Local requests bypass auth; non-local always require bearer auth.

