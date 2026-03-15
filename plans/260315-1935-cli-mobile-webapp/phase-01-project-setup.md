# Phase 01: Project Setup & Frontend Import

**Priority:** Critical | **Status:** Complete

## Overview
Setup npm workspace monorepo, import rocket.dev frontend, create server/shared packages, verify build.

## Implementation Steps

### 1. Initialize Monorepo
- Create root `package.json` with npm workspaces: `packages/*`
- Create `turbo.json` for build orchestration
- Setup root `.gitignore`, `.env.example`

### 2. Import Frontend
- Copy `/tmp/codeject-rocket/codeject` into `packages/web/`
- Clean up: remove `.env` (secrets), verify `package.json`
- Configure `next.config.mjs` for static export (`output: 'export'`)
- Verify `npm run build` produces `out/` directory

### 3. Create Shared Types Package
- `packages/shared/src/types.ts` — extract types from frontend `src/types/index.ts`
- Session, Message, CliProgram, AppSettings interfaces
- Both frontend and backend import from `@codeject/shared`

### 4. Create Server Package Skeleton
- `packages/server/package.json` with Express, ws, node-pty deps
- `packages/server/tsconfig.json`
- `packages/server/src/index.ts` — minimal Express serving static files

### 5. Dev Scripts
- Root `npm run dev` → turbo runs web dev + server dev in parallel
- Root `npm run build` → builds web (static export) then server
- Root `npm start` → runs production server

## Files to Create/Modify
- `package.json` (root workspace)
- `turbo.json`
- `.gitignore`
- `.env.example`
- `packages/web/` (copied from rocket.dev export)
- `packages/web/next.config.mjs` (add static export)
- `packages/shared/package.json`
- `packages/shared/src/types.ts`
- `packages/shared/tsconfig.json`
- `packages/server/package.json`
- `packages/server/tsconfig.json`
- `packages/server/src/index.ts`

## Success Criteria
- [x] `npm install` works from root
- [x] `npm run build -w @codeject/web` produces `out/`
- [x] `npm run dev` starts both frontend and backend
- [x] Shared types importable from both packages
