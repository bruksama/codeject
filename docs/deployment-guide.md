# Deployment Guide

## Local Development

Requirements:

- Node.js matching `packageManager` expectations
- npm
- `tmux`

Commands:

- `npm run dev`
- `npm run lint`
- `npm run type-check`
- `npm run build`

## Local Production Run

Build:

- `npm run build`

Start:

- `npm start`

The production server listens on `PORT` or defaults to `3500`.

Current local production scope:

- phases 1 to 4 are implemented locally
- hybrid chat and terminal surfaces are available over the same WebSocket session
- provider transcript parsing improves chat bootstrap for Claude and Codex sessions when local transcript files exist

## Environment

Current env file:

- `.env.example`

Supported variables:

- `PORT`
- `HOST`
- `CODEJECT_HOME` optional override for `~/.codeject`

## Persistence

The app writes local state under:

- `~/.codeject/config.json`
- `~/.codeject/sessions/`

## Remote Access

Remote tunnel deployment is planned for phase 5 and is not production-ready yet.
