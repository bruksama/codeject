# Phase 4: Verification And Documentation

## Overview

- Priority: P1
- Status: In Progress
- Verify UX behavior with real terminal sessions and document the new hybrid behavior boundary.

## Key Insights

- this work is UX-sensitive and needs browser validation, not just type-checking
- regressions are likely around reconnect, stale action cards, and terminal-required fallback

## Requirements

- verify chat does not display partial assistant text during generation
- verify new prompt does not hydrate the pending assistant row with the previous settled answer
- verify final response appears after assistant completion
- verify confirm and single-select actions submit the intended terminal input
- verify stale or ambiguous prompts still fall back to terminal
- update docs if behavior boundaries or architecture changed

## Architecture

- verification must cover both provider transcript path and tmux fallback path
- browser testing should exercise both chat and terminal surfaces

## Related Code Files

- Verify: `packages/server`
- Verify: `packages/web`
- Update: `docs/project-roadmap.md`
- Update: `docs/system-architecture.md`

## Implementation Steps

1. Type-check and build both web and server workspaces.
2. Test chat waiting state with a long-running response.
   Confirm inline dots remain under the new prompt and stale previous answers are not copied into the pending row.
3. Test a simple confirmation prompt.
4. Test a simple numbered selection prompt.
5. Test reconnect with a stale or completed action request.
6. Update docs only if the delivered contract changed architecture or product boundaries.

## Todo List

- [x] Build and type-check
- [x] Browser-test waiting-state UX
- [ ] Browser-test confirm flow
- [ ] Browser-test single-select flow
- [ ] Verify terminal fallback for ambiguous prompts
- [x] Sync docs if needed

## Success Criteria

- polished chat UX without partial-text churn
- no stale previous assistant answer is copied into the pending assistant row for the next turn
- trivial confirmations and selections work from chat
- no regression in terminal fallback behavior

## Risk Assessment

- test fixtures for real CLI prompts may be awkward to reproduce consistently

## Security Considerations

- verify that action cards never bypass the existing terminal/runtime permission model

## Next Steps

- remaining work: browser-test confirm flow, single-select flow, and ambiguous terminal fallback
