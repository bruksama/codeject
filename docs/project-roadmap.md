# Lộ trình dự án

## Trạng thái tổng thể

Ứng dụng đã sẵn sàng để sử dụng.

Tất cả các phase xây dựng chính đã hoàn thành:

- Phase 1: monorepo va frontend import
- Phase 2: backend core, auth, persistence, WebSocket
- Phase 3: `tmux` terminal bridge
- Phase 4: hybrid chat-terminal experience
- Phase 5: remote tunnel va remote auth flow

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

## Ranh giới hiện tại

- host vẫn cần `tmux`
- remote access vẫn cần `cloudflared`
- transcript chat vẫn là best-effort extraction
- terminal vẫn là fallback path cuối cùng cho approval, menu, và TUI
