# Project Overview PDR

## Product

Codeject is a phone-friendly interface for controlling local CLI coding assistants through one backend server. The user can create sessions, connect them to CLI programs, switch between chat-first and terminal views, and eventually expose the app remotely through a tunnel.

## Problem

Local coding CLIs are powerful but awkward to monitor or drive from a phone. The project solves that by putting a thin mobile UI over a local backend that manages sessions and terminal processes.

## Users

- solo developer running local coding agents
- developer monitoring or nudging long-running CLI sessions from a phone
- user wanting one local UI for multiple CLIs such as Claude Code, Codex, and Aider

## Product Requirements

- mobile-first UI
- single local backend port
- session persistence across reloads
- support multiple CLI program definitions
- real-time output streaming
- low-friction remote access path

## Technical Requirements

- static frontend export served by backend
- authenticated non-local API and WS access
- disk-backed session/config persistence
- tmux-backed persistent runtime lifecycle
- shared type definitions between frontend and backend

## Current Delivery State

- phase 1 complete
- phase 2 complete
- phase 3 complete
- phase 4 complete
- backend manages persistent tmux runtimes for Claude Code, Codex, and generic CLIs
- frontend uses real backend sessions, config APIs, and hybrid WebSocket flows
- chat bootstrap can derive cleaner assistant messages from provider transcripts instead of showing raw TUI output when a transcript is available

## Non-Goals For Current State

- multi-user auth model
- cloud-hosted SaaS deployment
- SSR-heavy frontend behavior
- remote tunnel flow before phase 5
