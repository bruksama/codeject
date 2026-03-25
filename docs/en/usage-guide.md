# Usage Guide

Codeject is optimized for fast mobile control: read transcript, answer action cards, and switch to the Terminal tab only when direct interaction is required.

## Create and use a session

1. Open Codeject and go to the new session screen.
2. Pick a CLI program (`Claude Code`, `OpenAI Codex`, or a custom program).
3. Set a short descriptive name and save.
4. Open that session in chat view.
5. Send a first prompt to confirm runtime is ready.

> **Note:** Sessions are stored on the host and can be reopened after reload.

## Send prompts and handle action cards

1. Type a prompt in composer and submit.
2. When the CLI asks for confirm/select/text input, an action card appears in transcript.
3. Answer directly in the card.
4. If submit fails, check connection state and retry.
5. Wait for the final answer in the same transcript.

> **Warning:** If the UI reports terminal-required, the current interaction cannot be completed safely via action card.

## Manage multiple sessions

1. Create separate sessions per task (for example: refactor, debug, docs).
2. Use the session list to switch quickly.
3. Keep session names short and purpose-based for mobile scanning.
4. Close or delete inactive sessions to reduce noise.

## Background monitoring with notifications

1. Open `Settings > Appearance > Notifications`.
2. Enable notifications for the current browser.
3. Leave the tab; Codeject can notify on approval-needed, reply-ready, runtime error, or idle.
4. Tap a notification to jump back to the related session.

Full notification setup is in `docs/en/configuration.md`.

## Remote access from phone

1. Enable tunnel in `Settings > Remote Access` (quick or named).
2. Open the public URL on the remote device.
3. Save bearer key in `Device Auth` on that device.
4. Use the same interface as local: session list, chat, and action cards.

Full setup is in `docs/en/deployment.md`.

## Use the Terminal tab

1. Switch to `Terminal` when chat reports direct interaction required.
2. Read the tmux snapshot for current context.
3. Use input bar or virtual keys for Enter/Tab/Esc/arrows/Ctrl combos.
4. Return to `Chat` after the blocking interaction is done.

Current limitation: Terminal tab is not a full terminal emulator; some full-screen TUIs still need host-side interaction.
