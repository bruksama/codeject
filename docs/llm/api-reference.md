# HTTP API Reference (LLM)

This document lists the main REST API endpoints exposed by the server. It is intentionally compact for LLM use.

## Health

- `GET /api/health`
  - Purpose: simple health check.

## Auth

- `GET /api/auth`
  - Purpose: read auth configuration and state.
- `POST /api/auth/rotate`
  - Purpose: rotate the bearer key used for non-local requests.

## Sessions

- `GET /api/sessions`
  - Purpose: list all sessions.
- `POST /api/sessions`
  - Purpose: create a new session.
- `GET /api/sessions/:sessionId`
  - Purpose: fetch details for a single session.
- `PATCH /api/sessions/:sessionId`
  - Purpose: update an existing session (e.g. metadata, program).
- `DELETE /api/sessions/:sessionId`
  - Purpose: delete a session.

## CLI programs config

- `GET /api/config/programs`
  - Purpose: list configured CLI programs.
- `POST /api/config/programs`
  - Purpose: add a new CLI program.
- `PUT /api/config/programs/:programId`
  - Purpose: replace an existing CLI program definition.
- `DELETE /api/config/programs/:programId`
  - Purpose: delete a CLI program.

## Tunnel (Cloudflare)

- `GET /api/tunnel`
  - Purpose: read current tunnel status and public URL.
- `POST /api/tunnel/start`
  - Purpose: start the Cloudflare Tunnel process.
- `POST /api/tunnel/stop`
  - Purpose: stop the tunnel.
- `POST /api/tunnel/restart`
  - Purpose: restart the tunnel.

