# CLAUDE.md

Repository instructions for Claude.

## Project

Codeject is a mobile-first local control surface for CLI coding assistants.

Current architecture:

- `packages/web`: Next.js 16, React 19, Tailwind CSS 4, Zustand
- `packages/server`: Express 5, REST API, auth, persistence, WebSocket handshake
- `packages/shared`: shared TypeScript types

Current phase status:

- Phase 1: complete
- Phase 2: complete
- Phase 3: next

Primary plan:

- `plans/260315-1935-cli-mobile-webapp/plan.md`

## Required Reading

Before implementing:

1. Read `README.md`
2. Read the relevant phase file in `plans/260315-1935-cli-mobile-webapp/`
3. Inspect the files you will modify

## Repository Rules

- Follow the current phase plan unless the user explicitly changes direction
- Keep direct dependencies exact-pinned
- Do not introduce caret ranges
- Do not run `npm install` unless `package.json` or `package-lock.json` changed
- Do not create duplicate replacement files unless explicitly requested
- Prefer small, direct edits over broad refactors

## Architecture Rules

- Production runs as one Express server on `:3500`
- Express serves the static frontend from `packages/web/out`
- API routes live under `/api/*`
- WebSocket connections live under `/ws/:sessionId`
- Persistent data lives under `~/.codeject`

Persistence layout:

- config: `~/.codeject/config.json`
- sessions: `~/.codeject/sessions/*.json`

Auth model:

- local requests bypass auth
- non-local requests require `Authorization: Bearer <key>`

## Frontend Rules

- Preserve the imported mobile UI and visual language
- Keep App Router conventions
- Maintain static export compatibility
- Treat the Zustand store as temporary integration scaffolding until phase 4 replaces mocks

## Backend Rules

- Keep routes thin
- Keep persistence logic in services
- Keep auth logic isolated
- Keep websocket upgrade and connection logic isolated
- Reuse `@codeject/shared` types instead of redefining interfaces

## Verification

Run the narrowest useful checks after edits.

Full repo:

- `npm run lint`
- `npm run type-check`
- `npm run build`

Web only:

- `npm run lint -w @codeject/web`
- `npm run type-check -w @codeject/web`
- `npm run build -w @codeject/web`

Server only:

- `npm run type-check -w @codeject/server`
- `npm run build -w @codeject/server`

## Documentation

Use `docs/` as the repository documentation source of truth.

When implementation changes phase status or architecture, update:

- `docs/project-roadmap.md`
- `docs/system-architecture.md`
- other affected docs as needed

