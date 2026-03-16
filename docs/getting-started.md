# Bắt đầu với Codeject

## Tài liệu này dành cho ai

- **Lập trình viên** đang dùng các CLI coding assistant (Claude Code, Codex, shell, …).
- Muốn **xem và điều khiển** các session đó từ trình duyệt, ưu tiên trên **điện thoại**.

Nếu bạn mới clone repository và muốn chạy Codeject lần đầu, hãy đọc từ đầu đến cuối tài liệu này.

## Yêu cầu hệ thống

- **Node.js + npm** tương thích với `packageManager` trong `package.json`.
- **tmux** đã cài trên máy host (bắt buộc để chạy terminal runtime).
- **cloudflared** (tùy chọn) nếu bạn muốn bật remote access qua Cloudflare Tunnel.

## Cài đặt

1. Clone repository:
   - `git clone <repo-url>`
   - `cd codeject`
2. Cài đặt dependencies:
   - `npm install`

## Chạy Codeject lần đầu

### Chạy ở chế độ phát triển

1. Chạy lệnh:
   - `npm run dev`
2. Mở trình duyệt tại:
   - `http://localhost:3500`

Trong chế độ này, frontend và backend chạy song song, hot reload cho việc phát triển.

### Chạy ở chế độ production local

1. Build toàn bộ workspace:
   - `npm run build`
2. Khởi động server:
   - `npm start`
3. Mặc định server lắng nghe ở:
   - `PORT` (nếu đặt) hoặc `3500`

## Tạo và dùng session đầu tiên

1. Mở UI tại `http://localhost:3500` trên máy tính.
2. Tạo một **session mới**:
   - Chọn chương trình CLI (Claude Code, Codex, hoặc shell).
   - Lưu session để có thể khôi phục sau này.
3. Mở session vừa tạo:
   - Gửi prompt qua **chat surface**.
   - Khi cần thao tác sâu hơn, chuyển sang **terminal surface** và chạy lệnh trực tiếp.

## Remote access (tùy chọn)

Nếu host đã cài `cloudflared`, bạn có thể bật remote access để truy cập Codeject từ điện thoại:

- UI cung cấp điều khiển để:
  - Bật / tắt / restart Cloudflare Tunnel.
  - Xem public URL và QR code.
- Lưu ý:
  - Request **không local** bắt buộc phải gửi `Authorization: Bearer <key>`.
  - QR chỉ chứa public URL, **không chứa secret**.

Chi tiết thêm xem trong `docs/deployment-guide.md` và `docs/usage-recipes.md`.

## Lỗi thường gặp

- **Không có `tmux`**:
  - Triệu chứng: server log báo lỗi liên quan tới `tmux`, session không tạo được.
  - Cách xử lý: cài `tmux` trên host rồi chạy lại.
- **Port 3500 đã dùng**:
  - Triệu chứng: không khởi động được server, báo lỗi port in use.
  - Cách xử lý: đặt biến môi trường `PORT` sang giá trị khác trước khi chạy.
- **Cloudflared chưa cài**:
  - Triệu chứng: chức năng tunnel báo lỗi khi start.
  - Cách xử lý: cài `cloudflared` hoặc tắt remote access.

