# Tóm tắt codebase

Tài liệu này gom ngắn các khối chính của Codeject để người sửa code có thể định vị nhanh nơi cần đọc trước khi đi sâu vào implementation.

## Mục tiêu dự án

Codeject là giao diện web mobile-first để theo dõi và điều khiển các CLI coding assistant chạy trên máy local.

Điểm chính:

- runtime thật vẫn nằm trên host của người dùng
- web UI ưu tiên chat/action-card thay vì terminal raw
- có thể truy cập remote qua Cloudflare Tunnel nếu host hỗ trợ
- nhiều preference UI lưu theo từng browser thay vì ghi xuống backend config

## Cấu trúc workspace

```text
packages/
├── web/      # Next.js 16 + React 19 UI
├── server/   # Express 5 + WebSocket + tmux/tunnel orchestration
└── shared/   # Shared TypeScript types + Zod wire schemas
```

Top-level khác:

- `docs/`: tài liệu cho người
- `docs/llm/`: tài liệu rút gọn cho agent/LLM
- `plans/`: kế hoạch triển khai và report theo từng task

## Packages chính

### `packages/web`

Trách nhiệm:

- render session list, new session, chat interface, settings
- giữ local UI state bằng Zustand
- connect WebSocket tới từng session
- map trạng thái chat/action request ra chat-first UX
- phát browser notification nếu user đã opt in

Các điểm cần nhớ:

- `Settings > Appearance` hiện chứa `Font Size`, `Accent Color`, và `Notifications`
- `AppSettings.notifications` chỉ lưu trong browser storage
- một component sync permission được mount global ở app layout để clear stale toggle khi permission bị revoke ngoài app
- chat screen wire notification từ chính session WebSocket stream

### `packages/server`

Trách nhiệm:

- serve frontend static từ `packages/web/out`
- expose REST dưới `/api/*`
- expose WebSocket dưới `/ws/:sessionId`
- auth cho request non-local
- persist config/session dưới `~/.codeject`
- quản lý `tmux` runtime và Cloudflare Tunnel
- đọc transcript Claude/Codex để drive chat UI

Các điểm cần nhớ:

- request local bypass auth
- request non-local cần bearer key
- WebSocket non-local dùng `?token=<key>`
- websocket handler hiện validate incoming client frame bằng Zod trước khi chạy command
- dev mode assert outgoing server frame trước khi gửi

### `packages/shared`

Trách nhiệm:

- share type giữa web và server
- giữ websocket wire contract runtime trong `src/schemas.ts`
- derive wire TypeScript types từ Zod trong `src/types.ts`

Các điểm cần nhớ:

- `zod` đang exact-pinned `3.24.4`
- date-like wire fields được `z.coerce.date()`
- đây là source of truth cho `ClientWebSocketMessage` và `ServerWebSocketMessage`

## Luồng runtime chính

### Chat flow

1. Web mở `/ws/:sessionId`
2. server gắn session vào `tmux`
3. hai phía validate frame bằng shared schema
4. user gửi `chat:prompt`
5. server forward input vào CLI runtime
6. transcript + snapshot được dùng để cập nhật chat state
7. nếu có action request thì UI render inline action card
8. nếu notifications bật và tab không focus, app có thể báo action-needed, reply-ready, error, hoặc idle

### Notification flow

1. user bật `Settings > Appearance > Notifications`
2. browser xin permission theo demand
3. permission thực được resync khi app focus/visible
4. notification chỉ bắn khi:
   - browser support `Notification`
   - permission là `granted`
   - tab không focus
5. click notification sẽ focus tab, set active session, và đưa user về `/chat-interface` nếu cần

### Remote access flow

1. host start `cloudflared`
2. server expose public URL qua quick hoặc named-token mode
3. remote browser mở public URL
4. remote browser lưu bearer key riêng trong local storage nếu user bật `Device Auth`

## Persistence

- config: `~/.codeject/config.json`
- sessions: `~/.codeject/sessions/*.json`
- terminal scrollback: nằm trong `tmux`
- browser-local preference:
  - `fontSize`
  - `accentColor`
  - `notifications`
  - remote device bearer key

## Test và verification

Root workspace:

- `npm run lint`
- `npm run type-check`
- `npm run build`
- `npm run test`

Hiện có coverage đáng chú ý:

- Zustand store persistence
- WebSocket reconnect path
- malformed client WebSocket frame rejection ở server
- notification hook behavior
- action-card submit lifecycle

## File ưu tiên nên đọc khi sửa

Nếu sửa chat/websocket:

- `packages/shared/src/schemas.ts`
- `packages/shared/src/types.ts`
- `packages/server/src/websocket/websocket-handler.ts`
- `packages/web/src/lib/websocket-client.ts`
- `packages/web/src/hooks/use-hybrid-session.ts`

Nếu sửa notification/settings:

- `packages/web/src/components/settings/notification-settings-card.tsx`
- `packages/web/src/components/ui/notification-permission-sync.tsx`
- `packages/web/src/lib/notification-service.ts`
- `packages/web/src/hooks/use-chat-notifications.ts`
- `packages/web/src/stores/useAppStore.ts`

Nếu sửa remote access:

- `packages/server/src/services/tunnel-manager.ts`
- `packages/server/src/services/config-store.ts`
- `packages/web/src/hooks/use-remote-access-settings.ts`

## Giới hạn hiện tại

- opaque arrow-key menu và full-screen TUI chưa map sạch sang chat card
- `Claude Code` và `OpenAI Codex` đang final-only trong chat, không render token-by-token
- notification behavior mới có unit/integration coverage, chưa có browser e2e thật cho mobile/tunnel

## Docs liên quan

- `README.md`
- `docs/getting-started.md`
- `docs/system-architecture.md`
- `docs/project-roadmap.md`
- `docs/deployment-guide.md`
- `docs/usage-recipes.md`
