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
- chat composer có first-token command suggestion theo provider: Claude dùng `/`, Codex dùng `$`
- `AppSettings.fontSize` là UI preference phía frontend, đổi từ `Settings > Appearance`, persist trong browser-local Zustand/localStorage thay vì lưu xuống backend store
- root layout apply `--app-font-size` va `--app-font-scale` lên `documentElement`; script init chạy trước hydration để tránh first-paint flash sai cỡ chữ

### Backend

- Express 5 server
- route modules cho health, auth, sessions, config, tunnel
- auth middleware chỉ bỏ qua auth cho loopback thực
- file-backed store dưới `~/.codeject`
- CLI adapters cho Claude Code, Codex, va generic shell
- transcript parser cho Claude `.jsonl` va Codex rollout `.jsonl`
- command suggestion manifest được checked-in local cho provider hỗ trợ; không scrape command list từ runtime
- `tmux` bridge cho create, send-keys, resize, capture-pane, kill-session
- terminal session manager map app session sang `tmux` target
- session supervisor đồng bộ transcript, pending state, terminal-required signal, va action request theo thứ tự snapshot structured -> snapshot generic prompt -> terminal-required reason-only fallback
- riêng `Claude Code` va `OpenAI Codex`, assistant content chỉ được materialize khi transcript xác nhận final answer; snapshot chỉ còn là nguồn action detection
- tunnel manager quản lý một process `cloudflared`
- tunnel manager support `named-token` auto-start khi config local cho phép
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
- session/config persistence phía backend: lưu dưới `~/.codeject`
- UI preferences như `fontSize` va `accentColor`: lưu cục bộ trong browser storage
- device bearer key cho remote client: cũng lưu cục bộ trong browser storage của từng thiết bị

Điều này có nghĩa là chat UI là bề mặt chính. Khi CLI chờ phản hồi, frontend ưu tiên hiển thị action card dựa trên terminal snapshot thay vì render terminal viewport trực tiếp. Nếu không suy ra được card an toàn, session vẫn bị đánh dấu `terminal-required` và UI chỉ hiện reason banner. Free-input card chỉ xóa draft sau khi gửi thành công va giữ disabled cho tới khi action hiện tại đổi, biến mất, hoặc connection rớt.

Ở composer, autocomplete command chỉ nhìn token đầu tiên. Nó hỗ trợ gõ prefix namespace chưa hoàn chỉnh như `/ck:` hoặc `$ck:`, và khi accept suggestion thì chỉ thay token đầu đó, giữ nguyên trailing prompt text. Provider chưa hỗ trợ tiếp tục dùng composer behavior cũ.

Font size được apply ở mức root CSS variable nên toàn bộ typography app scale cùng nhau. Riêng chat screen còn dùng `--app-font-scale` để tăng/giảm clearance cho transcript và command menu, giúp vùng đọc không bị đè khi đổi cỡ chữ.

Với `Claude Code` va `OpenAI Codex`, chat assistant hiện là final-only:

- transcript state `working` chỉ giữ loading/pending
- transcript state `final` mới patch bubble assistant
- commentary, preamble, va tool-progress không còn đi vào assistant chat content

## Persistence

- config: `~/.codeject/config.json`
- sessions: `~/.codeject/sessions/*.json`
- terminal scrollback: nam trong `tmux` history
- provider runtime metadata: luu provider, provider session id, transcript path
- remote access config: luu mode, named hostname, named token, tunnel status, managed pid, auto-start flag

## Auth

- request local: cho phép không cần bearer key
- REST request không local: bắt buộc `Authorization: Bearer <key>`
- WebSocket không local: dùng `?token=<key>` trên `/ws/:sessionId`
- API key được hash trước khi lưu
- QR remote chỉ chia sẻ public URL

## Remote access

- remote access thông qua `cloudflared`
- hỗ trợ hai mode:
  - `quick`: parse runtime URL `trycloudflare.com`
  - `named-token`: dùng hostname cố định và token lưu trong config local
- backend cung cấp `/api/tunnel` để xem trạng thái, start, stop, restart
- backend cung cấp `PUT /api/tunnel/config` để lưu mode, hostname, và token
- backend cung cấp `PUT /api/tunnel/auto-start` để bật/tắt auto-start cho named tunnel
- proxy-aware auth kiểm tra IP thực khi đi qua tunnel
- quick tunnel luôn manual-only; named tunnel có thể auto-start khi server boot

## Ranh giới và hạn chế

- host bắt buộc có `tmux`
- remote access bắt buộc có `cloudflared`
- terminal snapshot hiện vẫn cập nhật theo content đầy đủ, chưa diff stream
- `Claude Code` va `OpenAI Codex` không còn stream assistant text dần dần lên chat; UX đổi từ loading sang final answer một lần
- action extraction trong chat mới dừng ở mức đơn giản
- web UI không còn raw terminal viewport; prompt text kiểu `Project name:` hay `Paste token:` sẽ rơi về free-input card
- opaque arrow-key hoặc full-screen TUI vẫn chưa map sạch sang chat card
