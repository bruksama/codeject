# Codebase Summary

## Summary

This repository is an npm workspace monorepo with three packages:

- `packages/web`: Next.js app router frontend
- `packages/server`: Express backend with REST and WebSocket entrypoints
- `packages/shared`: shared TypeScript types

The repo currently has roughly 4.8k lines of source across app, server, config, and shared files.

## Package Summary

### `packages/web`

Purpose:

- mobile UI
- session list and chat surface
- settings and CLI program management screens

Important files:

- `src/app/chat-interface/page.tsx`
- `src/app/cli-program-editor/page.tsx`
- `src/app/new-session-setup/page.tsx`
- `src/app/settings/page.tsx`
- `src/stores/useAppStore.ts`
- `eslint.config.mjs`

Current state:

- fully styled UI
- static export enabled
- still relies on mock store behavior for true CLI streaming and CRUD integration

### `packages/server`

Purpose:

- serve static frontend
- expose REST API
- manage auth and persistence
- accept WebSocket upgrades

Important files:

- `src/index.ts`
- `src/services/session-store.ts`
- `src/services/config-store.ts`
- `src/services/auth-service.ts`
- `src/routes/*`
- `src/websocket/websocket-handler.ts`

Current state:

- phase 2 complete
- session/config persistence implemented
- API and WS handshake implemented
- PTY bridge not yet implemented

### `packages/shared`

Purpose:

- shared interfaces for sessions, messages, CLI programs, and settings

Important files:

- `src/types.ts`

## Largest Source Files

- `packages/web/src/app/settings/page.tsx`
- `packages/web/src/app/cli-program-editor/page.tsx`
- `packages/web/src/app/chat-interface/page.tsx`
- `packages/web/src/app/new-session-setup/page.tsx`
- `packages/web/src/app/sessions-list/page.tsx`

These are the best candidates for future modularization if behavior keeps growing.

