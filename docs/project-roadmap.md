# Lộ trình dự án

Tài liệu này tóm tắt các phase phát triển chính của Codeject và những việc còn lại. Dùng để nắm nhanh bối cảnh dự án, không phải kế hoạch chi tiết.

## Trạng thái tổng thể

Ứng dụng đã sẵn sàng để sử dụng.

Tất cả các phase xây dựng chính đã hoàn thành:

- Phase 1: monorepo và frontend import
- Phase 2: backend core, auth, persistence, WebSocket
- Phase 3: `tmux` terminal bridge
- Phase 4: hybrid chat-terminal experience
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
- hybrid chat surface va terminal fallback
- mobile terminal controls
- compact chat composer và transcript scroll behavior tốt hơn

### Transcript và supervisor

- ưu tiên transcript của Claude/Codex nếu có
- fallback về terminal snapshot khi cần
- pending assistant indicator inline
- simple confirm va numbered single-select action cards
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

## Ranh giới hiện tại

- host vẫn cần `tmux`
- remote access vẫn cần `cloudflared`
- transcript chat vẫn là best-effort extraction
- terminal vẫn là fallback path cuối cùng cho approval, menu, và TUI
