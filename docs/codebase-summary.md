# Codebase Summary

Snapshot: 2026-04-03

## Purpose

Codeject is a local-first, mobile-friendly web surface for controlling CLI coding assistants. The app keeps execution on the host machine and exposes a compact UI for chat, approvals, session control, remote access, and terminal fallback.

## Repository Layout

| Area | Path | Role |
|---|---|---|
| Web app | `packages/web` | Next.js UI for sessions, chat, settings, notifications, and terminal tab |
| Server | `packages/server` | Express API, WebSocket gateway, auth, persistence, tmux orchestration, tunnel management |
| Shared | `packages/shared` | Shared types and Zod wire schemas |
| Admin CLI | `packages/codeject-cli` | `codeject install|status|repair|uninstall` for global hook management |
| Docs | `docs/` | Human-facing, English, and LLM-facing documentation |

## Runtime Model

- Production serves the built web app from the Express server.
- REST lives under `/api/*`.
- WebSocket lives under `/ws/:sessionId`.
- Persistent app state defaults to `~/.codeject`.
- Terminal runtime state lives in `tmux`.

## Main Product Flows

1. User creates or restores a session.
2. Web app connects to the session WebSocket.
3. User sends prompts and answers inline action cards.
4. Server forwards commands to the provider runtime through `tmux`.
5. Transcript parsing and terminal snapshots update chat state.
6. Optional Cloudflare Tunnel exposes the local app remotely.
7. Global stop hooks can call back into the server for faster transcript settlement.

## Runtime Robustness

- Web socket reconnects avoid stale-event duplicates, and chat messages are normalized by `message.id` so replayed updates stay idempotent.
- Terminal-required detection is conservative around resumed shell prompts, which reduces false positives when the assistant has already returned to a normal prompt.

## Global Hook Installer

- `codeject install` installs Codeject-managed stop hooks for Claude Code and OpenAI Codex.
- The installer writes wrappers under `~/.codeject/bin/`.
- Installer state is stored in `~/.codeject/install-state.json`.
- `status` reports whether wrapper, config, and feature-flag state match.
- `repair` recreates missing Codeject-managed pieces from install-state.
- `uninstall` removes the hook integration and deletes `~/.codeject`.

## Verification

- Repo checks: `npm run lint`, `npm run type-check`, `npm run build`.
- Server checks: `npm run type-check -w @codeject/server`, `npm run build -w @codeject/server`.
- Web checks: `npm run lint -w @codeject/web`, `npm run type-check -w @codeject/web`, `npm run build -w @codeject/web`.

## Reference Docs

- Architecture: [`docs/architecture.md`](./architecture.md)
- Configuration: [`docs/configuration.md`](./configuration.md)
- Usage: [`docs/usage-guide.md`](./usage-guide.md)
- Deployment: [`docs/deployment.md`](./deployment.md)
- Troubleshooting: [`docs/troubleshooting.md`](./troubleshooting.md)
