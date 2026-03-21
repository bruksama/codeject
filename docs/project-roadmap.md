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
- root scripts cho `dev`, `build`, `lint`, `type-check`, `start`

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

## Ranh giới hiện tại

- host vẫn cần `tmux`
- remote access vẫn cần `cloudflared`
- transcript chat vẫn là best-effort extraction
- `Claude Code` va `OpenAI Codex` không còn visible word-by-word streaming trong chat; đổi sang loading -> final answer để ưu tiên correctness
- web UI không còn terminal viewport; approval, menu, va input lạ đi qua action card va free-input fallback
- opaque arrow-key hoặc full-screen TUI vẫn là giới hạn đã biết
