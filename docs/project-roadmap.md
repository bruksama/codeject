# Lộ trình dự án

Tài liệu này tóm tắt các phase phát triển chính của Codeject và những việc còn lại. Dùng để nắm nhanh bối cảnh dự án, không phải kế hoạch chi tiết.

## Trạng thái tổng thể

Ứng dụng đã sẵn sàng để sử dụng.

Tất cả các phase xây dựng chính đã hoàn thành:

- Phase 1: monorepo và frontend import
- Phase 2: backend core, auth, persistence, WebSocket
- Phase 3: `tmux` terminal bridge
- Phase 4: chat-first action card experience
- Phase 5: remote tunnel và remote auth flow

## Đã giao

### Nền tảng

- npm workspace monorepo
- package `web`, `server`, `shared`
- root scripts cho `dev`, `build`, `lint`, `type-check`, `test`, `start`

### Backend

- route cho health, auth, sessions, config, tunnel
- bearer auth cho request không local
- lưu config và session xuống đĩa
- `tmux` runtime management bền vững qua reconnect
- tunnel manager cho `cloudflared`

### Frontend

- session list, new session, settings, CLI program editor
- chat-first session view va inline action cards
- compact chat composer và transcript scroll behavior tốt hơn

### Transcript và supervisor

- ưu tiên transcript của Claude/Codex nếu có
- fallback về terminal snapshot khi cần
- pending assistant indicator inline
- confirm, numbered single-select, va free-input action cards
- Codex transcript refresh an toàn hơn khi file rollout thay đổi

## Giai đoạn tiếp theo

Không còn phase tính năng lớn đang mở. Ưu tiên hiện tại:

- dọn dẹp code
- giảm kích thước các file giao diện lớn
- cập nhật và đơn giản hóa tài liệu
- hardening thêm cho browser/device thực tế nếu cần

## Hardening cập nhật 2026-03-17

- session delete backend đã kill `tmux` theo runtime, persisted metadata, và canonical fallback name
- mobile chat header gọn hơn, chip `tmux` ngắn hơn, và transcript bottom gap giảm
- active nav, jump-to-latest, và session delete affordance có contrast rõ hơn
- settings đã bỏ `Streaming Responses` và `Haptic Feedback`
- default bundled programs hiện là `Claude Code`, `OpenAI Codex`, `OpenCode`
- remote access block đã rút gọn quanh tunnel, public URL, QR, và device auth key
- accent color đã wire vào token UI thật; default program icons dùng local bundled brand assets
- browser-level verification đã chạy lại trên mobile viewport; một regression ở active nav với trailing slash đã được sửa

## Cleanup cập nhật 2026-03-19

- terminal viewport, key strip, va hybrid surface toggle đã được gỡ khỏi frontend
- websocket protocol phía web đã rút về `chat:bootstrap`, `chat:message`, `chat:update`, `surface:update`, `terminal:ready`, prompt/input/key, runtime status, va errors
- action card hiện hỗ trợ confirm, single-select, va free-input để thay terminal fallback trong web UI
- generic prompt text như `Project name:` va `Paste token:` đã được recover lại thành free-input card
- free-input draft không còn bị xóa khi submit fail; card chỉ re-enable theo state websocket thật thay vì timer
- `@xterm/xterm` va `@xterm/addon-fit` đã được gỡ khỏi web package
- `Claude Code` va `OpenAI Codex` hiện dùng final-only transcript gating: loading giữ nguyên tới khi transcript chứng minh final answer, commentary/tool-progress không còn leak vào bubble assistant

## Docs/UX cập nhật 2026-03-21

- session `Claude Code` hiện gợi ý stable ClaudeKit commands khi token đầu tiên bắt đầu bằng `/`
- session `OpenAI Codex` hiện gợi ý cùng manifest command đó khi token đầu tiên bắt đầu bằng `$`
- autocomplete dùng checked-in manifest local thay vì scrape runtime output
- composer cho phép gõ namespace dở dang va khi accept suggestion chỉ thay token đầu, giữ nguyên phần prompt còn lại
- provider chưa hỗ trợ vẫn giữ hành vi composer cũ

## Docs/UX cập nhật 2026-03-22

- `Settings > Appearance > Font Size` đã ship với 3 mức `small`, `medium`, `large`
- font size là preference frontend-only trong `AppSettings`, lưu theo từng browser qua Zustand/localStorage thay vì backend `~/.codeject`
- root layout apply CSS vars trước hydration để tránh first-paint flash sai cỡ chữ
- scale ảnh hưởng toàn app UI typography, gồm cả transcript/composer clearance để chat surface giữ readability khi đổi cỡ chữ
- remote access named tunnel hiện có `Auto-start`; quick tunnel vẫn chỉ start thủ công
- thiết bị remote có luồng `Device Auth` riêng để lưu bearer key trong browser sau khi mở public URL hoặc QR

## Web UX Reoptimization cập nhật 2026-03-22

- browser zoom đã được bật lại; shared focus ring, skip-link, reduced-motion fallback, và touch target 44x44 được áp ở web shell
- sessions list, chat, new session, và CLI program editor dùng header/action pattern đồng nhất hơn, contrast metadata rõ hơn, và inline error/recovery state ổn hơn
- `Settings` đã tách thành hub ngắn với route con `Appearance`, `Remote Access`, và `About`
- QR code remote access chỉ load khi mở detail flow tương ứng; `qrcode` không còn nằm trên đường tải ban đầu của settings hub
- route-level Zustand subscriptions giờ dùng selector hẹp hơn; API key trong browser được cache với invalidation theo storage/visibility; repeated cards/messages dùng `content-visibility` an toàn hơn
- `Reset Local Settings` giờ xóa luôn bearer key lưu riêng trong browser; nếu remote auth bị `401` thì client cũng flush key cache và tunnel snapshot cũ để tránh giữ trạng thái stale
- reconnect WebSocket resolve lại URL theo bearer key mới nhất đang có trong browser storage, nên rotate key rồi reconnect không dùng query token cũ
- settings confirm modal và QR modal đã được harden cho accessibility: focus vào action đầu tiên, `Escape` để đóng, và trả focus về control trước đó

## Cleanup/Test Infra cập nhật 2026-03-23

- web package đã gỡ `@dhiwise/component-tagger`, `recharts`, va `@netlify/plugin-nextjs` sau khi xác nhận không còn import/runtime usage
- root workspace có `npm test` qua Turbo; web package có Vitest + jsdom setup riêng để test frontend logic
- web test suite hiện cover Zustand app store, WebSocket client reconnect path, provider-aware command suggestions, va action-card submit lifecycle
- các page `sessions-list`, `new-session-setup`, va `cli-program-editor` đã tách bớt render tree sang local components để giảm kích thước file va giữ page-level state rõ hơn
- chat screen có connection banner dismissible, elapsed disconnect timer sau 5 giây, reconnect success auto-dismiss, va toast retry có action `Reconnect now`
- session list card dùng connection status dot gọn hơn thay cho badge dài để scan nhanh trên màn hình nhỏ

## Wire/Notify cập nhật 2026-03-23

- shared package hiện có Zod runtime schemas cho WebSocket wire protocol; server validate client frames, web validate server frames, va server dev mode assert outgoing frames
- phía web, server frame sai schema giờ đi vào transport-failure path để đóng/reconnect socket thay vì bị drop âm thầm
- `Settings > Appearance > Notifications` đã ship như opt-in browser preference lưu theo từng browser; stale enabled state sẽ tự clear nếu browser permission bị revoke
- chat session view giờ có browser notification cho action-needed, reply-ready, terminal-error, va session-finished khi tab không focus
- notification có thể đến từ pending action trong `chat:bootstrap` / `surface:update`, và final reply trong `chat:message` hoặc `chat:update`
- web test suite hiện cover notification hook behavior; server test suite hiện cover malformed websocket frame rejection trước khi command execution chạy

## Mobile Hardening cập nhật 2026-03-24

- các screen chính phía web đã chuyển sang viewport-locked shell, nên header không còn trôi khỏi màn hình khi scroll nội dung dài trên mobile
- chat screen giờ giữ header + composer cố định và chỉ transcript scroll; jump-to-latest không còn dính sát input khi đổi font size lớn
- shared header/action sizing đã được siết lại để icon không collapse trên điện thoại hẹp và long assistant content không còn đẩy bubble tràn khỏi viewport

## Terminal Tab cập nhật 2026-03-24

- session view có lại tab `Terminal` bên cạnh `Chat`, nhưng giữ cách tiếp cận nhẹ: snapshot `<pre>` read-only thay vì xterm/full emulator
- server broadcast frame `terminal:snapshot` trên WebSocket để web sync nội dung tmux pane theo thời gian thực
- web có input bar + virtual keyboard cho `Enter`, `Tab`, `Esc`, arrows, `Ctrl+C`, `Ctrl+D`, `Ctrl+Z`, `Ctrl+L`, backspace, va delete
- khi session bị `terminal-required` nhưng không có action card an toàn, tab `Terminal` hiện badge để kéo user sang luồng direct interaction
- web/server test suite hiện cover terminal snapshot wire flow, key pass-through, hook state, va terminal component behavior

## Ranh giới hiện tại

- host vẫn cần `tmux`
- remote access vẫn cần `cloudflared`
- transcript chat vẫn là best-effort extraction
- `Claude Code` va `OpenAI Codex` không còn visible word-by-word streaming trong chat; đổi sang loading -> final answer để ưu tiên correctness
- terminal tab hiện chỉ là snapshot + input surface nhẹ; chưa có full terminal emulation hay rich TUI rendering
- opaque arrow-key hoặc full-screen TUI vẫn là giới hạn đã biết
