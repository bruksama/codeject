# Brainstorm: Claude Code + Codex Final-Answer Gating

**Date:** 2026-03-19
**Status:** approved

---

## Problem Statement

Current chat UX leaks provider intermediate activity into assistant chat output.

Observed target UX:

- While Claude Code or Codex still shows working/activity signals, keep loading indicator.
- Do not surface provider commentary / preamble / tool-progress text as assistant reply.
- Only show chat assistant message when provider has produced the final answer.

Scope now:

- Claude Code
- Codex

Out of scope now:

- OpenCode
- generic shell programs

## Current Code Reality

Relevant files:

- `packages/server/src/services/session-supervisor.ts`
- `packages/server/src/services/provider-transcript-reader.ts`
- `packages/server/src/services/codex-rollout-parser.ts`
- `packages/server/src/services/claude-transcript-parser.ts`
- `packages/web/src/components/chat/chat-transcript.tsx`
- `packages/web/src/hooks/use-hybrid-session.ts`

Current mismatch:

- `SessionSupervisor` can upsert assistant content before a true final answer exists.
- Codex parser falls back to non-final assistant text if `final_answer` not used yet.
- Claude parser treats latest assistant text as valid, even when it is just pre-tool commentary like `I'll help...` or `Now I'll...`.
- Terminal snapshot fallback still tries to derive assistant content, which is too noisy for strict final-only UX.

## Reality Check From Real Transcripts

Codex:

- rollout entries include assistant `phase`
- `commentary` and `final_answer` are distinguishable
- this is good enough for strict gating

Claude Code:

- transcript contains many assistant text entries before final answer
- those entries are often operational commentary, not user-facing final output
- final assistant text appears with `stop_reason: "end_turn"`
- this is usable, but only if parser becomes stricter

Brutal truth:

- if we adopt strict final-only UX, we lose word-by-word reply streaming for Claude Code and Codex with current tmux + transcript architecture
- chat will move from `loading` directly to full final answer
- this is the right trade for correctness unless we redesign around lower-level provider events

## Evaluated Approaches

### Option 1: UI-only heuristic filtering

- keep backend mostly same
- teach frontend to hide lines like `Working...`, `Esc to interrupt`, `I'll help...`

Pros:

- small surface change
- fast to try

Cons:

- wrong layer
- brittle
- cannot reliably distinguish real final answer vs intermediate commentary
- Claude interim text still leaks

Verdict:

- reject

### Option 2: Provider-aware final-answer gating

- backend parses provider transcript into states: `working` vs `final`
- chat indicator stays while state is `working`
- assistant message only materializes when `final` exists

Pros:

- matches user intent
- accurate for Codex
- accurate enough for Claude Code with `end_turn`
- minimal frontend change
- maintainable

Cons:

- no token-by-token visible answer stream
- provider-specific parser logic

Verdict:

- recommended

### Option 3: Deep adapter integration for live final-stream only

- intercept provider-native events before terminal rendering
- stream only the final-answer channel into chat

Pros:

- best UX ceiling
- can preserve live stream semantics

Cons:

- much larger redesign
- breaks current tmux/transcript simplicity
- not justified now

Verdict:

- not now

## Recommended Solution

Choose **Option 2**.

Core rule:

- For Claude Code and Codex, terminal snapshots remain usable for action detection only.
- Assistant chat content for these providers comes from transcript final-answer detection only.

Provider rules:

### Codex

- ignore assistant `commentary` for chat content
- only accept assistant text from `phase === "final_answer"`
- remove current fallback that promotes non-commentary text into assistant reply during active turn

### Claude Code

- ignore assistant entries that are only tool-use
- ignore assistant text with `stop_reason !== "end_turn"`
- accept assistant text only when `stop_reason === "end_turn"`
- do not use operational commentary like `I'll...`, `Now I'll...` as chat reply

Supervisor rules:

- keep optimistic empty assistant placeholder or loading indicator while waiting
- do not patch assistant content from terminal fallback for Claude/Codex
- when final answer arrives, replace placeholder with full final content and end loading
- if interrupted / error / disconnect before final answer, clear loading state without inventing content

## Implementation Shape

Suggested data contract change:

- evolve transcript reader result from only `content` to something like:
  - `status: 'none' | 'working' | 'final'`
  - `content?: string`
  - `updatedAt?: Date`
  - `provider: 'claude' | 'codex'`

Likely touch points:

- `packages/server/src/services/codex-rollout-parser.ts`
- `packages/server/src/services/claude-transcript-parser.ts`
- `packages/server/src/services/provider-transcript-reader.ts`
- `packages/server/src/services/session-supervisor.ts`

Frontend impact likely small:

- `packages/web/src/components/chat/chat-transcript.tsx`
- `packages/web/src/hooks/use-hybrid-session.ts`

Possible small naming cleanup:

- current `isStreaming` is partly acting as `pending`
- keep current naming if minimizing diff
- rename only if code clarity becomes too poor

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Lose visible streaming of final reply | Medium | Accept as UX trade for correctness now |
| Claude transcript schema shifts | Medium | Keep parser narrow, provider-specific, easy to update |
| Spinner can get stuck if no final answer emitted | Medium | Clear on interrupt, idle, disconnect, error |
| Reconnect/bootstrap may rehydrate stale commentary | Medium | bootstrap sync must use same final-only rule |
| Some rare Codex turns may not emit `final_answer` | Low-Medium | on proven sample, add guarded fallback later, not now |

## Success Metrics

- Codex `commentary` never appears as assistant chat content.
- Claude interim narration like `I'll help...` or `Now I'll...` never appears as final chat reply.
- While provider is still active, chat shows only loading indicator.
- When final answer lands, chat shows exactly one final assistant message.
- Existing action cards for approval/select/input still work.
- Interrupt path clears pending state cleanly.

## Recommendation

Implement strict provider-aware final-answer gating for Claude Code and Codex now.

Do **not** attempt a generic solution first.
Do **not** solve this in the frontend.
Do **not** keep terminal-content fallback for assistant text on these two providers during active turns.

## Resolution

- Yes: losing visible word-by-word answer streaming is acceptable for Claude Code and Codex in exchange for correct final-only UX.
- This decision is now accepted and reflected in the repo docs.

## Next Steps

1. Tighten Codex parser to final-answer only.
2. Tighten Claude parser to `stop_reason === "end_turn"` only.
3. Return transcript state, not just transcript text.
4. Update supervisor so loading state is independent from assistant-content availability.
5. Verify interrupt, reconnect, and action-card flows.

## Unresolved Questions

- none
