# Code Standards

## General

- use exact-pinned direct dependencies
- keep lockfile committed
- avoid reinstalling unless dependency files changed
- keep implementations phase-oriented and small
- prefer reuse of `@codeject/shared` types

## File Organization

- frontend code lives in `packages/web/src`
- backend code lives in `packages/server/src`
- shared types live in `packages/shared/src`
- docs live in `docs/`
- plans live in `plans/`

## Frontend

- preserve the existing mobile-first visual system
- keep App Router conventions
- use flat ESLint config
- keep static export compatibility in mind
- avoid unnecessary design-system churn

## Backend

- split route, service, middleware, config, and websocket concerns into separate files
- keep request handlers thin
- keep persistence logic in services
- prefer plain JSON persistence until phases require more

## Quality Gates

- `npm run lint`
- `npm run type-check`
- `npm run build`

Run narrower workspace checks when only one package changes.

## Documentation Standard

- update docs when phase status changes
- reflect real architecture, not planned architecture only
- keep docs concise and scan-friendly

