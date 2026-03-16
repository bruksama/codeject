# AGENTS.md

Instructions for Codex-style agents working in this repository.

## Mission

Work from the current codebase state and maintained documentation. Do not optimize for hypothetical future architecture over the code that exists today.

## Project Layout

- `packages/web`: Next.js frontend
- `packages/server`: Express backend
- `packages/shared`: shared TypeScript types
- `docs/`: project docs

## Startup Checklist

Before coding:

1. Read `README.md`
2. Read the relevant docs in `docs/`
3. Inspect the touched files directly

## Codex Workflow

For Codex sessions in this repository, use this flow and do not substitute a different primary skill when the task matches one of these categories.

1. First of all, use `$ck:ck-help` to find the most suitable skill and verify the workflow.
2. Brainstorming must use `$ck:brainstorm`.
3. Planning must use `$ck:plan`.
4. Implementing must use `$ck:cook`.
5. Debugging and root-cause investigation must use `$ck:debug`.
6. Fixing a bug after debugging must use `$ck:fix` and keep `$ck:debug` active for root-cause discipline.
7. Browser automation, browser verification, and browser-based investigation must use `$ck:agent-browser`.
8. Git tasks must use `$ck:git`.

If a task spans multiple phases, follow the sequence above instead of jumping straight to implementation or fixes.

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
- Phase 3 complete
- Phase 4 complete
- Phase 5 complete
- Current focus: cleanup, stabilization, and documentation updates

## Documentation Rules

Use `docs/` as the source of truth.

- Human-facing docs live in `docs/*.md` (for example: `docs/getting-started.md`, `docs/system-architecture.md`, `docs/project-roadmap.md`).
- LLM-facing compact docs for agents live in `docs/llm/*.md` (for example: `docs/llm/project-summary.md`, `docs/llm/architecture.md`, `docs/llm/api-reference.md`).

When implementation changes architecture or progress, update:

- `README.md`
- `docs/project-roadmap.md`
- `docs/system-architecture.md`
- any directly affected doc (human and LLM variants)
