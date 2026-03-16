# Coding Standards (LLM)

This document summarizes the most important rules for AI coding agents working in this repository.

## General principles

- Prefer **small, direct, readable** changes.
- Avoid premature abstraction; follow YAGNI.
- Reuse `@codeject/shared` types instead of redefining them.
- Keep direct dependencies **exact-pinned**; do not introduce caret ranges.
- Do not run `npm install` unless dependency files changed.

## Project structure

- `packages/web/src`: frontend (Next.js App Router, React 19, Tailwind 4, Zustand).
- `packages/server/src`: backend (Express 5, REST, WebSocket, tmux, tunnel).
- `packages/shared/src`: shared TypeScript types.
- `docs/`: human-facing documentation.
- `docs/llm/`: LLM-facing compact documentation.

## Frontend rules

- Preserve the existing **mobile-first** layout and visual language.
- Respect Next.js App Router conventions.
- Maintain static export compatibility.
- Do **not** introduce conflicting UI libraries or a second design system.
- When a UI file grows too large, split into components or hooks instead of adding complexity in-place.

## Backend rules

- Keep routes thin; move logic into services.
- Separate config, middleware, routes, services, and WebSocket handling.
- Keep auth logic isolated and consistent with the documented model:
  - Local requests bypass auth.
  - Non-local requests require bearer auth.
- Manage runtime state and transcript sync with safe fallbacks; terminal remains the final recovery path.
- Use tmux as the runtime source of truth for terminal state.

## Documentation rules

- `docs/` is the source of truth for documentation.
- When architecture or phase status changes, update:
  - `README.md`
  - `docs/system-architecture.md`
  - `docs/project-roadmap.md`
  - any directly affected docs
- Human docs (VN) should be concise and readable.
- LLM docs (EN) should be compact, structured, and token-efficient.

## Verification

- Whole repo:
  - `npm run lint`
  - `npm run type-check`
  - `npm run build`
- Web only:
  - `npm run lint -w @codeject/web`
  - `npm run type-check -w @codeject/web`
  - `npm run build -w @codeject/web`
- Server only:
  - `npm run type-check -w @codeject/server`
  - `npm run build -w @codeject/server`

