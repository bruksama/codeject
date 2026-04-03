# Changelog

## 2026-04-03 — Global Hook Installer and Stop-Signal Integration

### Added
- Added a new monorepo admin CLI exposed as `codeject` with `install`, `uninstall`, `status`, and `repair`.
- Added Codeject-managed global stop-hook integration for `Claude Code` and `OpenAI Codex`.
- Added per-session hook token env injection plus an internal `/api/internal/provider-stop` route to accelerate transcript settlement.
- Added CLI and server tests for hook config merge/removal and authenticated provider stop-signal handling.

### Changed
- Changed Codex and Claude runtime launch paths to inject Codeject hook env only for Codeject-managed sessions.
- Updated README, architecture, configuration, and usage docs in Vietnamese and English for hook install/uninstall flow and `~/.codeject` cleanup behavior.

## 2026-03-28 — Dev Runtime Supervisor

### Added
- Added a root dev supervisor that starts the web and server workspaces without Turbo for local development shutdown control.

### Changed
- Changed root `npm run dev` to use the supervisor so `Ctrl+C` triggers `safe-stop` cleanup and exits cleanly.
- Tightened `safe-stop` targeting with optional excluded process groups so supervisor-driven shutdown does not self-interrupt the launcher.
- Updated README and run/usage docs (VN/EN) to document `Ctrl+C` as the primary dev stop flow and `npm run safe-stop` as fallback cleanup.

## 2026-03-28 — Safe Stop Runtime

### Added
- Added root command `npm run safe-stop` to stop repository npm runtimes with signal escalation (`SIGINT` → `SIGTERM` → `SIGKILL`) and release checks for `3500`/`4028`.
- Added tmux cleanup in safe-stop for `codeject-*` sessions to avoid stale terminal runtime state.

### Changed
- Updated quick-start and usage docs (VN/EN) with explicit safe-stop guidance for terminal runtime shutdown.

## 2026-03-24 — Terminal Tab

### Added
- Added a `Terminal` tab beside `Chat` in session view using a lightweight read-only `<pre>` snapshot approach.
- Added `terminal:snapshot` WebSocket frame to sync tmux pane output to the web client in near real time.
- Added a terminal interaction badge so users can switch to `Terminal` when safe chat action cards are unavailable.
- Added input bar and virtual keyboard keys for Enter, Tab, Esc, arrows, Ctrl+C, Ctrl+D, Ctrl+Z, Ctrl+L, backspace, and delete.
- Added web and server test coverage for terminal snapshot flow, key pass-through, and terminal component behavior.

### Changed
- Changed mobile shell behavior to keep header fixed while long content scrolls in an inner viewport-locked layout.
- Changed chat behavior to keep header and composer fixed while only transcript content scrolls.
- Tightened shared header and action sizing to prevent icon collapse and bubble overflow on narrow devices.

## 2026-03-23 — Cleanup/Test Infrastructure and Wire/Notify Hardening

### Added
- Added root `npm test` execution through Turbo with Vitest + jsdom in web and `node:test` in server.
- Added web test coverage for Zustand persistence, WebSocket reconnect, command suggestions, action-card lifecycle, and notifications.
- Added server test coverage for malformed WebSocket frame rejection before command execution.
- Added shared runtime Zod schemas for WebSocket wire protocol across web/server boundaries.
- Added browser notification events for action-needed, reply-ready, terminal-error, and session-finished when tab is unfocused.

### Changed
- Changed client handling of schema-invalid server frames to transport-failure reconnect instead of silent drops.
- Changed chat UI to include reconnect/disconnect banner lifecycle with elapsed timer and retry toast action.
- Changed session list status rendering from long badges to compact connection dots for faster scanning.

### Removed
- Removed `@dhiwise/component-tagger`, `recharts`, and `@netlify/plugin-nextjs` after confirming no runtime usage.

## 2026-03-22 — Settings, Remote Access, and Web UX Reoptimization

### Added
- Added `Settings > Appearance > Font Size` with `small`, `medium`, and `large` options.
- Added named tunnel `Auto-start` support in remote access settings.
- Added `Device Auth` flow for remote browsers to store bearer key per device.
- Added shared accessibility guardrails including visible focus states, skip-link, reduced-motion fallback, and 44x44 touch target baseline.

### Changed
- Changed font size preferences to frontend-only browser persistence via Zustand/localStorage rather than backend config.
- Changed root layout to apply font-size CSS variables before hydration to avoid first-paint size flash.
- Changed settings IA to a compact hub with separate routes for `Appearance`, `Remote Access`, and `About`.
- Changed route subscriptions and key reads to be narrower/cached with proper invalidation for improved UI efficiency.
- Changed reconnect token resolution to read latest browser key on each connect/reconnect attempt.
- Changed modal behavior to improve accessibility with initial focus, Escape-to-close, and focus restoration.

## 2026-03-21 — Command Suggestion UX

### Added
- Added stable ClaudeKit command suggestions for `Claude Code` sessions when first token starts with `/`.
- Added matching command suggestion behavior for `OpenAI Codex` sessions when first token starts with `$`.
- Added local checked-in command manifest usage instead of runtime output scraping.

### Changed
- Changed composer suggestion logic to support partial namespace typing and replace only the first token on accept.
- Kept unsupported providers on prior composer behavior.

## 2026-03-19 — Chat Surface Cleanup

### Added
- Added free-input action card recovery for generic prompts such as `Project name:` and `Paste token:`.
- Added safer free-input draft handling so failed submit does not clear draft content.
- Added final-only transcript gating for `Claude Code` and `OpenAI Codex` to prevent commentary/tool-progress leaking into assistant bubbles.

### Changed
- Changed WebSocket protocol usage on web side to a reduced event set focused on chat/surface/runtime essentials.
- Changed action card model to prioritize confirm, single-select, and free-input for web-first interaction.

### Removed
- Removed terminal viewport, key strip, and hybrid surface toggle from frontend.
- Removed `@xterm/xterm` and `@xterm/addon-fit` from the web package.

## 2026-03-17 — Runtime and Mobile Hardening

### Added
- Added stronger backend session deletion behavior to terminate tmux runtime with persisted metadata and fallback handling.
- Added clearer nav affordances, jump-to-latest visibility, and delete-action contrast improvements.
- Added true accent color token wiring across UI and local brand assets for bundled program icons.
- Added browser-level mobile viewport verification and fixed active-nav trailing-slash regression.

### Changed
- Changed session header structure to a more compact mobile-first layout with truncated tmux chip and tighter transcript spacing.
- Changed settings by removing obsolete toggles for `Streaming Responses` and `Haptic Feedback`.
- Changed default bundled programs to `Claude Code`, `OpenAI Codex`, and `OpenCode`.
- Changed remote access UI to focus on tunnel controls, public URL/QR, and device auth key flow.
