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
- màn hình session list, new session, chat, settings hub, settings detail routes
- WebSocket client có reconnect
- chat screen có connection banner theo cycle reconnect/disconnect, auto-hide khi recover, va toast retry khi reconnect fail nhiều lần
- action card inline cho confirm, select, va free-input
- chat composer có first-token command suggestion theo provider: Claude dùng `/`, Codex dùng `$`
- session view có hai tab `Chat` va `Terminal`; terminal tab render tmux snapshot read-only, input bar, va virtual keyboard cho các key đặc biệt
- nếu server báo `terminal-required` mà không có action card an toàn, chat header sẽ hiện badge trên tab `Terminal` để user chuyển sang direct interaction
- session list, new session, va CLI program editor đã tách render tree lớn thành local components để page-level state rõ hơn va file nhỏ hơn
- `AppSettings.fontSize` là UI preference phía frontend, đổi từ `Settings > Appearance`, persist trong browser-local Zustand/localStorage thay vì lưu xuống backend store
- `AppSettings.notifications` là UI preference opt-in phía frontend; browser permission được sync lại khi app focus/visible để xóa stale toggle nếu user revoke quyền ngoài app
- root layout apply `--app-font-size` va `--app-font-scale` lên `documentElement`; script init chạy trước hydration để tránh first-paint flash sai cỡ chữ
- shared web shell có skip-link, visible focus states, 44x44 touch-target baseline, va reduced-motion fallback
- settings được chia thành `/settings`, `/settings/appearance`, `/settings/remote-access`, va `/settings/about`
- `qrcode` chỉ load khi remote-access QR modal thực sự mở; browser API key reads được cache va invalidate theo `storage`/`visibilitychange`
- WebSocket URL được resolve lười ở mỗi lần connect/reconnect, nên query token luôn lấy bearer key mới nhất đang lưu trong browser
- shared modal hook cho confirm/QR dialog focus action đầu tiên khi mở, hỗ trợ `Escape`, va restore focus về control trước đó khi đóng
- web client validate incoming server frame bằng shared Zod schema; nếu JSON hợp lệ nhưng sai schema, client coi như transport failure và đóng/reconnect socket thay vì giữ state hỏng
- chat session view có thể phát browser notification khi tab không focus: action-needed, reply-ready, terminal-error, va session-finished
- notification trigger không chỉ đến từ live update; pending action có thể được surface lại từ `chat:bootstrap`, còn settled reply có thể đến từ `chat:update` final chứ không chỉ `chat:message`
- page shell phía web giờ dùng viewport-locked layout (`h-dvh` + inner scroller) để header không biến mất khi nội dung dài; riêng chat chỉ cho transcript scroll, còn header và composer giữ cố định

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
- websocket handler broadcast thêm `terminal:snapshot` frame sau mỗi lần capture tmux pane để frontend sync terminal tab
- websocket handler validate incoming client frames bằng shared Zod schema; dev mode cũng assert outgoing server frames trước khi gửi
- invalid client frame bị reject sớm bằng `safeParse`, trả `terminal:error`, va không được chạy tiếp vào chat prompt / terminal input path
- `terminal:key` hiện nhận thêm `Tab`, arrows, backspace, delete, va các Ctrl combos (`C-c`, `C-d`, `C-z`, `C-l`) theo tmux key naming

### Testing và verification

- root workspace chạy `npm test` qua Turbo
- server test dùng `node:test`
- web test dùng Vitest + jsdom + React Testing Library
- web coverage hiện tập trung vào app store persistence, WebSocket reconnect client, command suggestion logic, action-card submit lifecycle, va terminal tab behavior
- web test hiện thêm notification hook behavior; server test hiện cover malformed websocket frame rejection path va `terminal:snapshot` forwarding
- server integration test mới chỉ chứng minh malformed client input bị chặn sớm; chưa phải full e2e protocol-version-drift coverage

### Shared

- `Session`
- `Message`
- `ChatState`
- `ChatActionRequest`
- `CliProgram`
- `AppSettings`
- `TerminalRuntime`
- `TerminalSnapshot`
- shared Zod schemas cho WebSocket wire protocol (`ClientWebSocketMessage`, `ServerWebSocketMessage`, va nested chat/runtime payloads)

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
- UI preference `notifications`: cũng lưu cục bộ trong browser storage, không xuống backend config
- device bearer key cho remote client: cũng lưu cục bộ trong browser storage của từng thiết bị

Điều này có nghĩa là chat UI vẫn là bề mặt chính. Khi suy ra được action card an toàn, frontend ưu tiên card trước. Khi CLI cần arrow-key nav hoặc direct input khó recover, user có thể chuyển sang tab `Terminal`, nơi tmux snapshot được sync qua `terminal:snapshot` cùng input bar va virtual keyboard. Nếu không suy ra được card an toàn, session vẫn bị đánh dấu `terminal-required` để bật warning/banner/badge kéo user sang tab này. Free-input card chỉ xóa draft sau khi gửi thành công va giữ disabled cho tới khi action hiện tại đổi, biến mất, hoặc connection rớt.

Nếu WebSocket đã từng connected rồi mới rớt, chat screen chuyển sang reconnect feedback thay vì chỉ đứng im: banner đổi theo state `reconnecting`/`disconnected`, sau 5 giây sẽ hiện elapsed disconnect time, và sau 3 lần reconnect fail frontend đẩy thêm toast có action `Reconnect now`.

Ở composer, autocomplete command chỉ nhìn token đầu tiên. Nó hỗ trợ gõ prefix namespace chưa hoàn chỉnh như `/ck:` hoặc `$ck:`, và khi accept suggestion thì chỉ thay token đầu đó, giữ nguyên trailing prompt text. Provider chưa hỗ trợ tiếp tục dùng composer behavior cũ.

Font size được apply ở mức root CSS variable nên toàn bộ typography app scale cùng nhau. Các shell clearance như bottom nav va command menu cũng derive từ cùng scale đó, để fixed header/action/composer trên mobile không bị lệch khi đổi cỡ chữ.

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
- remote browser lưu bearer key riêng theo từng thiết bị; `Reset Local Settings` trên browser đó cũng xóa key đã lưu
- nếu remote access status trả `401`, client xóa bearer key local và reset tunnel metadata đang cache để không giữ stale remote-access state

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
- terminal tab chưa phải raw emulator đầy đủ; prompt text kiểu `Project name:` hay `Paste token:` vẫn ưu tiên rơi về free-input card nếu recover được
- opaque arrow-key hoặc full-screen TUI vẫn chưa map sạch sang chat card
