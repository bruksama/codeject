# Kiến trúc hệ thống

## Mô hình runtime

Production dùng một process Node.js để chạy Express và WebSocket.

```text
Browser
  -> Express static files
  -> REST API /api/*
  -> WebSocket /ws/:sessionId

Express + WebSocket
  -> session store trong ~/.codeject/sessions
  -> config store trong ~/.codeject/config.json
  -> tmux runtime cho từng session
  -> transcript reader cho Claude/Codex
  -> session supervisor cho hybrid chat-terminal
  -> tunnel manager cho cloudflared
```

Frontend được build thành static export và được backend phục vụ trực tiếp.

## Các thành phần chính

### Frontend

- Next.js 16 App Router
- Zustand store cho local UI state va backend-hydrated state
- màn hình session list, new session, chat, terminal, settings
- WebSocket client có reconnect
- xterm viewport va mobile key strip

### Backend

- Express 5 server
- route modules cho health, auth, sessions, config, tunnel
- auth middleware chỉ bỏ qua auth cho loopback thực
- file-backed store dưới `~/.codeject`
- CLI adapters cho Claude Code, Codex, va generic shell
- transcript parser cho Claude `.jsonl` va Codex rollout `.jsonl`
- `tmux` bridge cho create, send-keys, resize, capture-pane, kill-session
- terminal session manager map app session sang `tmux` target
- session supervisor đồng bộ transcript, pending state, terminal-required signal, và action request
- tunnel manager quản lý một process `cloudflared`
- websocket handler cho chat, surface, terminal, heartbeat

### Shared

- `Session`
- `Message`
- `ChatState`
- `ChatActionRequest`
- `CliProgram`
- `AppSettings`
- `TerminalRuntime`
- `TerminalSnapshot`

## Nguồn sự thật của dữ liệu

- runtime source of truth: `tmux`
- transcript chat: được suy ra để phục vụ UX
- session/config persistence: lưu dưới `~/.codeject`

Điều này có nghĩa là chat UI có thể gọn và thân thiện hơn, nhưng terminal vẫn là đường lui chính xác nhất khi transcript extraction mơ hồ.

## Persistence

- config: `~/.codeject/config.json`
- sessions: `~/.codeject/sessions/*.json`
- terminal scrollback: nam trong `tmux` history
- provider runtime metadata: luu provider, provider session id, transcript path

## Auth

- request local: cho phép không cần bearer key
- request không local: bắt buộc `Authorization: Bearer <key>`
- API key được hash trước khi lưu
- QR remote chỉ chia sẻ public URL

## Remote access

- remote access thông qua `cloudflared`
- backend cung cấp `/api/tunnel` để xem trạng thái, start, stop, restart
- proxy-aware auth kiểm tra IP thực khi đi qua tunnel

## Ranh giới và hạn chế

- host bắt buộc có `tmux`
- remote access bắt buộc có `cloudflared`
- terminal snapshot hiện vẫn cập nhật theo content đầy đủ, chưa diff stream
- action extraction trong chat mới dừng ở mức đơn giản
- terminal vẫn là fallback path cuối cùng
