# Project Overview PDR

## Product

Codeject is a phone-friendly interface for controlling local CLI coding assistants through one backend server. The user can create sessions, connect them to CLI programs, stream output, and eventually expose the app remotely through a tunnel.

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
- PTY-backed process lifecycle in later phases
- shared type definitions between frontend and backend

## Current Delivery State

- phase 1 complete
- phase 2 complete
- backend core exists, but CLI PTY bridge is not yet implemented
- frontend still uses mock-state flows for most interactions

## Non-Goals For Current State

- multi-user auth model
- cloud-hosted SaaS deployment
- SSR-heavy frontend behavior
- terminal emulation in phase 2

