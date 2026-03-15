# AGENTS.md

Instructions for Codex-style agents working in this repository.

## Mission

Work from the current codebase state and current phase plan. Do not optimize for hypothetical future architecture over the code that exists today.

## Project Layout

- `packages/web`: Next.js frontend
- `packages/server`: Express backend
- `packages/shared`: shared TypeScript types
- `docs/`: project docs
- `plans/`: implementation plans

Primary active plan:

- `plans/260315-1935-cli-mobile-webapp/plan.md`

## Startup Checklist

Before coding:

1. Read `README.md`
2. Read the relevant phase file
3. Inspect the touched files directly

## Codex Rules

- Keep direct dependencies exact-pinned
- Do not run `npm install` unless dependency files changed
- Do not add parallel “enhanced” files
- Prefer editing existing files
- Prefer focused changes over broad rewrites
- Reuse existing workspace boundaries

## Execution Rules

- Follow the current phase order unless the user changes it
- Keep backend code modular: config, middleware, routes, services, websocket
- Reuse `@codeject/shared`
- Preserve frontend design and routing structure unless explicitly asked to redesign

## Runtime Constraints

- Production entrypoint is the Express server in `packages/server`
- Static frontend is served from `packages/web/out`
- REST lives under `/api/*`
- WebSocket lives under `/ws/:sessionId`
- Persistent app state is stored under `~/.codeject`

## Verification Rules

After changes, run the smallest valid set first, then expand if needed.

Repo:

- `npm run lint`
- `npm run type-check`
- `npm run build`

Web:

- `npm run lint -w @codeject/web`
- `npm run type-check -w @codeject/web`
- `npm run build -w @codeject/web`

Server:

- `npm run type-check -w @codeject/server`
- `npm run build -w @codeject/server`

## Current Status

- Phase 1 complete
- Phase 2 complete
- Phase 3 next: PTY manager, adapters, output bridge

## Documentation Rules

Use `docs/` as source of truth.

When implementation changes architecture or progress, update:

- `docs/project-roadmap.md`
- `docs/system-architecture.md`
- any directly affected doc

