# Phase 02: Backend Core (Express + WebSocket)

**Priority:** High | **Status:** Complete

## Overview
Express server serving static frontend, REST API endpoints, and WebSocket server. Single port for everything.

## Architecture

```
Express (:3500)
├── Static middleware → packages/web/out/
├── /api/sessions     → CRUD sessions
├── /api/auth         → API key validation
├── /api/config       → CLI programs config
├── /api/health       → Health check
└── WebSocket upgrade → /ws/:sessionId
```

## Files to Create

```
packages/server/src/
├── index.ts                        # Entry: Express + WS + static
├── config/
│   └── environment.ts              # Env vars, defaults, validation
├── routes/
│   ├── sessions-routes.ts          # Session CRUD endpoints
│   ├── auth-routes.ts              # Auth endpoints
│   ├── config-routes.ts            # CLI program config endpoints
│   └── health-routes.ts            # Health check
├── services/
│   ├── session-store.ts            # JSON file session persistence
│   └── auth-service.ts             # API key gen/validation
├── websocket/
│   └── websocket-handler.ts        # WS upgrade, connection mgmt
├── middleware/
│   └── auth-middleware.ts          # API key middleware
└── utils/
    └── logger.ts                   # Simple logger
```

## Implementation Steps

### 1. Express Server Entry
- Serve `packages/web/out/` as static files
- Mount API routes under `/api/*`
- WebSocket upgrade on `/ws/:sessionId`
- CORS for dev mode (frontend :3000 → backend :3500)

### 2. Session Store
- Persist sessions to `~/.codeject/sessions/` as JSON files
- CRUD: create, get, list, update, delete
- Auto-cleanup stale sessions (>24h idle)

### 3. Auth Service
- Generate cryptographically secure API keys
- Store key hash in `~/.codeject/config.json`
- Middleware validates `Authorization: Bearer <key>` header
- Skip auth for local connections (127.0.0.1)

### 4. WebSocket Handler
- Upgrade HTTP connections per session ID
- Authenticate WS connections via query param token
- Message protocol: JSON frames with type field
- Heartbeat ping/pong every 30s
- Handle disconnect/reconnect gracefully

### 5. Config Endpoints
- CRUD for CLI program definitions
- Store in `~/.codeject/config.json`
- Default programs: claude, codex, aider

## Dependencies

```json
{
  "express": "^4.21",
  "ws": "^8.18",
  "uuid": "^10.0",
  "dotenv": "^16.4"
}
```

## Success Criteria
- [x] `npm start` serves frontend UI on :3500
- [x] REST API returns session list
- [x] WebSocket connection establishes
- [x] Auth blocks unauthorized remote requests
- [x] Sessions persist to disk
