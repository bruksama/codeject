# Codeject

Giao diện web ưu tiên điện thoại để theo dõi và điều khiển các CLI coding assistant đang chạy trên máy local.

## Trạng thái hiện tại

Ứng dụng đã sẵn sàng để sử dụng.

- Đã hoàn thành monorepo, frontend, backend, persistence, WebSocket, `tmux` runtime và remote tunnel
- Chat là lớp UX thân thiện; terminal vẫn là đường lui và nguồn trạng thái thực tế
- Giai đoạn hiện tại: dọn dẹp, ổn định hóa, cập nhật tài liệu

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4, Zustand
- Backend: Express 5, `ws`, `tmux`, `cloudflared`
- Shared: TypeScript workspace package
- Monorepo: npm workspaces + Turbo

## Cấu trúc thư mục

```text
codeject/
├── packages/
│   ├── web/       # UI mobile-first
│   ├── server/    # Express + REST + WebSocket
│   └── shared/    # Shared TypeScript types
├── docs/          # Tài liệu chính thức
├── package.json
└── turbo.json
```

## Chức năng chính

- Tạo và quản lý nhiều session CLI
- Chọn chương trình CLI như Claude Code, Codex hoặc generic shell
- Xem chat-first surface và chuyển sang terminal khi cần
- Lưu session và cấu hình dưới `~/.codeject`
- Truy cập từ xa qua Cloudflare Tunnel

## Lệnh phát triển

- `npm run dev`: chạy web và server song song
- `npm run lint`: lint toàn bộ workspace
- `npm run type-check`: kiểm tra TypeScript
- `npm run build`: build toàn bộ workspace
- `npm start`: chạy production server mặc định ở `:3500`

## Yêu cầu môi trường

- Node.js và npm tương thích với `packageManager`
- `tmux` phải được cài trên máy host
- `cloudflared` cần có sẵn nếu muốn bật remote tunnel

## Runtime

- Production dùng một process Node.js cho Express và WebSocket
- Frontend static được phục vụ từ `packages/web/out`
- API nằm dưới `/api/*`
- WebSocket nằm dưới `/ws/:sessionId`
- Session được lưu trong `~/.codeject/sessions/`
- Cấu hình được lưu trong `~/.codeject/config.json`

## API hiện có

- `GET /api/health`
- `GET /api/auth`
- `POST /api/auth/rotate`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/:sessionId`
- `PATCH /api/sessions/:sessionId`
- `DELETE /api/sessions/:sessionId`
- `GET /api/config/programs`
- `POST /api/config/programs`
- `PUT /api/config/programs/:programId`
- `DELETE /api/config/programs/:programId`
- `GET /api/tunnel`
- `POST /api/tunnel/start`
- `POST /api/tunnel/stop`
- `POST /api/tunnel/restart`

## WebSocket protocol

Client -> server:

- `chat:prompt`
- `surface:set-mode`
- `terminal:init`
- `terminal:input`
- `terminal:key`
- `terminal:resize`
- `terminal:ping`

Server -> client:

- `chat:bootstrap`
- `chat:message`
- `chat:update`
- `surface:update`
- `terminal:ready`
- `terminal:snapshot`
- `terminal:update`
- `terminal:status`
- `terminal:error`
- `terminal:pong`

## Ghi chú vận hành

- Request local được bỏ qua bearer auth; request không local bắt buộc xác thực
- Mỗi app session sở hữu một `tmux` runtime riêng
- Terminal scrollback nằm trong history của `tmux`, không lưu JSON riêng
- Transcript chat được suy ra từ provider transcript hoặc terminal output, không phải runtime source of truth
- QR remote chỉ chia sẻ public URL; bearer key được lưu riêng trên từng thiết bị

## Tài liệu

Thư mục `docs/` là nguồn tài liệu chính thức:

- `docs/project-overview-pdr.md`
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/design-guidelines.md`
- `docs/deployment-guide.md`
- `docs/system-architecture.md`
- `docs/project-roadmap.md`
