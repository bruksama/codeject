# Codeject – LLM Project Summary

## Purpose

- Local web UI to control CLI coding assistants (Claude Code, Codex, generic shell) running on the user's own machine.
- Mobile-first interface that works well on phones, while keeping all execution local.

## Non-goals

- Not a multi-tenant cloud SaaS.
- Not a replacement for the assistants themselves.
- Not a generic terminal emulator without chat awareness.

## Main components

- `packages/codeject-cli`: Node.js admin CLI for global hook install/status/repair/uninstall.
- `packages/web`: Next.js 16 + React 19 UI, mobile-first.
- `packages/server`: Express 5 API + WebSocket, auth, persistence, tmux/tunnel orchestration.
- `packages/shared`: Shared TypeScript types and Zod wire schemas used by both web and server.

## Key flows

- User opens the web UI → creates a session → selects a CLI program → server maps that session to a tmux target → web shows chat plus inline action cards for approvals, selects, and generic text prompts.
- If action cards are not enough for the current CLI state, the same session view can switch to a lightweight terminal tab backed by tmux snapshots, direct text input, and virtual special keys.
- `Claude Code` and `OpenAI Codex` use final-only assistant rendering: keep loading while transcript is still working, then patch one final assistant answer.
- If browser notifications are enabled for that device, the web app can alert on action-needed, reply-ready, terminal-error, and session-finished events while the tab is unfocused.
- Optional: server manages a single Cloudflare Tunnel process to expose the local web UI remotely, either as a quick tunnel or a named token-based tunnel with optional auto-start.
- Optional admin CLI: `codeject install|status|repair|uninstall` manages global Claude/Codex stop hooks and stores installer state in `~/.codeject/install-state.json`.

## Runtime model

- Single Node.js process in production:
  - Serves static frontend from `packages/web/out`.
  - Exposes REST API under `/api/*`.
  - Exposes WebSocket endpoints under `/ws/:sessionId`.
- Persistent data under `~/.codeject` by default:
  - `config.json`
  - `sessions/*.json`

## Verification model

- Root verification now includes `npm test` in addition to `lint`, `type-check`, and `build`.
- Server tests use `node:test`.
- Web tests use Vitest + jsdom + React Testing Library.
- Current web test focus:
  - Zustand app-store persistence and session selection behavior
  - WebSocket client queue/reconnect behavior
  - notification trigger behavior
  - provider-aware command suggestions
  - inline action-card submit lifecycle
  - terminal snapshot / input interaction flow

## Auth model (high level)

- Local requests: bypass auth.
- Non-local REST requests: require `Authorization: Bearer <key>`.
- Non-local WebSocket connections: require `?token=<apiKey>` on `/ws/:sessionId`.
- API key is hashed before being stored; QR codes only contain public URLs.
- Remote devices may save the bearer key locally in browser storage after opening the public URL.

## Source-of-truth docs

- Human docs (Vietnamese): [`docs/architecture.md`](../architecture.md), [`docs/configuration.md`](../configuration.md), [`docs/usage-guide.md`](../usage-guide.md)
- LLM docs (English, compact): [`docs/llm/architecture.md`](./architecture.md), [`docs/llm/project-summary.md`](./project-summary.md), [`docs/llm/api-reference.md`](./api-reference.md)

## Recent cleanup/stabilization notes

- Removed dead web dependencies: `@dhiwise/component-tagger`, `recharts`, `@netlify/plugin-nextjs`.
- Decomposed the largest web route files into local components to keep page-level state orchestration smaller.
- Added reconnect UX in chat: dismissible status banner, elapsed disconnect timer, reconnect success auto-hide, and retry toast with manual reconnect action.
- Added Zod runtime validation at the WebSocket boundary plus browser notification opt-in flow in Appearance settings.
- Added a lightweight terminal tab backed by `terminal:snapshot` frames so users can handle menu navigation and direct CLI input without bringing back a full emulator dependency.
