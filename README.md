# Codeject

Giao diện web ưu tiên điện thoại để theo dõi và điều khiển các CLI coding assistant (Claude Code, Codex, shell, …) đang chạy trên máy local.

## Codeject giải quyết vấn đề gì

CLI coding assistant rất mạnh nhưng khó theo dõi trên điện thoại và khó quản lý khi có nhiều session dài đang chạy.

Codeject đặt một lớp giao diện web gọn nhẹ lên trên backend local để bạn có thể:

- Xem các session đang chạy từ trình duyệt trên điện thoại hoặc máy tính.
- Gửi prompt nhanh qua chat surface.
- Trả lời approval, lựa chọn, và prompt nhập liệu trực tiếp qua action card trong chat.
- Truy cập từ xa qua Cloudflare Tunnel mà vẫn giữ runtime trên máy của chính bạn.

## Tính năng chính

- Tạo, lưu, khôi phục và xóa nhiều session CLI.
- Chọn chương trình CLI như Claude Code, Codex hoặc generic shell cho từng session.
- Chat-first surface để đọc transcript dễ dàng trên màn hình nhỏ.
- `Settings > Appearance > Font Size` đổi cỡ chữ toàn app ngay lập tức, lưu theo từng trình duyệt, và scale luôn khoảng trống chat/composer để dễ đọc hơn.
- `Settings > Appearance > Accent Color` đổi màu nhấn toàn app, cũng lưu theo từng trình duyệt.
- Settings giờ là một hub gọn hơn, tách `Appearance`, `Remote Access`, và `About` thành các màn hình riêng để dễ scan trên điện thoại.
- Inline action cards cho confirm, select, và free-text input khi CLI chờ phản hồi.
- Prompt dạng `Project name:`, `Paste token:`, `Enter path` cũng được recover thành free-input card trong chat.
- Composer gợi ý lệnh ClaudeKit ổn định ngay khi token đầu tiên bắt đầu bằng `/` cho Claude session hoặc `$` cho Codex session.
- Với `Claude Code` và `OpenAI Codex`, chat giữ loading cho tới khi transcript xác nhận final answer; commentary và tool-progress không render thành bubble assistant.
- Shared mobile guardrails đã bật lại browser zoom, thêm visible focus state, touch target tối thiểu 44x44, và reduced-motion fallback cho toàn app.
- Lưu toàn bộ cấu hình và session dưới `~/.codeject` (hoặc `CODEJECT_HOME`).
- Remote access thông qua Cloudflare Tunnel nếu host có `cloudflared`.
- Hỗ trợ quick tunnel mặc định và named tunnel token-based cho domain riêng.
- Named tunnel có thể bật auto-start khi server khởi động; quick tunnel vẫn giữ manual-only.
- Mỗi thiết bị remote có thể lưu bearer key riêng trong browser để gọi REST/WebSocket sau khi mở public URL hoặc QR.

## Demo nhanh

Ảnh chụp giao diện tạo session trong web app:

![Codeject web app screenshot](./docs/assets/images/readme-landing.png)

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
   - Mở UI tại `http://localhost:4028`
   - REST API và WebSocket server chạy tại `http://localhost:3500`

Để chạy production local:

1. Build toàn bộ workspace:
   - `npm run build`
2. Khởi động server:
   - `npm start`
3. Mở `http://localhost:3500`
4. Server lắng nghe ở `PORT` hoặc `3500`.

Chi tiết hơn xem `docs/getting-started.md`.

## Cách sử dụng cơ bản

1. Mở UI tại `http://localhost:4028` khi đang chạy dev, hoặc `http://localhost:3500` sau khi build + `npm start`.
2. Tạo một session mới:
   - Chọn chương trình CLI phù hợp.
   - Lưu session để có thể khôi phục sau.
3. Gửi prompt qua chat surface và quan sát trả lời.
   - Với session Claude, bắt đầu token đầu bằng `/` để thấy gợi ý ClaudeKit command ổn định.
   - Với session Codex, bắt đầu token đầu bằng `$` để thấy cùng bộ gợi ý đó theo prefix của Codex.
   - Khi chọn gợi ý, composer chỉ thay token đầu và giữ nguyên phần prompt còn lại bạn đã gõ.
4. Khi CLI cần approval, chọn option, hoặc nhập liệu:
   - Trả lời ngay trong action card được render trong chat.
5. Nếu chat hơi chật hoặc quá lớn trên thiết bị hiện tại:
   - Vào `Settings > Appearance > Font Size`.
   - Thay đổi áp dụng ngay cho toàn bộ UI và được nhớ lại trên chính trình duyệt đó.
6. (Tùy chọn) Bật Cloudflare Tunnel để truy cập từ điện thoại khi không ngồi trước máy.
   - Quick tunnel: zero-setup, URL tạm.
   - Named tunnel: URL cố định trên domain Cloudflare của bạn.
   - Named tunnel có thể bật auto-start sau khi đã lưu hostname + token.
   - Trên thiết bị remote, dán bearer key vào `Settings > Remote Access > Device Auth` một lần để browser đó tự gửi cho REST/WebSocket.
   - Nếu bearer key lưu trên thiết bị remote không còn hợp lệ, UI sẽ xóa trạng thái tunnel cũ trên browser đó và yêu cầu dán lại key.
7. Nếu cần đổi các phần ít dùng hơn trong Settings:
   - `Settings` chỉ còn là hub ngắn.
   - Vào từng màn hình `Appearance`, `Remote Access`, hoặc `About` để chỉnh chi tiết.
   - `Reset Local Settings` cũng xóa bearer key đã lưu trên browser hiện tại, nên thiết bị đó sẽ cần lưu lại key sau khi reset.

Một số kịch bản sử dụng cụ thể nằm trong `docs/usage-recipes.md`.

Giới hạn hiện tại:

- Opaque arrow-key hoặc full-screen TUI chưa phải chat card thực sự; hỗ trợ tốt nhất hiện tại là prompt text, approval, và numbered select.
- `Claude Code` va `OpenAI Codex` hiện không stream token-by-token lên chat; phản hồi chỉ hiện khi transcript có final answer an toàn.
- Gợi ý command chỉ áp dụng cho provider đã hỗ trợ (`Claude Code`, `OpenAI Codex`); provider khác giữ hành vi composer cũ.

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
- Ở chế độ dev:
  - Next.js dev server chạy trên `http://localhost:4028`.
  - Express API/WebSocket server chạy trên `http://localhost:3500`.
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
