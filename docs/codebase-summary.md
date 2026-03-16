# Tóm tắt codebase

## Tổng quan

Repository này là một monorepo npm workspace gồm 3 package:

- `packages/web`: frontend Next.js
- `packages/server`: backend Express + WebSocket
- `packages/shared`: shared TypeScript types

Hệ thống hiện tại đã hoàn thiện luồng sử dụng chính: tạo session, gán CLI program, xem chat, mở terminal, lưu trạng thái, và truy cập từ xa qua tunnel.

## `packages/web`

Vai trò:

- hiển thị session list
- khởi tạo session mới
- chat-first session surface
- terminal fallback
- settings va remote access controls

Thành phần quan trọng:

- `src/app/chat-interface/page.tsx`
- `src/app/new-session-setup/page.tsx`
- `src/app/sessions-list/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/chat/*`
- `src/components/terminal/*`
- `src/hooks/use-hybrid-session.ts`
- `src/stores/useAppStore.ts`

Trạng thái hiện tại:

- chat screen đã được thu gọn để hiện nhiều nội dung hơn
- composer mặc định nằm trên một hàng, mở rộng khi focus
- transcript tự động xuống cuối khi mở session dài
- có nút quay về tin nhắn mới nhất khi người dùng cuộn lên
- terminal vẫn có mặt đầy đủ cho input trực tiếp

## `packages/server`

Vai trò:

- phục vụ frontend static
- cung cấp REST API
- quản lý auth và persistence
- quản lý `tmux` runtime cho từng session
- đồng bộ chat và terminal qua WebSocket
- quản lý lifecycle của Cloudflare Tunnel

Thành phần quan trọng:

- `src/index.ts`
- `src/routes/*`
- `src/services/session-store.ts`
- `src/services/config-store.ts`
- `src/services/terminal-session-manager.ts`
- `src/services/tmux-bridge.ts`
- `src/services/session-supervisor.ts`
- `src/services/provider-transcript-reader.ts`
- `src/services/tunnel-manager.ts`
- `src/websocket/websocket-handler.ts`

Trạng thái hiện tại:

- session và config đã lưu xuống đĩa
- transcript reader ưu tiên transcript của Claude/Codex nếu tìm thấy
- session supervisor tạo pending assistant row và tránh stale assistant carry-over
- Codex transcript sync đã được làm mới an toàn hơn khi rollout file thay đổi
- stale pane và reconnect không còn dễ làm sập server

## `packages/shared`

Vai trò:

- chia sẻ các type như `Session`, `Message`, `ChatState`, `CliProgram`, `AppSettings`, `TerminalRuntime`, `TerminalSnapshot`

## Điểm cần để ý khi sửa tiếp

- `packages/web/src/app/settings/page.tsx` còn khá lớn
- `packages/web/src/app/cli-program-editor/page.tsx` còn khá lớn
- transcript chat vẫn là lớp UX suy ra, không phải runtime source of truth
- terminal snapshot hiện vẫn refresh theo toàn bộ content, chưa diff stream
