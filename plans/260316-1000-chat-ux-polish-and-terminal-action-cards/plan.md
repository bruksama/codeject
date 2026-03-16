---
title: "Chat UX Polish And Terminal Action Cards Plan"
description: "Hide partial assistant content behind a cleaner in-progress indicator and support simple confirmation/selection actions inside chat while keeping terminal as the truthful fallback."
status: in_progress
priority: P1
effort: 12h
branch: main
tags: [feature, ux, chat, terminal, websocket, tmux]
created: 2026-03-16
---

# Chat UX Polish And Terminal Action Cards Plan

## Overview

The app now works well enough to polish the UX instead of expanding scope. Two changes matter:

- keep chat visually clean by showing an inline in-progress indicator in the pending assistant row until the assistant answer is complete
- surface simple confirmation and choice prompts in chat so users can respond without dropping into terminal for every trivial decision

This plan keeps the current tmux-backed runtime model intact. It does not try to turn arbitrary TUI state into structured chat UI.

## Core Decisions

- do not stream partial assistant text into the visible transcript
- keep `StreamingIndicator` inline in the pending assistant row from prompt submission until assistant finalize
- only support simple action extraction in v1:
  - yes/no or y/n confirmations
  - numbered single-select options
  - plain-text prompt fallback can come later
- every chat action card must include a direct `Open Terminal` fallback
- terminal remains canonical for ambiguous, full-screen, or complex TUI flows

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Chat Completion UX Contract | Complete | 2h | [phase-01](./phase-01-chat-completion-ux-contract.md) |
| 2 | Backend Action Extraction Contract | Complete | 4h | [phase-02](./phase-02-backend-action-extraction-contract.md) |
| 3 | Frontend Chat Action Rendering | Complete | 4h | [phase-03](./phase-03-frontend-chat-action-rendering.md) |
| 4 | Verification And Documentation | In Progress | 2h | [phase-04](./phase-04-verification-and-documentation.md) |

## Dependencies

- existing hybrid chat-terminal supervisor remains in place
- provider transcript parsing remains the preferred source for clean assistant messages
- terminal-required detection already exists and will be reused
- websocket protocol can be extended without changing the tmux ownership model
- pending-indicator sub-fix delivered in [inline pending assistant plan](../260316-1559-inline-pending-assistant-indicator/plan.md)

## Risks

- overly aggressive action parsing will create wrong buttons and damage trust
- hiding all partial text can make long responses feel stalled if the indicator is weak
- choice extraction from raw terminal snapshots will be inherently heuristic

## Non-Goals

- no full semantic parser for arbitrary ANSI or ncurses screens
- no attempt to support every CLI interaction inside chat
- no replacement of terminal for approvals that depend on live cursor state or redraw-heavy menus
- no provider-specific SDK integration just for structured tool confirmations

## Success Criteria

- user sees a clean assistant progress state instead of partial transcript churn
- completed assistant answer appears once, in final form
- obvious confirmation and simple selection prompts can be answered from chat
- chat action cards degrade safely to `Open Terminal` when parsing confidence is low
- reconnect still preserves runtime continuity and does not break current terminal fallback

## Context Links

- Prior hybrid runtime plan: [hybrid supervisor](../260316-0237-hybrid-chat-terminal-supervisor/plan.md)
- Architecture doc: [system architecture](../../docs/system-architecture.md)
- Roadmap doc: [project roadmap](../../docs/project-roadmap.md)
