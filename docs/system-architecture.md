# Kiến trúc hệ thống

Tài liệu này mô tả **các khối chính** trong Codeject và cách chúng nói chuyện với nhau. Mục tiêu là giúp bạn sửa code hoặc debug mà không cần đọc toàn bộ codebase.

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
  -> session supervisor cho chat transcript + action cards
  -> tunnel manager cho cloudflared
```

Frontend được build thành static export và được backend phục vụ trực tiếp.

## Các thành phần chính

### Frontend

- Next.js 16 App Router
- Zustand store cho local UI state va backend-hydrated state
- màn hình session list, new session, chat, settings
- WebSocket client có reconnect
- action card inline cho confirm, select, va free-input

### Backend

- Express 5 server
- route modules cho health, auth, sessions, config, tunnel
- auth middleware chỉ bỏ qua auth cho loopback thực
- file-backed store dưới `~/.codeject`
- CLI adapters cho Claude Code, Codex, va generic shell
- transcript parser cho Claude `.jsonl` va Codex rollout `.jsonl`
- `tmux` bridge cho create, send-keys, resize, capture-pane, kill-session
- terminal session manager map app session sang `tmux` target
- session supervisor đồng bộ transcript, pending state, terminal-required signal, va action request theo thứ tự transcript structured -> snapshot structured -> snapshot generic prompt
- tunnel manager quản lý một process `cloudflared`
- websocket handler cho chat, action submission, runtime status, va heartbeat

### Shared

- `Session`
- `Message`
- `ChatState`
- `ChatActionRequest`
- `CliProgram`
- `AppSettings`
- `TerminalRuntime`
- `TerminalSnapshot`

### Bundled CLI defaults

- `Claude Code`
- `OpenAI Codex`
- `OpenCode`

Known bundled programs dùng local static assets trong web app. Custom programs vẫn giữ string icon compatibility để fallback về emoji/text nếu cần.

## Nguồn sự thật của dữ liệu

- runtime source of truth: `tmux`
- transcript chat: được suy ra để phục vụ UX
- session/config persistence: lưu dưới `~/.codeject`

Điều này có nghĩa là chat UI là bề mặt chính. Khi CLI chờ phản hồi, frontend hiển thị action card dựa trên transcript hoặc terminal snapshot thay vì render terminal viewport trực tiếp. Free-input card chỉ xóa draft sau khi gửi thành công va giữ disabled cho tới khi action hiện tại đổi, biến mất, hoặc connection rớt.

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
- hỗ trợ hai mode:
  - `quick`: parse runtime URL `trycloudflare.com`
  - `named-token`: dùng hostname cố định và token lưu trong config local
- backend cung cấp `/api/tunnel` để xem trạng thái, start, stop, restart
- backend cung cấp `PUT /api/tunnel/config` để lưu mode, hostname, và token
- proxy-aware auth kiểm tra IP thực khi đi qua tunnel

## Ranh giới và hạn chế

- host bắt buộc có `tmux`
- remote access bắt buộc có `cloudflared`
- terminal snapshot hiện vẫn cập nhật theo content đầy đủ, chưa diff stream
- action extraction trong chat mới dừng ở mức đơn giản
- web UI không còn raw terminal viewport; prompt text kiểu `Project name:` hay `Paste token:` sẽ rơi về free-input card
- opaque arrow-key hoặc full-screen TUI vẫn chưa map sạch sang chat card
