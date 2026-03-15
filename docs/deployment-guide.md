# Deployment Guide

## Local Development

Requirements:

- Node.js matching `packageManager` expectations
- npm

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

