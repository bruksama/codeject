# System Architecture

## Runtime Model

Production uses a single Node.js process for Express and WebSocket handling.

```text
Browser
  -> Express static files
  -> REST API under /api/*
  -> WebSocket under /ws/:sessionId
```

The frontend is built as a static export and served by the backend.

## Components

### Frontend

- Next.js 16 app router
- Zustand store
- mobile-focused session/chat/settings screens

### Backend

- Express 5 server
- route modules for health, auth, sessions, and config
- auth middleware that bypasses local requests
- file-backed stores under `~/.codeject`
- WebSocket upgrade handler with ping/pong heartbeat

### Shared

- `Session`
- `Message`
- `CliProgram`
- `AppSettings`

## Persistence

- config: `~/.codeject/config.json`
- sessions: `~/.codeject/sessions/*.json`

## Auth Model

- local requests allowed without bearer auth
- non-local requests require bearer auth
- stored API key is hashed on disk

## Current Gap

The backend currently authenticates and accepts WebSocket connections, but it does not yet attach them to PTY-managed CLI processes. That is phase 3.

