# Codeject – LLM Project Summary

## Purpose

- Local web UI to control CLI coding assistants (Claude Code, Codex, generic shell) running on the user's own machine.
- Mobile-first interface that works well on phones, while keeping all execution local.

## Non-goals

- Not a multi-tenant cloud SaaS.
- Not a replacement for the assistants themselves.
- Not a generic terminal emulator without chat awareness.

## Main components

- `packages/web`: Next.js 16 + React 19 UI, mobile-first.
- `packages/server`: Express 5 API + WebSocket, auth, persistence, tmux/tunnel orchestration.
- `packages/shared`: Shared TypeScript types used by both web and server.

## Key flows

- User opens the web UI → creates a session → selects a CLI program → server maps that session to a tmux target → web shows chat and terminal for that target.
- Optional: server manages a single Cloudflare Tunnel process to expose the local web UI remotely.

## Runtime model

- Single Node.js process in production:
  - Serves static frontend from `packages/web/out`.
  - Exposes REST API under `/api/*`.
  - Exposes WebSocket endpoints under `/ws/:sessionId`.
- Persistent data under `~/.codeject` by default:
  - `config.json`
  - `sessions/*.json`

## Auth model (high level)

- Local requests: bypass bearer auth.
- Non-local requests: require `Authorization: Bearer <key>`.
- API key is hashed before being stored; QR codes only contain public URLs.

## Source-of-truth docs

- Human docs (Vietnamese): `docs/*.md`
- LLM docs (English, compact): `docs/llm/*.md`

