# Codeject

Mobile-first web app for controlling local CLI coding assistants from a phone.

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4, Zustand
- Backend: Express 5, `ws`, `tmux`
- Shared: TypeScript workspace package
- Monorepo: npm workspaces + Turbo

## Current Status

- Phase 1 complete: monorepo setup, frontend import, shared package, static export
- Phase 2 complete: backend core, REST API, auth, WebSocket handshake, disk persistence
- Phase 3 complete: tmux-backed terminal bridge
- Phase 4 complete: hybrid chat-first session experience over tmux runtime
- Phase 5 pending: remote tunnel flow

## Workspace Layout

```text
codeject/
├── packages/
│   ├── web/       # Next.js mobile UI
│   ├── server/    # Express + WebSocket backend
│   └── shared/    # Shared TS types
├── docs/          # Project documentation
├── plans/         # Phase plans
├── package.json
└── turbo.json
```

## Commands

- `npm run dev` - run web and server in parallel
- `npm run build` - build all workspaces
- `npm run lint` - lint workspaces
- `npm run type-check` - type-check workspaces
- `npm start` - start production Express server on `:3500`

## Runtime Notes

- Production serves the static frontend from the Express server
- Session data persists under `~/.codeject/sessions/`
- Config data persists under `~/.codeject/config.json`
- Local requests bypass auth; non-local requests require bearer auth
- Each app session owns one persistent tmux runtime
- Sessions default to chat view with one-tap terminal fallback
- `tmux` must be installed on the host machine
- Terminal scrollback lives in tmux history instead of session JSON files
- Derived chat transcript is a UX layer, not the runtime source of truth

## API Surface

- `GET /api/health`
- `GET /api/auth`
- `POST /api/auth/rotate`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/:sessionId`
- `PATCH /api/sessions/:sessionId`
- `DELETE /api/sessions/:sessionId`
- `GET /api/config/programs`
- `POST /api/config/programs`
- `PUT /api/config/programs/:programId`
- `DELETE /api/config/programs/:programId`
- `WS /ws/:sessionId`

## WebSocket Protocol

- Client to server: `chat:prompt`, `surface:set-mode`, `terminal:init`, `terminal:input`, `terminal:key`, `terminal:resize`, `terminal:ping`
- Server to client: `chat:bootstrap`, `chat:message`, `chat:update`, `surface:update`, `terminal:ready`, `terminal:snapshot`, `terminal:update`, `terminal:status`, `terminal:error`, `terminal:pong`

## Frontend Integration

- Sessions list reads from `GET /api/sessions`
- New session flow creates real backend sessions via `POST /api/sessions`
- Chat route now opens in chat mode and keeps terminal as fallback over `WS /ws/:sessionId`
- CLI program editor uses `/api/config/programs`
- Settings page uses real auth/config endpoints; tunnel controls remain Phase 5

## Dependency Policy

- Direct dependencies are exact-pinned
- `package-lock.json` is part of the source of truth
- Use latest stable intentionally, then re-pin
- Do not run `npm install` unless dependency files changed
