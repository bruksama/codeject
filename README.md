# Codeject

Giao diện web ưu tiên điện thoại để theo dõi và điều khiển các CLI coding assistant (Claude Code, Codex, shell, …) đang chạy trên máy local.

## Codeject giải quyết vấn đề gì

CLI coding assistant rất mạnh nhưng khó theo dõi trên điện thoại và khó quản lý khi có nhiều session dài đang chạy.

Codeject đặt một lớp giao diện web gọn nhẹ lên trên backend local để bạn có thể:

- Xem các session đang chạy từ trình duyệt trên điện thoại hoặc máy tính.
- Gửi prompt nhanh qua chat surface.
- Quay lại terminal khi cần thao tác trực tiếp, approval, hoặc TUI phức tạp.
- Truy cập từ xa qua Cloudflare Tunnel mà vẫn giữ runtime trên máy của chính bạn.

## Tính năng chính

- Tạo, lưu, khôi phục và xóa nhiều session CLI.
- Chọn chương trình CLI như Claude Code, Codex hoặc generic shell cho từng session.
- Chat-first surface để đọc transcript dễ dàng trên màn hình nhỏ.
- Terminal surface làm đường lui chính xác khi cần thao tác sâu.
- Lưu toàn bộ cấu hình và session dưới `~/.codeject` (hoặc `CODEJECT_HOME`).
- Remote access thông qua Cloudflare Tunnel nếu host có `cloudflared`.

## Demo nhanh

_Gợi ý_: thêm 1–2 screenshot hoặc GIF minh họa UI trên điện thoại và desktop.

## Cài đặt và chạy nhanh

Yêu cầu:

- Node.js và npm tương thích với `packageManager`.
- `tmux` đã được cài trên máy host.
- `cloudflared` (tùy chọn) nếu muốn bật remote access.

Các bước:

1. Clone repository:
   - `git clone <repo-url>`
   - `cd codeject`
2. Cài đặt dependencies:
   - `npm install`
3. Chạy ở chế độ phát triển:
   - `npm run dev`
   - Mở `http://localhost:3500`

Để chạy production local:

1. Build toàn bộ workspace:
   - `npm run build`
2. Khởi động server:
   - `npm start`
3. Server lắng nghe ở `PORT` hoặc `3500`.

Chi tiết hơn xem `docs/getting-started.md`.

## Cách sử dụng cơ bản

1. Mở UI tại `http://localhost:3500`.
2. Tạo một session mới:
   - Chọn chương trình CLI phù hợp.
   - Lưu session để có thể khôi phục sau.
3. Gửi prompt qua chat surface và quan sát trả lời.
4. Khi cần thao tác chi tiết:
   - Chuyển sang terminal surface để gửi lệnh trực tiếp.
5. (Tùy chọn) Bật Cloudflare Tunnel để truy cập từ điện thoại khi không ngồi trước máy.

Một số kịch bản sử dụng cụ thể nằm trong `docs/usage-recipes.md`.

## Kiến trúc và công nghệ

- Frontend: Next.js 16, React 19, Tailwind CSS 4, Zustand.
- Backend: Express 5, WebSocket, `tmux`, `cloudflared`.
- Shared: TypeScript workspace package.
- Monorepo: npm workspaces + Turbo.

Tổng quan kiến trúc:

- Một process Node.js production:
  - Phục vụ frontend static từ `packages/web/out`.
  - Cung cấp REST API dưới `/api/*`.
  - Cung cấp WebSocket dưới `/ws/:sessionId`.
- Runtime terminal và session CLI được quản lý bằng `tmux`.
- Dữ liệu cấu hình và session được lưu dưới `~/.codeject`.

Chi tiết kiến trúc xem `docs/system-architecture.md` (VN) hoặc `docs/llm/architecture.md` (EN, rút gọn).

## Cấu trúc thư mục

```text
codeject/
├── packages/
│   ├── web/       # UI mobile-first
│   ├── server/    # Express + REST + WebSocket
│   └── shared/    # Shared TypeScript types
├── docs/          # Tài liệu cho con người đọc
│   └── llm/       # Tài liệu rút gọn cho LLM
├── package.json
└── turbo.json
```

## Trạng thái dự án

- Ứng dụng đã sẵn sàng để sử dụng.
- Đã hoàn thành: monorepo, frontend, backend, persistence, WebSocket, `tmux` runtime, remote tunnel.
- Giai đoạn hiện tại: dọn dẹp code, ổn định hóa, đơn giản hóa và cập nhật tài liệu.

Chi tiết roadmap xem `docs/project-roadmap.md`.

## Tài liệu

- Bắt đầu nhanh: `docs/getting-started.md`
- Kiến trúc hệ thống: `docs/system-architecture.md`
- Các kịch bản sử dụng: `docs/usage-recipes.md`
- Hướng dẫn chạy và triển khai: `docs/deployment-guide.md`
- Lộ trình dự án: `docs/project-roadmap.md`
- Tiêu chuẩn code: `docs/code-standards.md`
- Hướng dẫn thiết kế UI: `docs/design-guidelines.md`

Tài liệu tối ưu cho LLM:

- Tổng quan: `docs/llm/project-summary.md`
- Kiến trúc: `docs/llm/architecture.md`
- HTTP API: `docs/llm/api-reference.md`
- WebSocket protocol: `docs/llm/websocket-spec.md`
- Coding standards cho agent: `docs/llm/coding-standards.md`

