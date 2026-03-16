# Codebase Summary

## Summary

This repository is an npm workspace monorepo with three packages:

- `packages/web`: Next.js app router frontend
- `packages/server`: Express backend with REST and WebSocket entrypoints
- `packages/shared`: shared TypeScript types

The repo currently centers on a complete local Phase 4 implementation: tmux-backed runtimes, hybrid chat-terminal UX, backend-backed session/config CRUD, and provider transcript parsing for cleaner chat bootstrap.

## Package Summary

### `packages/web`

Purpose:

- mobile UI
- session list, chat surface, and terminal surface
- settings and CLI program management screens

Important files:

- `src/app/chat-interface/page.tsx`
- `src/app/cli-program-editor/page.tsx`
- `src/app/new-session-setup/page.tsx`
- `src/components/terminal/terminal-viewport.tsx`
- `src/hooks/use-hybrid-session.ts`
- `src/app/settings/page.tsx`
- `src/stores/useAppStore.ts`
- `eslint.config.mjs`

Current state:

- fully styled UI
- static export enabled
- session list, settings, and CLI program flows are wired to the backend
- chat route runs in hybrid mode with WebSocket-driven chat, surface, and terminal state
- chat prompt submission now uses an optimistic local user/pending-assistant pair so the inline 3-dot state appears immediately instead of waiting for websocket roundtrips
- terminal viewport uses xterm with mobile key strip and guarded resize handling

### `packages/server`

Purpose:

- serve static frontend
- expose REST API
- manage auth and persistence
- own tmux runtime lifecycle
- accept WebSocket upgrades for chat and terminal streaming

Important files:

- `src/index.ts`
- `src/services/session-store.ts`
- `src/services/config-store.ts`
- `src/services/auth-service.ts`
- `src/services/terminal-session-manager.ts`
- `src/services/session-supervisor.ts`
- `src/services/provider-transcript-reader.ts`
- `src/routes/*`
- `src/websocket/websocket-handler.ts`

Current state:

- phase 4 complete
- session/config persistence implemented
- tmux-backed runtime management implemented
- chat transcript bootstrap prefers Claude/Codex provider transcripts when available
- session supervisor now reserves a fresh assistant placeholder per prompt and blocks stale carry-over from the previous settled assistant answer
- reconnect and stale-pane recovery paths are hardened to avoid server crashes

### `packages/shared`

Purpose:

- shared interfaces for sessions, messages, CLI programs, hybrid chat state, terminal runtime, and settings

Important files:

- `src/types.ts`

## Largest Source Files

- `packages/web/src/app/settings/page.tsx`
- `packages/web/src/app/cli-program-editor/page.tsx`
- `packages/web/src/app/chat-interface/page.tsx`
- `packages/web/src/app/new-session-setup/page.tsx`
- `packages/web/src/app/sessions-list/page.tsx`

These are the best candidates for future modularization if behavior keeps growing.
