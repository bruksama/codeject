# Codeject - Mobile CLI Bridge

> Mobile-first webapp to control local CLI coding assistants from your phone via tunnel.

## Overview

**Goal:** Single Express server that serves the Next.js static frontend, manages CLI processes via PTY, streams output over WebSocket, and exposes everything through one Cloudflare Tunnel port.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 15 (static export) + Tailwind + Zustand | Already built via rocket.dev, dark glassmorphism UI |
| Backend | Express + ws + node-pty | Single persistent process for PTY + WebSocket |
| Shared | TypeScript types package | Type safety across frontend/backend |
| Monorepo | npm workspaces | Share types, unified scripts |
| Remote | Cloudflare Tunnel | One port, secure remote access |

## Architecture

```
Phone Browser ──── Cloudflare Tunnel (:3500) ──── Your Machine
                                                       │
                                            Express Server (:3500)
                                            ├── Static UI (Next.js export)
                                            ├── REST API (/api/*)
                                            │   ├── /api/sessions
                                            │   ├── /api/auth
                                            │   └── /api/config
                                            ├── WebSocket (/ws)
                                            │   ├── Stream multiplexer
                                            │   └── Heartbeat
                                            └── Services
                                                ├── CLI Manager (node-pty)
                                                ├── Session Store (JSON files)
                                                ├── Auth Manager (API key)
                                                └── Tunnel Manager (cloudflared)
```

## Monorepo Structure

```
codeject/
├── packages/
│   ├── web/                    # Next.js frontend (rocket.dev export)
│   │   ├── src/app/            # App Router pages
│   │   ├── src/components/     # UI components
│   │   ├── src/stores/         # Zustand state
│   │   └── out/                # Static export output
│   ├── server/                 # Express backend
│   │   └── src/
│   │       ├── index.ts        # Entry: static + API + WS
│   │       ├── routes/         # REST endpoints
│   │       ├── services/       # PTY, sessions, auth, tunnel
│   │       ├── adapters/       # CLI-specific adapters
│   │       └── websocket/      # WS handler + multiplexer
│   └── shared/                 # Shared TypeScript types
│       └── src/types.ts
├── package.json                # Workspaces root
├── turbo.json                  # Build orchestration
└── .env.example
```

## Phases

| # | Phase | Status | Link |
|---|-------|--------|------|
| 1 | Project Setup & Frontend Import | Complete | [phase-01](./phase-01-project-setup.md) |
| 2 | Backend Core (Express + WS) | Complete | [phase-02](./phase-02-backend-core.md) |
| 3 | CLI Bridge (node-pty + adapters) | Pending | [phase-03](./phase-03-cli-bridge.md) |
| 4 | Frontend-Backend Integration | Pending | [phase-04](./phase-04-frontend-backend-integration.md) |
| 5 | Remote Access (Tunnel + Auth) | Pending | [phase-05](./phase-05-remote-access.md) |

## Key Decisions

- **Single server:** Express serves static frontend + API + WebSocket on one port
- **No KonstaUI:** Keep rocket.dev's custom Tailwind glassmorphism UI as-is
- **No SSR needed:** Static export sufficient (local tool, no SEO)
- **Dev mode:** Next.js dev (:3000) + Express (:3500) with proxy; Prod: single port

## Key Features

- **Universal CLI Adapter:** Connect to any CLI via configurable command
- **Real-time Streaming:** WebSocket-powered live PTY output
- **Mobile-First:** Dark glassmorphism UI, touch-optimized
- **Session Persistence:** Resume sessions across reconnects
- **Multi-Session:** Multiple CLI sessions in parallel
- **One-Port Remote:** Cloudflare tunnel exposes single port
- **PWA:** Installable on phone home screen

## Success Criteria

- [ ] Connect to Claude Code CLI and stream responses on phone
- [ ] Mobile UI works smoothly via tunnel
- [ ] Sessions persist across page reloads
- [ ] Works with claude, codex, and at least 1 other CLI
- [ ] Single `npm start` launches everything
