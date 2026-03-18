# Brainstorm: Drop Terminal UI, Chat-Only Action Cards

**Date:** 2026-03-18
**Status:** agreed

---

## Problem Statement

The terminal UI (xterm.js viewport, key strip, hybrid surface toggle) cannot stream and render CLI TUI output reliably in a mobile web browser. Interactive CLI prompts (approvals, selections, text input) are the only reason the terminal surface exists. The goal is to remove the terminal rendering surface entirely and handle all CLI interactions through structured action cards in the chat UI.

## Requirements

- Remove xterm.js terminal viewport and all terminal rendering from the frontend.
- Keep tmux as the server-side process manager and runtime source of truth.
- Detect when CLIs ask questions (y/n, numbered select, free-text) and surface them as chat action cards.
- Support three target CLIs: Claude Code, Codex, OpenCode.
- Provide a Tier 3 fallback (raw text input forwarding) for unrecognized prompts.

## Evaluated Approaches

### Option 1: Chat-only with enhanced action extraction (snapshot-based)

- Server polls tmux snapshots. Regex extracts structured prompts. Unrecognized prompts become Tier 3.
- **Pros:** simple, removes all terminal rendering code, already partially built.
- **Cons:** regex on terminal output is fragile; arrow-key TUI menus can't be fully mapped.

### Option 2: Transcript-first for Claude/Codex, snapshot fallback for OpenCode

- Prefer provider transcript parsing (`.jsonl`) for structured question extraction. Fall back to snapshot regex for providers without transcripts.
- **Pros:** higher accuracy for Claude/Codex approvals. Less reliance on terminal text formatting.
- **Cons:** OpenCode/generic still needs snapshot parsing. Two extraction paths.

### Option 3: Event-driven "stream only questions"

- Instead of streaming terminal output, emit UI updates only when a new action request is detected.
- Effectively Option 1 with better event timing. Not a fundamentally different approach.

## Chosen Solution

**Option 1 + Option 2 combined.** Transcript-first for Claude/Codex, snapshot-based for OpenCode/generic. Three-tier action card system in chat.

## Action Card Type Hierarchy

| Kind | Trigger | UI | Submit |
|---|---|---|---|
| `confirm` | y/n pattern | Yes/No buttons | Send `y`/`n` + Enter |
| `single-select` | Numbered list + select/choose keyword | Option buttons | Send number + Enter |
| `free-input` | `terminal-required` but no pattern match | Monospace context + text field | Send typed text + Enter |

## Tier 3 "free-input" Contract

### Type definition

```typescript
| {
    id: string;
    kind: 'free-input';
    context: string;       // last 5-8 lines of snapshot (read-only)
    prompt: string;        // generic: "CLI is waiting for input"
    source: 'terminal';
  }
```

### Emission rule

Supervisor decision tree:
1. Snapshot detected as `terminal-required`?
2. Try `extractActionRequest` from transcript content -> structured card if found.
3. Try `extractActionRequest` from snapshot content -> structured card if found.
4. Neither found -> emit `free-input` card.

### Deduplication

`id = sha1('free-input:' + last5Lines).slice(0, 12)`. Same ID across polls = skip re-emit.

### Lifecycle

- One `actionRequest` at a time (enforced by `chatState.actionRequest` being singular).
- Submit disables the card (`isSubmitting`).
- Next snapshot clears `terminal-required` -> card disappears.
- `chat:prompt` clears `actionRequest`.

### Safety

- No double-submit: `isSubmitting` disables card.
- No stale sends: card only visible when `terminal-required` active.
- No stacking: `surface:update` replaces entire `chatState`.

## Code Removal

### Files to delete

- `packages/web/src/components/terminal/terminal-viewport.tsx`
- `packages/web/src/components/terminal/terminal-key-strip.tsx`
- `packages/web/src/components/terminal/terminal-input-bar.tsx`
- `packages/web/src/components/chat/hybrid-surface-toggle.tsx`

### Types to simplify

- `SurfaceMode` -- remove or hardcode to `chat`.
- Remove from `ClientWebSocketMessage`: `terminal:init`, `terminal:claim-control`, `terminal:input` (keep only for action submission path), `terminal:key` (keep only for action submission path), `terminal:resize`.
- Remove from `ServerWebSocketMessage`: `terminal:output`, `terminal:reset`, `terminal:snapshot`, `terminal:update`, `terminal:control-state`.
- Keep: `terminal:ready`, `terminal:status` (tmux lifecycle tracking).

### Dependencies to remove

- `@xterm/xterm`
- `@xterm/addon-fit`

### What stays

- tmux bridge (process management)
- Terminal session manager (session-to-tmux mapping)
- Snapshot capture (for action extraction only, not rendering)
- Session supervisor (action detection + chat state)
- `ChatActionCard` component (expanded with `free-input` kind)
- `submitActionInput` path (send answer to tmux)
- Provider transcript readers (Claude/Codex)

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Arrow-key TUI menus can't be mapped to click-based cards | Medium | Try extract; fall back to Tier 3. Claude/Codex rarely use TUI menus for approvals. |
| Snapshot polling frequency vs user reaction time | Low | Current 1200ms idle timer is reasonable. |
| Regex extraction misidentifies output as a prompt | Low | Existing `TERMINAL_REQUIRED_PATTERNS` are conservative. |
| Provider transcript format changes | Low | Transcript parsers already exist and are provider-specific. |

## Success Metrics

- All y/n approvals from Claude Code, Codex, OpenCode render as `confirm` cards and submit correctly.
- Numbered selection prompts render as `single-select` cards.
- Unrecognized prompts render as `free-input` cards; user-typed text reaches the CLI.
- Zero xterm.js code in the frontend bundle.
- No regression in prompt delivery latency.

## Next Steps

1. Expand `ChatActionRequest` type with `free-input` kind.
2. Update `action-request-extractor` to emit `free-input` when no structured pattern found but terminal-required is active.
3. Update `ChatActionCard` UI with text input branch for `free-input`.
4. Remove terminal rendering components, types, events, and dependencies.
5. Simplify `use-hybrid-session` to remove terminal viewport wiring.
6. Update docs: `system-architecture.md`, `project-roadmap.md`, `README.md`.
